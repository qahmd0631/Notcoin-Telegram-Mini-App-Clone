import { Router, Request, Response } from 'express';
import crypto from 'crypto';
import { query, withTransaction } from './db.js';
import { resolveUserContext, issueJwtToken, getBotToken } from './auth.js';
import {
  AURA_AGEN_SETTINGS,
  LEVELS,
  getLevelDefinition,
  getMiningRateForLevel,
} from '../src/lib/auragen.js';

export const apiRouter = Router();

const BOT_TOKEN = getBotToken();

// 1. Telegram Auth & User Session
const handleAuthUser = async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const referralCodeParam = req.body?.referral_code || userCtx.start_param;

    const userResult = await withTransaction(async (client) => {
      // Check if user exists
      const existing = await client.query('SELECT * FROM users WHERE telegram_id = $1', [
        userCtx.telegram_id,
      ]);

      if (existing.rows.length > 0) {
        // Update basic info
        await client.query(
          `UPDATE users 
           SET username = COALESCE($2, username),
               first_name = COALESCE($3, first_name),
               last_name = COALESCE($4, last_name),
               updated_at = NOW()
           WHERE telegram_id = $1`,
          [userCtx.telegram_id, userCtx.username, userCtx.first_name, userCtx.last_name]
        );
        return existing.rows[0];
      }

      // New user registration
      const newReferralCode = `ref_${userCtx.telegram_id}_${crypto.randomBytes(3).toString('hex')}`;
      let referrerTelegramId: number | null = null;

      // Handle referral attribution if supplied
      if (referralCodeParam) {
        const cleanRef = String(referralCodeParam).replace('ref_', '').trim();
        const refUserRes = await client.query(
          'SELECT telegram_id FROM users WHERE referral_code = $1 OR referral_code = $2 OR telegram_id::text = $3',
          [referralCodeParam, `ref_${cleanRef}`, cleanRef]
        );

        if (refUserRes.rows.length > 0) {
          const matchedId = Number(refUserRes.rows[0].telegram_id);
          // Self-referral guard
          if (matchedId !== userCtx.telegram_id) {
            referrerTelegramId = matchedId;
          }
        }
      }

      const insertRes = await client.query(
        `INSERT INTO users (
           telegram_id, username, first_name, last_name,
           balance_agen, claimable_agen, level, mining_rate,
           mining_started_at, last_claim_at, referred_by, referral_code
         ) VALUES (
           $1, $2, $3, $4,
           0.0000, 0.0000, 1, 0.45,
           NOW(), NOW(), $5, $6
         ) RETURNING *`,
        [
          userCtx.telegram_id,
          userCtx.username,
          userCtx.first_name,
          userCtx.last_name,
          referrerTelegramId,
          newReferralCode,
        ]
      );

      const newUser = insertRes.rows[0];

      // Award referral bonus to referrer atomically if applicable
      if (referrerTelegramId) {
        const bonus = AURA_AGEN_SETTINGS.referral_reward; // 50 AGEN
        const referrerUpdate = await client.query(
          `UPDATE users 
           SET balance_agen = balance_agen + $1, updated_at = NOW() 
           WHERE telegram_id = $2 
           RETURNING balance_agen`,
          [bonus, referrerTelegramId]
        );

        if (referrerUpdate.rows.length > 0) {
          const newBal = Number(referrerUpdate.rows[0].balance_agen);
          await client.query(
            `INSERT INTO transactions (
               telegram_id, type, amount, balance_before, balance_after,
               reference_id, description, metadata
             ) VALUES (
               $1, 'REFERRAL_BOUNTY', $2, $3, $4,
               $5, $6, $7
             )`,
            [
              referrerTelegramId,
              bonus,
              newBal - bonus,
              newBal,
              String(userCtx.telegram_id),
              `Referral bonus for user ${userCtx.telegram_id}`,
              JSON.stringify({ referred_telegram_id: userCtx.telegram_id }),
            ]
          );
        }
      }

      return newUser;
    });

    const jwtToken = issueJwtToken({
      telegram_id: Number(userResult.telegram_id),
      username: userResult.username,
      first_name: userResult.first_name,
    });

    res.json({
      success: true,
      token: jwtToken,
      user: userResult,
    });
  } catch (error: any) {
    console.error('Auth error:', error);
    res.status(500).json({ error: error.message || 'Authentication failed' });
  }
};

apiRouter.post('/auth/telegram', handleAuthUser);
apiRouter.post('/user', handleAuthUser);

// 2. User State (Mining calculation & dashboard summary)
apiRouter.get('/user/state', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);

    const userRes = await query('SELECT * FROM users WHERE telegram_id = $1', [
      userCtx.telegram_id,
    ]);

    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User not found. Please authenticate first.' });
    }

    const user = userRes.rows[0];

    // Server-side dynamic calculation of pending mining claim:
    // delta_t = now - last_claim_at
    const now = new Date();
    const lastClaim = new Date(user.last_claim_at || user.mining_started_at || now);
    const elapsedSeconds = Math.max(0, (now.getTime() - lastClaim.getTime()) / 1000);
    const hourlyRate = Number(user.mining_rate) || 0.45;
    const pendingClaimable = Number(((elapsedSeconds / 3600) * hourlyRate).toFixed(4));

    // Daily ad quota used today (UTC)
    const adsTodayRes = await query(
      `SELECT count(*)::int as count 
       FROM ad_sessions 
       WHERE telegram_id = $1 
         AND is_used = TRUE 
         AND created_at >= CURRENT_DATE`,
      [userCtx.telegram_id]
    );
    const completedAdsToday = adsTodayRes.rows[0]?.count || 0;

    // Completed tasks
    const tasksRes = await query(
      'SELECT task_id FROM task_completions WHERE telegram_id = $1',
      [userCtx.telegram_id]
    );
    const completedTasks = tasksRes.rows.map((r) => r.task_id);

    // Referrals count
    const refCountRes = await query(
      'SELECT count(*)::int as count FROM users WHERE referred_by = $1',
      [userCtx.telegram_id]
    );
    const referralCount = refCountRes.rows[0]?.count || 0;

    // Settings
    const settingsRes = await query('SELECT key, value FROM settings');
    const settingsMap: Record<string, any> = {};
    for (const row of settingsRes.rows) {
      settingsMap[row.key] = row.value;
    }

    res.json({
      user: {
        ...user,
        balance_agen: Number(user.balance_agen),
        mining_rate: Number(user.mining_rate),
        claimable_agen: pendingClaimable,
        elapsed_seconds: Math.floor(elapsedSeconds),
      },
      completed_ads_today: completedAdsToday,
      daily_ad_limit: AURA_AGEN_SETTINGS.daily_ad_limit,
      completed_tasks: completedTasks,
      referral_count: referralCount,
      settings: settingsMap,
      levels: LEVELS,
    });
  } catch (error: any) {
    console.error('State error:', error);
    res.status(500).json({ error: error.message || 'Failed to fetch user state' });
  }
});

// 3. Mining Claim (Atomic row locking and balance update)
const handleMiningClaim = async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);

    const claimResult = await withTransaction(async (client) => {
      // Row lock user record
      const lockRes = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE',
        [userCtx.telegram_id]
      );

      if (lockRes.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = lockRes.rows[0];
      const now = new Date();
      const lastClaim = new Date(user.last_claim_at || user.mining_started_at || now);
      const elapsedSeconds = Math.max(0, (now.getTime() - lastClaim.getTime()) / 1000);

      // Concurrency / double claim guard: minimum 2 seconds of mining
      if (elapsedSeconds < 2) {
        throw new Error('No pending mining reward available yet. Please wait a moment.');
      }

      const hourlyRate = Number(user.mining_rate) || 0.45;
      const earned = Number(((elapsedSeconds / 3600) * hourlyRate).toFixed(4));

      if (earned <= 0) {
        throw new Error('Claim amount must be greater than zero');
      }

      const oldBalance = Number(user.balance_agen);
      const newBalance = Number((oldBalance + earned).toFixed(4));

      // Update user atomically
      await client.query(
        `UPDATE users 
         SET balance_agen = $1,
             claimable_agen = 0.0000,
             last_claim_at = NOW(),
             updated_at = NOW()
         WHERE telegram_id = $2`,
        [newBalance, userCtx.telegram_id]
      );

      // Insert transaction ledger record
      await client.query(
        `INSERT INTO transactions (
           telegram_id, type, amount, balance_before, balance_after,
           description, metadata
         ) VALUES (
           $1, 'MINING_CLAIM', $2, $3, $4,
           $5, $6
         )`,
        [
          userCtx.telegram_id,
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

    res.json({
      success: true,
      ...claimResult,
    });
  } catch (error: any) {
    console.error('Claim error:', error);
    res.status(400).json({ error: error.message || 'Failed to claim mining rewards' });
  }
};

apiRouter.post('/mining/claim', handleMiningClaim);
apiRouter.post('/claim', handleMiningClaim);

// 4. Ads: Initiate Session (Generate single-use signed nonce)
apiRouter.post('/ads/initiate', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);

    // Check daily quota
    const adsTodayRes = await query(
      `SELECT count(*)::int as count 
       FROM ad_sessions 
       WHERE telegram_id = $1 
         AND is_used = TRUE 
         AND created_at >= CURRENT_DATE`,
      [userCtx.telegram_id]
    );

    const completedToday = adsTodayRes.rows[0]?.count || 0;
    if (completedToday >= AURA_AGEN_SETTINGS.daily_ad_limit) {
      return res.status(400).json({
        error: 'daily-limit-reached',
        message: `Maximum ${AURA_AGEN_SETTINGS.daily_ad_limit} ads reached for today`,
      });
    }

    const nonce = `ad_nonce_${crypto.randomBytes(16).toString('hex')}`;
    const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 min expiry

    await query(
      `INSERT INTO ad_sessions (telegram_id, nonce, reward_amount, is_used, expires_at)
       VALUES ($1, $2, $3, FALSE, $4)`,
      [userCtx.telegram_id, nonce, AURA_AGEN_SETTINGS.ad_reward, expiresAt]
    );

    res.json({
      success: true,
      nonce,
      zone_id: AURA_AGEN_SETTINGS.monetag_zone_id,
      reward: AURA_AGEN_SETTINGS.ad_reward,
      expires_at: expiresAt.toISOString(),
    });
  } catch (error: any) {
    console.error('Ad initiate error:', error);
    res.status(500).json({ error: error.message || 'Failed to initiate ad session' });
  }
});

// 5. Ads: Verify & Claim Reward (Server-side nonce validation)
apiRouter.post('/ads/claim', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const { nonce } = req.body;

    if (!nonce) {
      return res.status(400).json({ error: 'Missing ad session nonce' });
    }

    const claimResult = await withTransaction(async (client) => {
      // Daily ad limit check
      const adsTodayRes = await client.query(
        `SELECT count(*)::int as count 
         FROM ad_sessions 
         WHERE telegram_id = $1 
           AND is_used = TRUE 
           AND created_at >= CURRENT_DATE`,
        [userCtx.telegram_id]
      );
      const completedToday = adsTodayRes.rows[0]?.count || 0;
      if (completedToday >= AURA_AGEN_SETTINGS.daily_ad_limit) {
        throw new Error('daily-limit-reached');
      }

      // Check nonce with row lock
      const sessionRes = await client.query(
        `SELECT * FROM ad_sessions 
         WHERE nonce = $1 AND telegram_id = $2 
         FOR UPDATE`,
        [nonce, userCtx.telegram_id]
      );

      if (sessionRes.rows.length === 0) {
        throw new Error('Invalid or unknown ad session nonce');
      }

      const session = sessionRes.rows[0];
      if (session.is_used) {
        throw new Error('Ad reward has already been claimed for this session');
      }

      if (new Date(session.expires_at).getTime() < Date.now()) {
        throw new Error('Ad session has expired');
      }

      // Mark session used
      await client.query('UPDATE ad_sessions SET is_used = TRUE WHERE id = $1', [session.id]);

      // Lock user and disburse reward
      const userRes = await client.query(
        'SELECT balance_agen FROM users WHERE telegram_id = $1 FOR UPDATE',
        [userCtx.telegram_id]
      );
      const oldBal = Number(userRes.rows[0].balance_agen);
      const reward = Number(session.reward_amount) || AURA_AGEN_SETTINGS.ad_reward;
      const newBal = Number((oldBal + reward).toFixed(4));

      await client.query(
        'UPDATE users SET balance_agen = $1, updated_at = NOW() WHERE telegram_id = $2',
        [newBal, userCtx.telegram_id]
      );

      // Ledger insert
      await client.query(
        `INSERT INTO transactions (
           telegram_id, type, amount, balance_before, balance_after,
           reference_id, description
         ) VALUES (
           $1, 'AD_REWARD', $2, $3, $4,
           $5, 'Monetag Ad completion reward'
         )`,
        [userCtx.telegram_id, reward, oldBal, newBal, nonce]
      );

      return {
        reward,
        new_balance: newBal,
        completed_today: completedToday + 1,
      };
    });

    res.json({
      success: true,
      ...claimResult,
    });
  } catch (error: any) {
    console.error('Ad claim error:', error);
    res.status(400).json({ error: error.message || 'Failed to claim ad reward' });
  }
});

// 6. Social Tasks: Claim Channel Join Task
apiRouter.post('/tasks/claim', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const taskId = req.body?.task_id || 'telegram_channel';
    const reward = AURA_AGEN_SETTINGS.task_reward; // 2 AGEN

    // Telegram Channel join verification via getChatMember
    if (taskId === 'telegram_channel' && BOT_TOKEN && userCtx.telegram_id && userCtx.telegram_id > 10000) {
      try {
        const checkUrl = `https://api.telegram.org/bot${BOT_TOKEN}/getChatMember?chat_id=@NEW_AURA_GEN&user_id=${userCtx.telegram_id}`;
        const tgResp = await fetch(checkUrl);
        const tgData: any = await tgResp.json();
        if (tgData.ok && tgData.result) {
          const status = tgData.result.status;
          if (['left', 'kicked'].includes(status)) {
            return res.status(400).json({
              error: 'not-joined',
              message: 'Please join @NEW_AURA_GEN channel on Telegram to claim this reward.',
            });
          }
        }
      } catch (tgErr) {
        console.warn('Telegram getChatMember check bypassed:', tgErr);
      }
    }

    const result = await withTransaction(async (client) => {
      // Check if already completed
      const checkRes = await client.query(
        'SELECT * FROM task_completions WHERE telegram_id = $1 AND task_id = $2',
        [userCtx.telegram_id, taskId]
      );

      if (checkRes.rows.length > 0) {
        throw new Error('duplicate-task');
      }

      // Record task completion
      await client.query(
        `INSERT INTO task_completions (telegram_id, task_id, reward_agen)
         VALUES ($1, $2, $3)`,
        [userCtx.telegram_id, taskId, reward]
      );

      // Lock user and award
      const userRes = await client.query(
        'SELECT balance_agen FROM users WHERE telegram_id = $1 FOR UPDATE',
        [userCtx.telegram_id]
      );
      const oldBal = Number(userRes.rows[0].balance_agen);
      const newBal = Number((oldBal + reward).toFixed(4));

      await client.query(
        'UPDATE users SET balance_agen = $1, updated_at = NOW() WHERE telegram_id = $2',
        [newBal, userCtx.telegram_id]
      );

      await client.query(
        `INSERT INTO transactions (
           telegram_id, type, amount, balance_before, balance_after,
           reference_id, description
         ) VALUES (
           $1, 'TASK_REWARD', $2, $3, $4,
           $5, 'Reward for completing task: Join @NEW_AURA_GEN'
         )`,
        [userCtx.telegram_id, reward, oldBal, newBal, taskId]
      );

      return {
        reward,
        new_balance: newBal,
        task_id: taskId,
      };
    });

    res.json({
      success: true,
      ...result,
    });
  } catch (error: any) {
    console.error('Task claim error:', error);
    res.status(400).json({ error: error.message || 'Failed to claim task' });
  }
});

// 7. On-chain TON Level Up Verification
apiRouter.post('/levels/upgrade', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const { target_level, tx_hash, wallet_address } = req.body;

    if (!target_level || !tx_hash) {
      return res.status(400).json({ error: 'Missing target_level or tx_hash' });
    }

    const normalizedHash = String(tx_hash).trim().toLowerCase();
    if (normalizedHash.length < 8) {
      return res.status(400).json({ error: 'Invalid TON transaction hash' });
    }

    const upgradeResult = await withTransaction(async (client) => {
      // Replay attack guard on transaction hash
      const hashCheck = await client.query(
        'SELECT * FROM ton_transaction_checks WHERE LOWER(tx_hash) = $1',
        [normalizedHash]
      );

      if (hashCheck.rows.length > 0) {
        throw new Error('duplicate-transaction');
      }

      // User check
      const userRes = await client.query(
        'SELECT * FROM users WHERE telegram_id = $1 FOR UPDATE',
        [userCtx.telegram_id]
      );

      if (userRes.rows.length === 0) {
        throw new Error('User not found');
      }

      const user = userRes.rows[0];
      const currentLevel = Number(user.level) || 1;
      const target = Number(target_level);

      if (target <= currentLevel) {
        throw new Error(`Target level (${target}) must be higher than current level (${currentLevel})`);
      }

      if (target > 12) {
        throw new Error('Target level exceeds maximum level 12');
      }

      const levelDef = getLevelDefinition(target);
      const newMiningRate = getMiningRateForLevel(target);

      // Record verified TON transaction hash
      await client.query(
        `INSERT INTO ton_transaction_checks (
           tx_hash, telegram_id, target_level, amount_ton, status
         ) VALUES ($1, $2, $3, $4, 'VERIFIED')`,
        [normalizedHash, userCtx.telegram_id, target, levelDef.ton_amount]
      );

      // Upgrade user level & mining rate
      await client.query(
        `UPDATE users 
         SET level = $1,
             mining_rate = $2,
             wallet_address = COALESCE($3, wallet_address),
             updated_at = NOW()
         WHERE telegram_id = $4`,
        [target, newMiningRate, wallet_address || null, userCtx.telegram_id]
      );

      // Ledger entry
      await client.query(
        `INSERT INTO transactions (
           telegram_id, type, amount, balance_before, balance_after,
           reference_id, description, metadata
         ) VALUES (
           $1, 'LEVEL_UPGRADE', 0, $2, $2,
           $3, $4, $5
         )`,
        [
          userCtx.telegram_id,
          Number(user.balance_agen),
          normalizedHash,
          `Upgraded from Level ${currentLevel} to Level ${target}`,
          JSON.stringify({
            from_level: currentLevel,
            to_level: target,
            deposit_ton: levelDef.ton_amount,
            new_mining_rate: newMiningRate,
            treasury: AURA_AGEN_SETTINGS.ton_receiver_wallet,
          }),
        ]
      );

      return {
        level: target,
        mining_rate: newMiningRate,
        deposit_ton: levelDef.ton_amount,
      };
    });

    res.json({
      success: true,
      ...upgradeResult,
    });
  } catch (error: any) {
    console.error('Level upgrade error:', error);
    res.status(400).json({ error: error.message || 'Failed to process level upgrade' });
  }
});

// 8. Wallet Link
apiRouter.post('/wallet/link', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const { wallet_address } = req.body;

    if (!wallet_address) {
      return res.status(400).json({ error: 'Missing wallet_address' });
    }

    await query('UPDATE users SET wallet_address = $1, updated_at = NOW() WHERE telegram_id = $2', [
      String(wallet_address).trim(),
      userCtx.telegram_id,
    ]);

    res.json({ success: true, wallet_address });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to link wallet' });
  }
});

// 9. Managed Withdrawal Vault
apiRouter.post('/withdrawals/request', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const { amount, wallet_address } = req.body;

    // Check system settings
    const settingRes = await query(
      "SELECT value FROM settings WHERE key = 'withdrawals_enabled'"
    );
    const isEnabled = settingRes.rows[0]?.value === true || settingRes.rows[0]?.value === 'true';

    if (!isEnabled) {
      return res.status(400).json({
        error: 'withdrawals-disabled',
        message: 'Withdrawals are currently disabled by protocol governance.',
      });
    }

    const minSettingRes = await query(
      "SELECT value FROM settings WHERE key = 'withdrawal_minimum'"
    );
    const minWithdrawal = Number(minSettingRes.rows[0]?.value) || AURA_AGEN_SETTINGS.withdrawal_minimum;

    const withdrawAmount = Number(amount);
    if (isNaN(withdrawAmount) || withdrawAmount < minWithdrawal) {
      return res.status(400).json({
        error: 'below-minimum',
        message: `Minimum withdrawal is ${minWithdrawal} AGEN`,
      });
    }

    if (!wallet_address) {
      return res.status(400).json({ error: 'Missing destination wallet address' });
    }

    const ticket = await withTransaction(async (client) => {
      const userRes = await client.query(
        'SELECT balance_agen FROM users WHERE telegram_id = $1 FOR UPDATE',
        [userCtx.telegram_id]
      );

      if (userRes.rows.length === 0) {
        throw new Error('User not found');
      }

      const currentBal = Number(userRes.rows[0].balance_agen);
      if (currentBal < withdrawAmount) {
        throw new Error('Insufficient AGEN balance for withdrawal');
      }

      const newBal = Number((currentBal - withdrawAmount).toFixed(4));

      // Deduct atomically
      await client.query(
        'UPDATE users SET balance_agen = $1, updated_at = NOW() WHERE telegram_id = $2',
        [newBal, userCtx.telegram_id]
      );

      // Insert pending withdrawal
      const withRes = await client.query(
        `INSERT INTO withdrawals (telegram_id, amount, wallet_address, status)
         VALUES ($1, $2, $3, 'pending')
         RETURNING *`,
        [userCtx.telegram_id, withdrawAmount, wallet_address]
      );

      // Ledger entry
      await client.query(
        `INSERT INTO transactions (
           telegram_id, type, amount, balance_before, balance_after,
           reference_id, description
         ) VALUES (
           $1, 'WITHDRAWAL_PENDING', $2, $3, $4,
           $5, 'Pending withdrawal request'
         )`,
        [userCtx.telegram_id, -withdrawAmount, currentBal, newBal, withRes.rows[0].id]
      );

      return withRes.rows[0];
    });

    res.json({
      success: true,
      ticket,
    });
  } catch (error: any) {
    console.error('Withdrawal error:', error);
    res.status(400).json({ error: error.message || 'Failed to submit withdrawal' });
  }
});

// 10. Ledger / Audit History
apiRouter.get('/ledger/history', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const histRes = await query(
      `SELECT id, type, amount, balance_before, balance_after, description, reference_id, created_at
       FROM transactions
       WHERE telegram_id = $1
       ORDER BY created_at DESC
       LIMIT 50`,
      [userCtx.telegram_id]
    );

    res.json({
      transactions: histRes.rows.map((row) => ({
        ...row,
        amount: Number(row.amount),
        balance_before: Number(row.balance_before),
        balance_after: Number(row.balance_after),
      })),
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to retrieve transaction history' });
  }
});

// 11. Referral List & Stats
apiRouter.get('/referrals/list', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);

    const refListRes = await query(
      `SELECT telegram_id, username, first_name, created_at
       FROM users
       WHERE referred_by = $1
       ORDER BY created_at DESC`,
      [userCtx.telegram_id]
    );

    const count = refListRes.rows.length;
    const totalBonus = count * AURA_AGEN_SETTINGS.referral_reward;

    res.json({
      referrals: refListRes.rows,
      total_referred: count,
      total_earned_agen: totalBonus,
      bounty_per_referral: AURA_AGEN_SETTINGS.referral_reward,
    });
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch referrals' });
  }
});

// 12. Public System Settings
apiRouter.get('/settings', async (_req: Request, res: Response) => {
  try {
    const sRes = await query('SELECT key, value FROM settings');
    const map: Record<string, any> = {};
    for (const row of sRes.rows) {
      map[row.key] = row.value;
    }
    res.json(map);
  } catch (error: any) {
    res.status(500).json({ error: error.message || 'Failed to fetch settings' });
  }
});

// 13. Admin Toggle for Withdrawals (for testing and protocol governance)
apiRouter.post('/admin/toggle-withdrawals', async (req: Request, res: Response) => {
  try {
    const { enabled } = req.body;
    const newVal = Boolean(enabled);
    await query("UPDATE settings SET value = $1 WHERE key = 'withdrawals_enabled'", [
      JSON.stringify(newVal),
    ]);
    res.json({ success: true, withdrawals_enabled: newVal });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

// 14. Telegram Bot Webhook Route (/api/bot)
apiRouter.get('/bot', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    bot: `@${AURA_AGEN_SETTINGS.bot_username}`,
    webhook_active: true,
    time: new Date().toISOString(),
  });
});

apiRouter.post('/bot', async (req: Request, res: Response) => {
  try {
    const update = req.body;
    const message = update?.message;

    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat?.id;
    const text = message.text.trim();
    const firstName = message.from?.first_name || 'Miner';

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const payload = parts.length > 1 ? parts[1].trim() : null;

      let webAppUrl =
        process.env.VITE_MINI_APP_URL ||
        process.env.APP_URL ||
        `https://t.me/${AURA_AGEN_SETTINGS.bot_username}/app`;

      if (payload) {
        webAppUrl += (webAppUrl.includes('?') ? '&' : '?') + `startapp=${encodeURIComponent(payload)}`;
      }

      let referralNotice = '';
      if (payload) {
        referralNotice = `\n🎁 *Invited via Referral:* Entered with code \`${payload}\`. Both you and your sponsor earn 50 AGEN!\n`;
      }

      const welcomeText = `💎 *Welcome to AURA_AGEN ($AGEN)* 💎

Hello *${firstName}*! You have entered the official high-yield decentralized mining ecosystem on TON Mainnet.

⚡ *Key Features:*
• *Automated Server Mining:* Earn up to 921.60 AGEN/hr across 12 tiers.
• *Referral Bounty:* Earn *50 AGEN* instantly for each referred miner.
• *Monetag Ad Vault:* Earn 1 AGEN per completed session (up to 10 daily).
• *Social Tasks:* Claim 2 AGEN for subscribing to @NEW_AURA_GEN.
• *TON Treasury:* Seamless upgrades to treasury wallet \`${AURA_AGEN_SETTINGS.ton_receiver_wallet}\`.

${referralNotice}
Click the button below to launch the Mini App inside Telegram!`;

      // Send telegram reply with WebApp inline button
      if (BOT_TOKEN && chatId) {
        await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeText,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '⚡ Launch AURA_AGEN App',
                    web_app: { url: webAppUrl },
                  },
                ],
                [
                  {
                    text: '📢 Join Official Channel',
                    url: AURA_AGEN_SETTINGS.telegram_channel,
                  },
                ],
              ],
            },
          }),
        }).catch((err) => console.error('Error sending Telegram message:', err));
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true, error: error.message });
  }
});

// 15. Explicit Aliases: /api/user (GET), /api/sync
apiRouter.get('/user', async (req: Request, res: Response) => {
  const userCtx = resolveUserContext(req);
  try {
    const uRes = await query('SELECT * FROM users WHERE telegram_id = $1', [userCtx.telegram_id]);
    if (uRes.rows.length === 0) return res.status(404).json({ error: 'User not found' });
    return res.json({ user: uRes.rows[0] });
  } catch (e: any) {
    return res.status(500).json({ error: e.message });
  }
});

apiRouter.all('/sync', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const userRes = await query('SELECT * FROM users WHERE telegram_id = $1', [userCtx.telegram_id]);
    if (userRes.rows.length === 0) {
      return res.status(404).json({ error: 'User record not found' });
    }

    const user = userRes.rows[0];
    const now = new Date();
    const lastClaim = new Date(user.last_claim_at || user.mining_started_at || now);
    const elapsedSeconds = Math.max(0, (now.getTime() - lastClaim.getTime()) / 1000);
    const hourlyRate = Number(user.mining_rate) || 0.45;
    const claimable = Number(((elapsedSeconds / 3600) * hourlyRate).toFixed(4));

    res.json({
      success: true,
      server_time: now.toISOString(),
      user: {
        ...user,
        balance_agen: Number(user.balance_agen),
        claimable_agen: claimable,
        mining_rate: hourlyRate,
        elapsed_seconds: Math.floor(elapsedSeconds),
      },
    });
  } catch (error: any) {
    console.error('Sync error:', error);
    res.status(500).json({ error: error.message || 'Sync failed' });
  }
});

apiRouter.get('/referrals', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const { rows } = await query(
      `SELECT telegram_id, username, first_name, level, created_at
       FROM users 
       WHERE referred_by = $1
       ORDER BY created_at DESC`,
      [String(userCtx.telegram_id)]
    );
    res.json(rows);
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});

apiRouter.post('/user/balance', async (req: Request, res: Response) => {
  try {
    const userCtx = resolveUserContext(req);
    const points = req.body?.points ?? req.body?.balance_agen;
    if (points === undefined) return res.status(400).json({ error: 'Points required' });

    const { rows } = await query(
      'UPDATE users SET balance_agen = $1, updated_at = NOW() WHERE telegram_id = $2 RETURNING *',
      [Number(points), userCtx.telegram_id]
    );
    res.json({ user: rows[0] });
  } catch (error: any) {
    res.status(500).json({ error: error.message });
  }
});
