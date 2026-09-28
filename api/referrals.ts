import type { VercelRequest, VercelResponse } from './types';
import { applyCors } from './lib/cors';
import { resolveVercelUserContext } from './lib/auth';
import { query } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userCtx = resolveVercelUserContext(req);
    const telegramId = String(req.query.telegram_id || userCtx.telegram_id || '');
    if (!telegramId) {
      return res.status(400).json({ error: 'telegram_id is required' });
    }

    const { rows } = await query(
      `SELECT telegram_id, username, first_name, level, created_at
       FROM users 
       WHERE referred_by = $1
       ORDER BY created_at DESC`,
      [telegramId]
    );

    return res.status(200).json(rows);
  } catch (error: any) {
    console.error('API /api/referrals error:', error);
    return res.status(500).json({ error: error.message || 'Failed to fetch referrals' });
  }
}
