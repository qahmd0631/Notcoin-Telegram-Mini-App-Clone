import type { VercelRequest, VercelResponse } from './types';
import { applyCors } from './lib/cors';
import { resolveVercelUserContext } from './lib/auth';
import { withTransaction } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const userCtx = resolveVercelUserContext(req);
    const telegramId = userCtx.telegram_id;

    if (!telegramId) {
      return res.status(400).json({ error: 'telegram_id could not be resolved' });
    }

    const claimResult = await withTransaction(async (client) => {
      // 1. Lock user row atomically
      const userRes = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE',
        [telegramId]
      );

      if (userRes.rows.length === 0) {
        throw new Error('User record not found');
      }

      const user = userRes.rows[0];
      const now = new Date();
      const lastClaim = new Date(user.last_claim_at || user.mining_started_at || now);
      const elapsedSeconds = Math.max(0, (now.getTime() - lastClaim.getTime()) / 1000);

      // Concurrency guard: minimum 1 second elapsed
      if (elapsedSeconds < 1) {
        throw new Error('No pending mining reward available yet.');
      }

      // Formula: Earned AGEN = Delta_t * (mining_rate / 3600)
      const hourlyRate = Number(user.mining_rate) || 0.45;
      const earned = Number(((elapsedSeconds / 3600) * hourlyRate).toFixed(4));

      if (earned <= 0) {
        throw new Error('Claim amount must be greater than zero');
      }

      const oldBalance = Number(user.balance_agen);
      const newBalance = Number((oldBalance + earned).toFixed(4));

      // 2. Perform atomic SQL update
      await client.query(
        `UPDATE users 
         SET balance_agen = $1,
             claimable_agen = 0.0000,
             last_claim_at = NOW(),
             updated_at = NOW()
         WHERE telegram_id = $2`,
        [newBalance, telegramId]
      );

      // 3. Insert record into transactions table
      await client.query(
        `INSERT INTO transactions (
           telegram_id, type, amount, balance_before, balance_after, description, metadata
         ) VALUES (
           $1, 'MINING_CLAIM', $2, $3, $4, $5, $6
         )`,
        [
          telegramId,
          earned,
          oldBalance,
          newBalance,
          `Claimed ${earned} AGEN for ${Math.floor(elapsedSeconds)}s mining`,
          JSON.stringify({ elapsed_seconds: Math.floor(elapsedSeconds), rate: hourlyRate }),
        ]
      );

      return {
        claimed_amount: earned,
        new_balance: newBalance,
        last_claim_at: now.toISOString(),
      };
    });

    return res.status(200).json({
      success: true,
      ...claimResult,
    });
  } catch (error: any) {
    console.error('API /api/claim error:', error);
    return res.status(400).json({ error: error.message || 'Claim failed' });
  }
}
