export const AURA_AGEN_SETTINGS = {
  project_name: 'AURA_AGEN',
  token_symbol: 'AGEN',
  referral_reward: 50,
  task_reward: 2,
  ad_reward: 1,
  daily_ad_limit: 10,
  withdrawal_minimum: 1000,
  withdrawals_enabled: false,
  ton_network: 'mainnet',
  ton_receiver_wallet: 'UQA0N60XaN9c1l5DvOoQcnXWEX7YEFvNaETOnenlk3iSCPX5',
  telegram_channel: 'https://t.me/NEW_AURA_GEN',
  monetag_zone_id: '11862041',
  bot_username: 'AURA_AGENBOT',
  bot_token_env: 'BOT_TOKEN',
  onchain_network: 'TON Mainnet',
} as const;

export type LevelDefinition = {
  level: number;
  agen_amount: number;
  ton_amount: number;
  hourly_rate: number;
  label: string;
};

export const LEVELS: LevelDefinition[] = [
  { level: 1, agen_amount: 100, ton_amount: 0.1, hourly_rate: 0.45, label: 'Genesis' },
  { level: 2, agen_amount: 200, ton_amount: 0.2, hourly_rate: 0.9, label: 'Scout' },
  { level: 3, agen_amount: 400, ton_amount: 0.4, hourly_rate: 1.8, label: 'Miner' },
  { level: 4, agen_amount: 800, ton_amount: 0.8, hourly_rate: 3.6, label: 'Crusher' },
  { level: 5, agen_amount: 1600, ton_amount: 1.6, hourly_rate: 7.2, label: 'Runner' },
  { level: 6, agen_amount: 3200, ton_amount: 3.2, hourly_rate: 14.4, label: 'Drill' },
  { level: 7, agen_amount: 6400, ton_amount: 6.4, hourly_rate: 28.8, label: 'Forge' },
  { level: 8, agen_amount: 12800, ton_amount: 12.8, hourly_rate: 57.6, label: 'Signal' },
  { level: 9, agen_amount: 25600, ton_amount: 25.6, hourly_rate: 115.2, label: 'Core' },
  { level: 10, agen_amount: 51200, ton_amount: 51.2, hourly_rate: 230.4, label: 'Pulse' },
  { level: 11, agen_amount: 102400, ton_amount: 102.4, hourly_rate: 460.8, label: 'Titan' },
  { level: 12, agen_amount: 204800, ton_amount: 204.8, hourly_rate: 921.6, label: 'Apex' },
];

export const getLevelDefinition = (level: number): LevelDefinition => {
  const normalized = Number(level) || 1;
  return LEVELS.find((entry) => entry.level === normalized) ?? LEVELS[0];
};

export const getLevelProgress = (currentLevel: number, currentBalance: number) => {
  const current = getLevelDefinition(currentLevel);
  const next = getNextLevelDefinition(currentLevel);
  const start = current.agen_amount;
  const end = next.agen_amount;
  const range = Math.max(end - start, 1);
  const progress = ((currentBalance - start) / range) * 100;
  return Number(Math.min(Math.max(progress, 0), 100).toFixed(2));
};

export const getNextLevelDefinition = (level: number): LevelDefinition => {
  const next = LEVELS.find((entry) => entry.level > Number(level));
  return next ?? LEVELS[LEVELS.length - 1];
};

export const getMiningRateForLevel = (level: number): number => getLevelDefinition(level).hourly_rate;

export const calculateElapsedMining = (
  lastClaimedAt: string | number | Date | null | undefined,
  hourlyRate: number,
  now: Date = new Date(),
): number => {
  if (!lastClaimedAt) {
    return 0;
  }

  const lastClaimMs = new Date(lastClaimedAt).getTime();
  if (!Number.isFinite(lastClaimMs)) {
    return 0;
  }

  const elapsedHours = Math.max(0, (now.getTime() - lastClaimMs) / (1000 * 60 * 60));
  return Number((elapsedHours * hourlyRate).toFixed(4));
};

export const claimMiningReward = (pendingBalance: number, hasAlreadyClaimed: boolean) => {
  if (hasAlreadyClaimed || pendingBalance <= 0) {
    return { allowed: false, amount: 0 };
  }

  return { allowed: true, amount: Number(Number(pendingBalance).toFixed(4)) };
};

export const applyReferralReward = (referrerId: string | number | null | undefined, referredId: string | number | null | undefined, existingReferrals: Array<string | number>) => {
  if (!referrerId || !referredId) {
    return { allowed: false, amount: 0, reason: 'invalid-referral' };
  }

  if (String(referrerId) === String(referredId)) {
    return { allowed: false, amount: 0, reason: 'self-referral' };
  }

  if (existingReferrals.some((entry) => String(entry) === String(referredId))) {
    return { allowed: false, amount: 0, reason: 'duplicate-referral' };
  }

  return { allowed: true, amount: AURA_AGEN_SETTINGS.referral_reward, reason: 'rewarded' };
};

export const applyTaskReward = (taskId: string, completedTasks: string[]) => {
  if (!taskId) {
    return { allowed: false, amount: 0, reason: 'invalid-task' };
  }

  if (completedTasks.includes(taskId)) {
    return { allowed: false, amount: 0, reason: 'duplicate-task' };
  }

  return { allowed: true, amount: AURA_AGEN_SETTINGS.task_reward, reason: 'rewarded' };
};

export const applyDailyAdReward = (adCount: number, limit: number = AURA_AGEN_SETTINGS.daily_ad_limit) => {
  if (adCount >= limit) {
    return { allowed: false, amount: 0, reason: 'daily-limit-reached' };
  }

  return { allowed: true, amount: AURA_AGEN_SETTINGS.ad_reward, reason: 'rewarded' };
};

export const validateWithdrawal = (amount: number, withdrawalsEnabled: boolean, minimum: number = AURA_AGEN_SETTINGS.withdrawal_minimum) => {
  if (!withdrawalsEnabled) {
    return { allowed: false, amount: 0, reason: 'withdrawals-disabled' };
  }

  if (amount < minimum) {
    return { allowed: false, amount: 0, reason: 'below-minimum' };
  }

  return { allowed: true, amount: Number(amount.toFixed(4)), reason: 'approved' };
};

export const validateTonAmount = (amountTon: number) => {
  if (!Number.isFinite(amountTon) || amountTon <= 0) {
    return { allowed: false, reason: 'invalid-amount' };
  }

  return { allowed: true, reason: 'valid' };
};

export const validateTonTransactionHash = (hash: string | null | undefined, seenHashes: string[] = []) => {
  if (!hash) {
    return { allowed: false, reason: 'missing-hash' };
  }

  const normalized = String(hash).trim();
  if (normalized.length < 8) {
    return { allowed: false, reason: 'invalid-hash' };
  }

  if (seenHashes.some((entry) => entry.toLowerCase() === normalized.toLowerCase())) {
    return { allowed: false, reason: 'duplicate-transaction' };
  }

  return { allowed: true, reason: 'approved' };
};

export const validateTelegramInitData = (initData: string | undefined, botToken: string | undefined) => {
  if (!initData || !botToken) {
    return false;
  }

  const params = new URLSearchParams(initData);
  const hash = params.get('hash');
  return Boolean(hash && hash.length > 0);
};

export const isAdminAuthorized = (telegramId: string | number | null | undefined, adminIds: Array<string | number>) => {
  if (!telegramId) {
    return false;
  }

  return adminIds.some((entry) => String(entry) === String(telegramId));
};

export const getMiniAppLaunchUrl = (referrerId?: string | number) => {
  const base = `https://t.me/${AURA_AGEN_SETTINGS.bot_username}`;
  if (!referrerId) {
    return `${base}?startapp=main`;
  }

  return `${base}?startapp=main&start=${String(referrerId)}`;
};
