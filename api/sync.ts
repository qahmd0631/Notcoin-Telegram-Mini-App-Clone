import type { VercelRequest, VercelResponse } from './types';
import { applyCors } from './lib/cors';
import { resolveVercelUserContext } from './lib/auth';
import { query } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  try {
    const userCtx = resolveVercelUserContext(req);
    const telegramId = userCtx.telegram_id;

    if (!telegramId) {
      return res.status(400).json({ error: 'telegram_id could not be resolved' });
    }

    const userRes = await query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User record not found' });
    }

    const user = userRes.rows[0];
    const now = new Date();
    const lastClaim = new Date(user.last_claim_at || user.mining_started_at || now);
    const elapsedSeconds = Math.max(0, (now.getTime() - lastClaim.getTime()) / 1000);
    const hourlyRate = Number(user.mining_rate) || 0.45;
    const claimable = Number(((elapsedSeconds / 3600) * hourlyRate).toFixed(4));

    return res.status(200).json({
      success: true,
      server_time: now.toISOString(),
      user: {
        id: user.id,
        telegram_id: user.telegram_id,
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        wallet_address: user.wallet_address,
        balance_agen: Number(user.balance_agen),
        claimable_agen: claimable,
        level: user.level,
        mining_rate: hourlyRate,
        mining_started_at: user.mining_started_at,
        last_claim_at: user.last_claim_at,
        referred_by: user.referred_by,
        referral_code: user.referral_code,
        elapsed_seconds: Math.floor(elapsedSeconds),
      },
    });
  } catch (error: any) {
    console.error('API /api/sync error:', error);
    return res.status(500).json({ error: error.message || 'Sync failed' });
  }
}
