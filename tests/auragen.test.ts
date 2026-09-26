import test from 'node:test';
import assert from 'node:assert/strict';
import {
  AURA_AGEN_SETTINGS,
  LEVELS,
  applyDailyAdReward,
  applyReferralReward,
  applyTaskReward,
  calculateElapsedMining,
  claimMiningReward,
  getLevelDefinition,
  getMiningRateForLevel,
  isAdminAuthorized,
  validateTelegramInitData,
  validateTonAmount,
  validateTonTransactionHash,
  validateWithdrawal,
} from '../src/lib/auragen.ts';

test('level calculations', () => {
  const level1 = getLevelDefinition(1);
  const level12 = getLevelDefinition(12);
  assert.equal(level1.agen_amount, 100);
  assert.equal(level12.agen_amount, 204800);
  assert.equal(getMiningRateForLevel(1), 0.45);
  assert.equal(getMiningRateForLevel(12), 921.6);
});

test('mining elapsed-time calculation', () => {
  const now = new Date('2026-01-01T00:00:00Z');
  const lastClaimed = new Date('2025-12-31T23:00:00Z');
  const reward = calculateElapsedMining(lastClaimed, 0.45, now);
  assert.equal(reward, 0.45);
});

test('claim reward allowed when pending exists', () => {
  assert.deepEqual(claimMiningReward(25, false), { allowed: true, amount: 25 });
});

test('double claim prevention', () => {
  assert.deepEqual(claimMiningReward(25, true), { allowed: false, amount: 0 });
});

test('referral reward', () => {
  const result = applyReferralReward('12', '34', ['33']);
  assert.deepEqual(result, { allowed: true, amount: 50, reason: 'rewarded' });
});

test('self referral prevention', () => {
  const result = applyReferralReward('12', '12', []);
  assert.deepEqual(result, { allowed: false, amount: 0, reason: 'self-referral' });
});

test('duplicate referral prevention', () => {
  const result = applyReferralReward('12', '34', ['34']);
  assert.deepEqual(result, { allowed: false, amount: 0, reason: 'duplicate-referral' });
});

test('task reward', () => {
  const result = applyTaskReward('telegram_channel', ['other']);
  assert.deepEqual(result, { allowed: true, amount: 2, reason: 'rewarded' });
});

test('duplicate task reward prevention', () => {
  const result = applyTaskReward('telegram_channel', ['telegram_channel']);
  assert.deepEqual(result, { allowed: false, amount: 0, reason: 'duplicate-task' });
});

test('ad daily limit', () => {
  const result = applyDailyAdReward(10);
  assert.deepEqual(result, { allowed: false, amount: 0, reason: 'daily-limit-reached' });
});

test('duplicate ad reward prevention', () => {
  assert.equal(applyDailyAdReward(0).allowed, true);
});

test('withdrawal minimum', () => {
  const result = validateWithdrawal(999, true);
  assert.deepEqual(result, { allowed: false, amount: 0, reason: 'below-minimum' });
});

test('withdrawal disabled state', () => {
  const result = validateWithdrawal(2000, false);
  assert.deepEqual(result, { allowed: false, amount: 0, reason: 'withdrawals-disabled' });
});

test('TON transaction duplicate prevention', () => {
  const result = validateTonTransactionHash('0xabc123', ['0XABC123']);
  assert.deepEqual(result, { allowed: false, reason: 'duplicate-transaction' });
});

test('TON amount validation', () => {
  assert.deepEqual(validateTonAmount(0), { allowed: false, reason: 'invalid-amount' });
  assert.deepEqual(validateTonAmount(1.5), { allowed: true, reason: 'valid' });
});

test('Telegram initData validation', () => {
  const valid = validateTelegramInitData('query_id=1&hash=abc', 'token');
  assert.equal(valid, true);
});

test('admin authorization', () => {
  assert.equal(isAdminAuthorized('42', ['42', '99']), true);
  assert.equal(isAdminAuthorized('10', ['42', '99']), false);
});

test('settings are not altered', () => {
  assert.equal(AURA_AGEN_SETTINGS.referral_reward, 50);
  assert.equal(AURA_AGEN_SETTINGS.task_reward, 2);
  assert.equal(AURA_AGEN_SETTINGS.ad_reward, 1);
  assert.equal(AURA_AGEN_SETTINGS.daily_ad_limit, 10);
  assert.equal(AURA_AGEN_SETTINGS.withdrawal_minimum, 1000);
  assert.equal(AURA_AGEN_SETTINGS.ton_receiver_wallet, 'UQA0N60XaN9c1l5DvOoQcnXWEX7YEFvNaETOnenlk3iSCPX5');
  assert.equal(LEVELS[0].agen_amount, 100);
  assert.equal(LEVELS[11].agen_amount, 204800);
});
