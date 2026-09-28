import pg from 'pg';
import dotenv from 'dotenv';

dotenv.config();

function createDatabasePool(): pg.Pool {
  const rawUrl =
    process.env.DATABASE_URL ||
    'postgresql://postgres:Asdfghjkl123%40%23%24_%26-%2B%28%29%2F@db.palyfdjouvjqoibqkyju.supabase.co:5432/postgres';

  let user = 'postgres';
  let password = 'Asdfghjkl123@#$_&-+()/';
  let host = 'db.palyfdjouvjqoibqkyju.supabase.co';
  let port = 5432;
  let database = 'postgres';

  try {
    const lastAt = rawUrl.lastIndexOf('@');
    const schemeIdx = rawUrl.indexOf('://');
    if (lastAt !== -1 && schemeIdx !== -1) {
      const userInfo = rawUrl.slice(schemeIdx + 3, lastAt);
      const colonIdx = userInfo.indexOf(':');
      if (colonIdx !== -1) {
        user = userInfo.slice(0, colonIdx);
        let rawPass = userInfo.slice(colonIdx + 1);
        if (rawPass.startsWith('[') && rawPass.endsWith(']')) {
          rawPass = rawPass.slice(1, -1);
        }
        if (rawPass.includes('%')) {
          try {
            rawPass = decodeURIComponent(rawPass);
          } catch {
            // Keep raw if decode fails
          }
        }
        password = rawPass;
      }

      const hostRest = rawUrl.slice(lastAt + 1);
      const slashIdx = hostRest.indexOf('/');
      if (slashIdx !== -1) {
        const hostPort = hostRest.slice(0, slashIdx);
        const [h, p] = hostPort.split(':');
        if (h) host = h;
        if (p) port = parseInt(p, 10);
        const dbName = hostRest.slice(slashIdx + 1).split('?')[0];
        if (dbName) database = dbName;
      }
    }
  } catch (err) {
    console.warn('Fallback to standard Supabase parameters due to parsing note:', err);
  }

  // Prevent pg internal connection parameters from re-parsing rawUrl with invalid URL characters
  delete process.env.DATABASE_URL;

  return new pg.Pool({
    user,
    password,
    host,
    port,
    database,
    ssl: { rejectUnauthorized: false },
    max: 20,
    idleTimeoutMillis: 30000,
    connectionTimeoutMillis: 10000,
  });
}

export const pool = createDatabasePool();

pool.on('error', (err) => {
  console.error('Unexpected database client error on idle pool client:', err);
});

export async function query<T = any>(text: string, params?: any[]): Promise<pg.QueryResult<T>> {
  return pool.query<T>(text, params);
}

export async function withTransaction<T>(
  callback: (client: pg.PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
