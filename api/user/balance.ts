import type { VercelRequest, VercelResponse } from '../types';
import { applyCors } from '../lib/cors';
import { resolveVercelUserContext } from '../lib/auth';
import { query } from '../lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userCtx = resolveVercelUserContext(req);
    const telegramId = req.body?.telegram_id || userCtx.telegram_id;
    const points = req.body?.points ?? req.body?.balance_agen;

    if (!telegramId || points === undefined) {
      return res.status(400).json({ error: 'telegram_id and balance/points are required' });
    }

    const { rows } = await query(
      `UPDATE users 
       SET balance_agen = $1, updated_at = NOW() 
       WHERE telegram_id = $2 
       RETURNING *`,
      [Number(points), telegramId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    return res.status(200).json({ user: rows[0] });
  } catch (error: any) {
    console.error('API /api/user/balance error:', error);
    return res.status(500).json({ error: error.message || 'Database error' });
  }
}
