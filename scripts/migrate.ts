import pg from 'pg';

const connectionString = process.env.DATABASE_URL || 'postgresql://postgres:Asdfghjkl123%40%23%24_%26-%2B%28%29%2F@db.palyfdjouvjqoibqkyju.supabase.co:5432/postgres';

const client = new pg.Client({
  connectionString,
  ssl: { rejectUnauthorized: false },
});

async function migrate() {
  try {
    await client.connect();
    console.log('Connected to PostgreSQL database for migration...');

    // Drop previous incompatible empty tables if needed
    console.log('Resetting/aligning tables with exact schema specification...');
    await client.query(`
      DROP TABLE IF EXISTS ton_transaction_checks CASCADE;
      DROP TABLE IF EXISTS ad_sessions CASCADE;
      DROP TABLE IF EXISTS ad_views CASCADE;
      DROP TABLE IF EXISTS task_completions CASCADE;
      DROP TABLE IF EXISTS user_tasks CASCADE;
      DROP TABLE IF EXISTS withdrawals CASCADE;
      DROP TABLE IF EXISTS claims CASCADE;
      DROP TABLE IF EXISTS level_upgrades CASCADE;
      DROP TABLE IF EXISTS referrals CASCADE;
      DROP TABLE IF EXISTS transactions CASCADE;
      DROP TABLE IF EXISTS tasks CASCADE;
      DROP TABLE IF EXISTS levels CASCADE;
      DROP TABLE IF EXISTS users CASCADE;
      DROP TABLE IF EXISTS settings CASCADE;
      DROP TABLE IF EXISTS app_settings CASCADE;
    `);

    const schemaSql = `
    -- 1. USERS TABLE
    CREATE TABLE IF NOT EXISTS users (
        id BIGSERIAL PRIMARY KEY,
        telegram_id BIGINT UNIQUE NOT NULL,
        username VARCHAR(255),
        first_name VARCHAR(255),
        last_name VARCHAR(255),
        wallet_address VARCHAR(255),
        balance_agen NUMERIC(20, 4) DEFAULT 0.0000 CHECK (balance_agen >= 0),
        claimable_agen NUMERIC(20, 4) DEFAULT 0.0000 CHECK (claimable_agen >= 0),
        level INT DEFAULT 1,
        mining_rate NUMERIC(10, 2) DEFAULT 0.45,
        mining_started_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        last_claim_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        referred_by BIGINT REFERENCES users(telegram_id),
        referral_code VARCHAR(64) UNIQUE NOT NULL,
        is_banned BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 2. LEVELS TABLE
    CREATE TABLE IF NOT EXISTS levels (
        level_number INT PRIMARY KEY,
        required_agen NUMERIC(20, 4) NOT NULL,
        ton_deposit NUMERIC(10, 4) NOT NULL,
        mining_rate NUMERIC(10, 2) NOT NULL
    );

    -- SEED LEVELS
    INSERT INTO levels (level_number, required_agen, ton_deposit, mining_rate) VALUES
    (1, 100, 0.1, 0.45),
    (2, 200, 0.2, 0.90),
    (3, 400, 0.4, 1.80),
    (4, 800, 0.8, 3.60),
    (5, 1600, 1.6, 7.20),
    (6, 3200, 3.2, 14.40),
    (7, 6400, 6.4, 28.80),
    (8, 12800, 12.8, 57.60),
    (9, 25600, 25.6, 115.20),
    (10, 51200, 51.2, 230.40),
    (11, 102400, 102.4, 460.80),
    (12, 204800, 204.8, 921.60)
    ON CONFLICT (level_number) DO NOTHING;

    -- 3. TRANSACTIONS LEDGER TABLE
    CREATE TABLE IF NOT EXISTS transactions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        type VARCHAR(64) NOT NULL,
        amount NUMERIC(20, 4) NOT NULL,
        balance_before NUMERIC(20, 4) NOT NULL,
        balance_after NUMERIC(20, 4) NOT NULL,
        reference_id VARCHAR(255),
        description TEXT,
        metadata JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 4. AD SESSIONS TABLE
    CREATE TABLE IF NOT EXISTS ad_sessions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        nonce VARCHAR(128) UNIQUE NOT NULL,
        reward_amount NUMERIC(10, 2) DEFAULT 1.00,
        is_used BOOLEAN DEFAULT FALSE,
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 5. TON TRANSACTIONS TABLE
    CREATE TABLE IF NOT EXISTS ton_transaction_checks (
        tx_hash VARCHAR(255) PRIMARY KEY,
        telegram_id BIGINT REFERENCES users(telegram_id),
        target_level INT NOT NULL,
        amount_ton NUMERIC(10, 4) NOT NULL,
        status VARCHAR(32) DEFAULT 'VERIFIED',
        verified_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 6. WITHDRAWALS TABLE
    CREATE TABLE IF NOT EXISTS withdrawals (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id BIGINT REFERENCES users(telegram_id),
        amount NUMERIC(20, 4) NOT NULL,
        wallet_address VARCHAR(255) NOT NULL,
        status VARCHAR(32) DEFAULT 'pending',
        tx_hash VARCHAR(255),
        admin_note TEXT,
        created_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP
    );

    -- 7. SYSTEM SETTINGS TABLE
    CREATE TABLE IF NOT EXISTS settings (
        key VARCHAR(64) PRIMARY KEY,
        value JSONB NOT NULL
    );

    -- SEED SYSTEM SETTINGS
    INSERT INTO settings (key, value) VALUES
    ('project_name', '"AURA_AGEN"'),
    ('token_symbol', '"AGEN"'),
    ('referral_reward', '50'),
    ('task_reward', '2'),
    ('ad_reward', '1'),
    ('daily_ad_limit', '10'),
    ('withdrawal_minimum', '1000'),
    ('withdrawals_enabled', 'false'),
    ('ton_network', '"mainnet"'),
    ('ton_receiver_wallet', '"UQA0N60XaN9c1l5DvOoQcnXWEX7YEFvNaETOnenlk3iSCPX5"'),
    ('telegram_channel', '"https://t.me/NEW_AURA_GEN"'),
    ('monetag_zone_id', '"11862041"')
    ON CONFLICT (key) DO NOTHING;

    -- Supporting task tracking table
    CREATE TABLE IF NOT EXISTS task_completions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        telegram_id BIGINT REFERENCES users(telegram_id) ON DELETE CASCADE,
        task_id VARCHAR(64) NOT NULL,
        reward_agen NUMERIC(10, 2) NOT NULL,
        completed_at TIMESTAMPTZ DEFAULT CURRENT_TIMESTAMP,
        UNIQUE(telegram_id, task_id)
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);
    CREATE INDEX IF NOT EXISTS idx_users_referral_code ON users (referral_code);
    CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users (referred_by);
    CREATE INDEX IF NOT EXISTS idx_transactions_telegram_id ON transactions (telegram_id);
    CREATE INDEX IF NOT EXISTS idx_transactions_created_at ON transactions (created_at DESC);
    CREATE INDEX IF NOT EXISTS idx_ad_sessions_nonce ON ad_sessions (nonce);
    CREATE INDEX IF NOT EXISTS idx_ad_sessions_user ON ad_sessions (telegram_id, created_at);
    CREATE INDEX IF NOT EXISTS idx_withdrawals_telegram_id ON withdrawals (telegram_id);
    `;

    await client.query(schemaSql);
    console.log('✅ Production schema applied successfully!');

    // Verify seed data
    const levelCount = await client.query('SELECT count(*) FROM levels');
    const settingsRows = await client.query('SELECT key, value FROM settings');
    console.log('Levels seeded count:', levelCount.rows[0].count);
    console.log('Settings seeded:', settingsRows.rows.map(r => `${r.key}: ${JSON.stringify(r.value)}`));

  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  } finally {
    await client.end();
  }
}

migrate();
