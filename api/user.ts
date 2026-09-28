import type { VercelRequest, VercelResponse } from './types';
import { applyCors } from './lib/cors';
import { resolveVercelUserContext, issueJwtToken } from './lib/auth';
import { query, withTransaction } from './lib/db';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  try {
    const userCtx = resolveVercelUserContext(req);
    const telegramId = userCtx.telegram_id;

    if (!telegramId) {
      return res.status(400).json({ error: 'telegram_id could not be resolved' });
    }

    if (req.method === 'GET') {
      const existingRes = await query('SELECT * FROM users WHERE telegram_id = $1', [telegramId]);
      if (existingRes.rows.length === 0) {
        return res.status(404).json({ error: 'User not found' });
      }

      const user = existingRes.rows[0];
      return res.status(200).json({
        user: {
          id: user.id,
          telegram_id: user.telegram_id,
          username: user.username,
          first_name: user.first_name,
          last_name: user.last_name,
          wallet_address: user.wallet_address,
          balance_agen: Number(user.balance_agen),
          claimable_agen: Number(user.claimable_agen),
          level: user.level,
          mining_rate: Number(user.mining_rate),
          mining_started_at: user.mining_started_at,
          last_claim_at: user.last_claim_at,
          referred_by: user.referred_by,
          referral_code: user.referral_code,
        },
      });
    }

    if (req.method === 'POST') {
      const userResult = await withTransaction(async (client) => {
        // Check if user already exists
        const checkRes = await client.query('SELECT * FROM users WHERE telegram_id = $1', [
          telegramId,
        ]);

        if (checkRes.rows.length > 0) {
          const user = checkRes.rows[0];
          // Update username/names if provided
          if (userCtx.username || userCtx.first_name) {
            await client.query(
              `UPDATE users 
               SET username = COALESCE($1, username),
                   first_name = COALESCE($2, first_name),
                   last_name = COALESCE($3, last_name),
                   updated_at = NOW()
               WHERE telegram_id = $4`,
              [userCtx.username, userCtx.first_name, userCtx.last_name, telegramId]
            );
          }
          return user;
        }

        // New User Registration
        const generatedRefCode = `REF_${telegramId}`;
        const defaultRate = 0.45;
        let referrerId: string | null = null;

        // Process referral code
        let rawRef = userCtx.start_param || req.body?.referral_code;
        if (rawRef && typeof rawRef === 'string') {
          rawRef = rawRef.trim();
          if (rawRef.startsWith('ref_') || rawRef.startsWith('REF_')) {
            const refLookup = await client.query(
              'SELECT telegram_id, balance_agen FROM users WHERE referral_code = $1 OR telegram_id::text = $2',
              [rawRef, rawRef.replace(/^ref_/i, '')]
            );

            if (refLookup.rows.length > 0 && String(refLookup.rows[0].telegram_id) !== String(telegramId)) {
              referrerId = String(refLookup.rows[0].telegram_id);
              const referrerOldBal = Number(refLookup.rows[0].balance_agen);
              const referrerNewBal = Number((referrerOldBal + 50.0).toFixed(4));

              // Increment referrer balance by 50.00 AGEN atomically
              await client.query(
                `UPDATE users 
                 SET balance_agen = $1, updated_at = NOW() 
                 WHERE telegram_id = $2`,
                [referrerNewBal, referrerId]
              );

              // Record in transactions ledger
              await client.query(
                `INSERT INTO transactions (
                   telegram_id, type, amount, balance_before, balance_after, description, reference_id
                 ) VALUES (
                   $1, 'REFERRAL_BOUNTY', 50.00, $2, $3, $4, $5
                 )`,
                [
                  referrerId,
                  referrerOldBal,
                  referrerNewBal,
                  `Referral bonus for recruiting user ${telegramId}`,
                  String(telegramId),
                ]
              );
            }
          }
        }

        // Insert new user
        const insertRes = await client.query(
          `INSERT INTO users (
             telegram_id, username, first_name, last_name,
             balance_agen, claimable_agen, level, mining_rate,
             mining_started_at, last_claim_at, referred_by, referral_code
           ) VALUES (
             $1, $2, $3, $4,
             0.0000, 0.0000, 1, $5,
             NOW(), NOW(), $6, $7
           )
           RETURNING *`,
          [
            telegramId,
            userCtx.username || `miner_${telegramId}`,
            userCtx.first_name || 'Explorer',
            userCtx.last_name || null,
            defaultRate,
            referrerId,
            generatedRefCode,
          ]
        );

        return insertRes.rows[0];
      });

      const jwtToken = issueJwtToken({
        telegram_id: Number(userResult.telegram_id),
        username: userResult.username,
        first_name: userResult.first_name,
      });

      return res.status(200).json({
        success: true,
        token: jwtToken,
        user: {
          id: userResult.id,
          telegram_id: userResult.telegram_id,
          username: userResult.username,
          first_name: userResult.first_name,
          last_name: userResult.last_name,
          wallet_address: userResult.wallet_address,
          balance_agen: Number(userResult.balance_agen),
          claimable_agen: Number(userResult.claimable_agen),
          level: userResult.level,
          mining_rate: Number(userResult.mining_rate),
          mining_started_at: userResult.mining_started_at,
          last_claim_at: userResult.last_claim_at,
          referred_by: userResult.referred_by,
          referral_code: userResult.referral_code,
        },
      });
    }

    return res.status(405).json({ error: 'Method not allowed' });
  } catch (error: any) {
    console.error('API /api/user error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  }
}
