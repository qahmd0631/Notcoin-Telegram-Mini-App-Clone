import { useEffect, useRef, useState } from 'react';
import { TonConnectButton, useTonAddress } from '@tonconnect/ui-react';
import './index.css';
import { supabase } from './supabase';

type TelegramUser = {
  id?: number | string;
  username?: string;
  first_name?: string;
};

type ReferralRecord = {
  id?: string;
  referrer_id?: string | number | null;
  referred_id?: string | number | null;
  reward_amount?: number | string | null;
  claimed?: boolean | null;
  reward_claimed?: boolean | null;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initDataUnsafe?: {
          user?: TelegramUser;
          start_param?: string;
        };
      };
    };
    show_11862041?: () => void | Promise<unknown>;
  }
}

const HollowGoldBrandLogo = ({ size = 170, className = '' }: { size?: number; className?: string }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 200 200"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="AURA GEN logo"
    role="img"
    style={{ filter: 'drop-shadow(0 0 12px rgba(251, 201, 80, 0.9)) drop-shadow(0 0 24px rgba(255, 181, 63, 0.88))' }}
  >
    <defs>
      <linearGradient id="hollowGoldStroke" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#FFF2A8" />
        <stop offset="28%" stopColor="#FFD95F" />
        <stop offset="52%" stopColor="#D4AF37" />
        <stop offset="76%" stopColor="#B8850B" />
        <stop offset="100%" stopColor="#FFE59A" />
      </linearGradient>
      <filter id="hollowGlow" x="-50%" y="-50%" width="200%" height="200%">
        <feGaussianBlur stdDeviation="1.8" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    </defs>

    <g stroke="url(#hollowGoldStroke)" strokeWidth="4.2" strokeLinecap="round" strokeLinejoin="round" fill="none" filter="url(#hollowGlow)">
      <path d="M100 20 L170 150 L30 150 Z" />
      <path d="M100 20 L100 150" opacity="0.95" />
      <path d="M30 150 L100 110 L170 150" opacity="0.95" />
      <path d="M52 125 C70 102 84 88 100 68 C116 88 130 102 148 125" opacity="0.92" />
      <path d="M70 90 L100 52 L130 90" opacity="0.9" />
      <path d="M72 140 C84 126 92 117 100 106 C108 117 116 126 128 140" opacity="0.85" />
    </g>
  </svg>
);

const App = () => {
  const [points, setPoints] = useState(0);
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'miners' | 'friends' | 'profile'>('home');
  const [referralLink, setReferralLink] = useState('https://t.me/AURA_AGENBOT?start=ref_12345678');
  const [copied, setCopied] = useState(false);
  const [telegramWarning, setTelegramWarning] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isMining, setIsMining] = useState(true);
  const [minedThisSession, setMinedThisSession] = useState(0);
  const [bonusMinutes, setBonusMinutes] = useState(0);
  const [claimingRewards, setClaimingRewards] = useState(false);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [speedBoostSecondsLeft, setSpeedBoostSecondsLeft] = useState(0);
  const [referralStats, setReferralStats] = useState({ totalReferrals: 0, unclaimedRewards: 0, pending: [] as ReferralRecord[] });
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [adWatchCount, setAdWatchCount] = useState(0);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [taskStatus, setTaskStatus] = useState<Record<string, { opened: boolean; completed: boolean; claimed: boolean }>>({
    watch_ad: { opened: false, completed: false, claimed: false },
    join_channel_1: { opened: false, completed: false, claimed: false },
  });
  const userFriendlyAddress = useTonAddress();
  const miningLastUpdatedRef = useRef<number | null>(null);
  const lastLinkedWalletRef = useRef<string | null>(null);

  const miningRate = 0.0001;
  const effectiveMiningRate = Number((miningRate * (speedBoostSecondsLeft > 0 ? 2 : 1)).toFixed(4));
  const minerLevels = [
    { level: 1, speed: '0.20 TH/s', price: 0, unlock: 0 },
    { level: 2, speed: '0.35 TH/s', price: 25, unlock: 25 },
    { level: 3, speed: '0.50 TH/s', price: 60, unlock: 60 },
    { level: 4, speed: '0.75 TH/s', price: 110, unlock: 110 },
    { level: 5, speed: '1.10 TH/s', price: 180, unlock: 180 },
    { level: 6, speed: '1.60 TH/s', price: 260, unlock: 260 },
    { level: 7, speed: '2.20 TH/s', price: 360, unlock: 360 },
    { level: 8, speed: '3.00 TH/s', price: 500, unlock: 500 },
    { level: 9, speed: '4.00 TH/s', price: 700, unlock: 700 },
    { level: 10, speed: '5.00 TH/s', price: 900, unlock: 900 },
    { level: 15, speed: '8.50 TH/s', price: 2300, unlock: 2300 },
    { level: 20, speed: '14.00 TH/s', price: 4200, unlock: 4200 },
    { level: 25, speed: '21.00 TH/s', price: 6600, unlock: 6600 },
    { level: 30, speed: '31.00 TH/s', price: 9800, unlock: 9800 },
    { level: 36, speed: '44.00 TH/s', price: 15000, unlock: 15000 },
  ];
  const normalizePoints = (val: number | string | null | undefined) => {
    const parsed = Number.parseFloat(String(val ?? 0));
    return Number.isFinite(parsed) ? Number(parsed.toFixed(4)) : 0;
  };
  const getTelegramContext = () => {
    const webApp = window.Telegram?.WebApp;
    const tgUser = webApp?.initDataUnsafe?.user ?? null;
    const realUserId = tgUser?.id ? String(tgUser.id) : (webApp ? null : '12345678');
    return { webApp, tgUser, realUserId };
  };
  const getReferrerId = () => {
    let referrerId = null;
    const initData = window.Telegram?.WebApp?.initDataUnsafe;
    const startParam = initData?.start_param || new URLSearchParams(window.location.search).get('tgWebAppStartParam') || new URLSearchParams(window.location.search).get('start');

    if (startParam && startParam.startsWith('ref_')) {
      referrerId = startParam.replace('ref_', '');
    }

    return referrerId;
  };

  const syncReferralStats = async (userId: string | null) => {
    if (!userId) {
      setReferralStats({ totalReferrals: 0, unclaimedRewards: 0, pending: [] });
      return;
    }

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId)
      .or('claimed.is.false,claimed.is.null');

    if (error) {
      console.warn('[Referral] Failed to load referral stats:', error);
      return;
    }

    const rows = Array.isArray(data) ? data as ReferralRecord[] : [];
    const pending = rows.filter((row) => {
      const claimed = row.claimed ?? row.reward_claimed ?? false;
      return !claimed;
    });
    const totalReferralsQuery = await supabase
      .from('referrals')
      .select('id')
      .eq('referrer_id', userId);

    const allRows = Array.isArray(totalReferralsQuery.data) ? totalReferralsQuery.data as Array<{ id?: string }> : [];
    const unclaimedRewards = pending.reduce((sum, row) => sum + normalizePoints(row.reward_amount ?? 10), 0);

    setReferralStats({
      totalReferrals: allRows.length,
      unclaimedRewards: Number(unclaimedRewards.toFixed(4)),
      pending,
    });
  };

  const awardReferralBonus = async (referrerId: string, referredId: string) => {
    const numericReferrerId = Number(referrerId);
    const numericReferredId = Number(referredId);

    if (!Number.isFinite(numericReferrerId) || !Number.isFinite(numericReferredId)) {
      console.warn('[Referral] Invalid numeric referrer or referred ID:', { referrerId, referredId });
      return;
    }

    const { data: existingReferral, error: referralCheckError } = await supabase
      .from('referrals')
      .select('id')
      .eq('referred_id', numericReferredId)
      .maybeSingle();

    if (referralCheckError && referralCheckError.code !== 'PGRST116') {
      console.error('[Referral] Lookup failed:', referralCheckError);
      return;
    }

    if (existingReferral) {
      return;
    }

    const { error: referralInsertError } = await supabase
      .from('referrals')
      .insert([
        {
          referrer_id: numericReferrerId,
          referred_id: numericReferredId,
          reward_amount: 10,
          claimed: false,
        },
      ]);

    if (referralInsertError) {
      console.error('[Referral] Insert failed:', referralInsertError);
      return;
    }

    const { data: referrerUser, error: referrerLoadError } = await supabase
      .from('users')
      .select('points')
      .eq('telegram_id', String(numericReferrerId))
      .maybeSingle();

    if (referrerLoadError && referrerLoadError.code !== 'PGRST116') {
      console.error('[Referral] Referrer fetch failed:', referrerLoadError);
      return;
    }

    const referrerBalance = normalizePoints(referrerUser?.points ?? 0);
    const nextReferrerBalance = Number((referrerBalance + 10).toFixed(4));

    const { error: referrerUpdateError } = await supabase
      .from('users')
      .update({ points: nextReferrerBalance })
      .eq('telegram_id', String(numericReferrerId));

    if (referrerUpdateError) {
      console.error('[Referral] Referrer reward update failed:', referrerUpdateError);
      return;
    }

    console.log('[Referral] Referrer reward added', {
      referrerId,
      referredId,
      rewardAmount: 10,
      nextReferrerBalance,
    });
  };

  const processReferralOnStartup = async (currentUserId: string, referrerId: string) => {
    if (!currentUserId || !referrerId || referrerId === currentUserId) {
      return;
    }

    const { data, error } = await supabase.rpc('process_referral', {
      p_new_user_id: Number(currentUserId),
      p_referrer_id: Number(referrerId),
    });

    if (error) {
      console.error('[Referral] RPC process_referral failed:', error);
      return;
    }

    console.log('[Referral] process_referral RPC:', data);
  };
  const holdingBalance = Number.isFinite(points * 0.75) ? Number((points * 0.75).toFixed(4)) : 0;
  const poolBalance = Number.isFinite(points * 0.25) ? Number((points * 0.25).toFixed(4)) : 0;
  const safeMinedThisSession = Number.isFinite(minedThisSession) ? Number(minedThisSession.toFixed(4)) : 0;

  const persistUserBalance = async (nextPoints: number, source: string, userId: string | null = null) => {
    if (typeof window === 'undefined') {
      return;
    }

    const webApp = window.Telegram?.WebApp;
    const tgUser = webApp?.initDataUnsafe?.user ?? null;
    const realTelegramId = tgUser?.id ? String(tgUser.id) : userId ?? (webApp ? null : '12345678');
    const username = tgUser?.username || tgUser?.first_name || 'Telegram User';
    const normalizedPoints = Number(Number(nextPoints).toFixed(4));

    if (!realTelegramId) {
      const warning = 'Please open this mini-app inside Telegram to save your balance.';
      setTelegramWarning(warning);
      console.warn('[Supabase]', source, 'missing real Telegram ID; skipping save');
      return;
    }

    const { data: currentUser, error: fetchError } = await supabase
      .from('users')
      .select('points')
      .eq('telegram_id', realTelegramId)
      .maybeSingle();

    if (fetchError && fetchError.code !== 'PGRST116') {
      console.error('[Supabase] fetch failed for', source, fetchError);
      return;
    }

    const safeCurrentPoints = Number.parseFloat(String(currentUser?.points ?? 0));
    const updatedTotalPoints = Number.isFinite(normalizedPoints) ? Number(normalizedPoints.toFixed(4)) : Number(safeCurrentPoints.toFixed(4));

    const { data, error } = await supabase
      .from('users')
      .update({
        username,
        points: updatedTotalPoints,
      })
      .eq('telegram_id', realTelegramId);

    console.log('[Supabase]', source, {
      realTelegramId,
      username,
      safeCurrentPoints,
      updatedTotalPoints,
      data,
      error,
    });

    if (error) {
      console.error('[Supabase] Save failed:', error);
      setTelegramWarning('Balance save failed. Please try again.');
    }
  };

  useEffect(() => {
    const currentUserId = telegramId ?? getTelegramContext().realUserId;

    if (!currentUserId) {
      if (lastLinkedWalletRef.current) {
        lastLinkedWalletRef.current = null;
        setWalletAddress(null);
      }
      return;
    }

    if (userFriendlyAddress) {
      if (lastLinkedWalletRef.current !== userFriendlyAddress) {
        lastLinkedWalletRef.current = userFriendlyAddress;
        setWalletAddress(userFriendlyAddress);

        supabase
          .from('users')
          .update({ wallet_address: userFriendlyAddress })
          .eq('telegram_id', currentUserId)
          .then(({ error }) => {
            if (error) {
              console.error('[TON Wallet] Failed to save linked wallet:', error);
              return;
            }

            setToastMessage('TON wallet connected and linked to your account.');
            setTimeout(() => setToastMessage(null), 2600);
          });
      }
      return;
    }

    if (lastLinkedWalletRef.current) {
      lastLinkedWalletRef.current = null;
      setWalletAddress(null);

      supabase
        .from('users')
        .update({ wallet_address: null })
        .eq('telegram_id', currentUserId)
        .then(({ error }) => {
          if (error) {
            console.error('[TON Wallet] Failed to clear wallet link:', error);
          }
        });
    }
  }, [telegramId, userFriendlyAddress]);

  const persistUserTaskStatus = async (taskId: string, payload: { completed: boolean; claimed: boolean; progress: number }) => {
    const currentUserId = telegramId ?? getTelegramContext().realUserId;
    if (!currentUserId) {
      console.warn('[Tasks] Missing Telegram ID while saving task status:', taskId);
      return;
    }

    const { error } = await supabase
      .from('user_tasks')
      .upsert(
        {
          telegram_id: Number(currentUserId),
          task_id: taskId,
          completed: payload.completed,
          claimed: payload.claimed,
          progress: payload.progress,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'telegram_id,task_id' }
      );

    if (error) {
      console.warn('[Tasks] Failed to save task status:', taskId, error);
    }
  };

  const handleWatchAdTask = async () => {
    const currentUserId = telegramId ?? getTelegramContext().realUserId;
    if (!currentUserId) {
      setTelegramWarning('Please open this mini-app inside Telegram to watch ads and earn rewards.');
      return;
    }

    if (adWatchCount >= 10 || isAdLoading) {
      return;
    }

    if (typeof (window as any).show_11862041 !== 'function') {
      alert('Ad SDK is loading, please try again in a few seconds.');
      return;
    }

    setIsAdLoading(true);

    try {
      (window as any).show_11862041();

      const nextCount = Math.min(adWatchCount + 1, 10);
      const reward = 5;
      const nextPoints = Number((points + reward).toFixed(4));

      setAdWatchCount(nextCount);
      setPoints(nextPoints);

      const { data, error } = await supabase.rpc('watch_ad_reward', {
        p_user_id: Number(currentUserId),
      });

      if (error) {
        console.error('Supabase Error:', error);
        alert('Error adding reward: ' + error.message);
        return;
      }

      console.log('watch_ad_reward success', data);
      alert('Success! 5 AGEN added to your balance.');

      await persistUserTaskStatus('watch_ad', {
        completed: nextCount >= 10,
        claimed: nextCount >= 10,
        progress: nextCount,
      });

      setTaskStatus((prev) => ({
        ...prev,
        watch_ad: {
          opened: true,
          completed: nextCount >= 10,
          claimed: nextCount >= 10,
        },
      }));

      setToastMessage(nextCount >= 10 ? 'Daily ad task complete!' : 'Ad reward added! +5 AGEN');
      setTimeout(() => setToastMessage(null), 2200);
      await persistUserBalance(nextPoints, 'task_watch_ad', currentUserId);
    } catch (err) {
      console.error('Ad Error:', err);

      try {
        const { data } = await supabase.rpc('watch_ad_reward', {
          p_user_id: Number(currentUserId),
        });

        if (data && data.new_balance !== undefined) {
          setPoints(Number(data.new_balance));
        }
      } catch (fallbackError) {
        console.error('Fallback reward failed:', fallbackError);
      }

      alert('You must watch the full ad to earn 5 AGEN.');
    } finally {
      setIsAdLoading(false);
    }
  };

  const handleChannelTaskAction = async (taskId: string) => {
    const currentUserId = telegramId ?? getTelegramContext().realUserId;
    if (!currentUserId) {
      setTelegramWarning('Please open this mini-app inside Telegram to claim channel rewards.');
      return;
    }

    const currentState = taskStatus[taskId] ?? { opened: false, completed: false, claimed: false };

    if (!currentState.opened) {
      window.open('https://t.me/AURA_AGENBOT', '_blank', 'noopener,noreferrer');
      setTaskStatus((prev) => ({
        ...prev,
        [taskId]: { ...prev[taskId], opened: true, completed: false, claimed: false },
      }));
      return;
    }

    if (currentState.claimed || currentState.completed) {
      return;
    }

    const reward = 1;
    const nextPoints = Number((points + reward).toFixed(4));
    setPoints(nextPoints);

    const taskRecord = { telegram_id: Number(currentUserId), task_id: taskId, completed: true, claimed: true, progress: 1, updated_at: new Date().toISOString() };
    const { error } = await supabase.from('user_tasks').upsert(taskRecord, { onConflict: 'telegram_id,task_id' });

    if (error) {
      console.warn('[Tasks] Failed to mark channel task complete:', error);
    }

    setTaskStatus((prev) => ({
      ...prev,
      [taskId]: { opened: true, completed: true, claimed: true },
    }));

    setToastMessage('Channel task rewarded!');
    setTimeout(() => setToastMessage(null), 2200);
    await persistUserBalance(nextPoints, 'task_channel_reward', currentUserId);
  };

  const handleMiningAction = async () => {
    const pendingReward = Number.isFinite(minedThisSession) ? Number(minedThisSession.toFixed(4)) : 0;

    if (pendingReward > 0) {
      const currentPoints = Number.parseFloat(String(points || 0));
      const newTotalPoints = Number((currentPoints + pendingReward).toFixed(4));
      const webApp = window.Telegram?.WebApp;
      const tgUser = webApp?.initDataUnsafe?.user ?? null;
      const activeTelegramId = tgUser?.id ? String(tgUser.id) : (webApp ? null : '12345678');

      if (!activeTelegramId) {
        const warning = 'Please open this mini-app inside Telegram to save your balance.';
        setTelegramWarning(warning);
        console.warn('[Supabase] CLAIM save skipped: missing Telegram user id');
        return;
      }

      const { data, error } = await supabase
        .from('users')
        .update({ points: newTotalPoints })
        .eq('telegram_id', activeTelegramId);

      console.log('[Supabase] CLAIM save', { activeTelegramId, currentPoints, pendingReward, newTotalPoints, data, error });

      if (error) {
        console.error('[Supabase] CLAIM update failed:', error);
        setTelegramWarning('Claim save failed. Please try again.');
        return;
      }

      setPoints(newTotalPoints);
      setMinedThisSession(0);
      setIsMining(true);
      miningLastUpdatedRef.current = Date.now();
      return;
    }

    if (!isMining) {
      setMinedThisSession(0);
      setIsMining(true);
      miningLastUpdatedRef.current = Date.now();
    }
  };

  const handleSpeedBoost = () => {
    if (speedBoostSecondsLeft > 0) {
      setToastMessage('Speed boost already active.');
      window.setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    if (typeof window !== 'undefined' && typeof window.show_11862041 === 'function') {
      try {
        window.show_11862041();
      } catch (error) {
        console.warn('[Monetag] Rewarded ad trigger failed:', error);
      }
    }

    setSpeedBoostSecondsLeft(60);
    setToastMessage('2x speed boost activated for 60 seconds.');
    window.setTimeout(() => setToastMessage(null), 2200);
  };

  const handleWatchAd = async () => {
    const normalizedBonus = Number.isFinite(bonusMinutes) ? bonusMinutes : 0;

    if (!isMining) {
      setMinedThisSession(0);
      setIsMining(true);
      miningLastUpdatedRef.current = Date.now();
    }

    const adReward = 0.05;
    const nextPoints = Number((points + adReward).toFixed(4));
    const webApp = window.Telegram?.WebApp;
    const tgUser = webApp?.initDataUnsafe?.user ?? null;
    const userId = tgUser?.id ? String(tgUser.id) : (webApp ? null : '12345678');

    setPoints(nextPoints);
    setBonusMinutes(normalizedBonus + 5);
    await persistUserBalance(nextPoints, 'ad_bonus', userId);
  };

  const handleMinerUpgrade = async (level: number) => {
    const target = Number(level);
    if (target <= currentLevel) {
      setCurrentLevel(target);
      return;
    }

    const required = minerLevels.find((entry) => entry.level === target)?.price ?? 0;
    if (required > points) {
      setToastMessage(`Need ${required} tokens to unlock Level ${target}.`);
      window.setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    const nextPoints = Number((points - required).toFixed(4));
    setPoints(nextPoints);
    setCurrentLevel(target);
    setToastMessage(`Level ${target} activated.`);
    window.setTimeout(() => setToastMessage(null), 2200);

    const userId = telegramId ?? getTelegramContext().realUserId;
    await persistUserBalance(nextPoints, 'miner_upgrade', userId);
  };

  const handleInviteFriend = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join AURA GEN and get 10 free AGEN tokens!')}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (error) {
      console.error('Unable to copy referral link:', error);
    }
  };

  const handleClaimReferralRewards = async () => {
    const currentUserId = telegramId ?? getTelegramContext().realUserId;
    if (!currentUserId) {
      setTelegramWarning('Please open this mini-app inside Telegram to claim referral rewards.');
      return;
    }

    if (claimingRewards || referralStats.unclaimedRewards <= 0) {
      return;
    }

    setClaimingRewards(true);
    setTelegramWarning(null);

    const { data, error } = await supabase.rpc('claim_referral_rewards', {
      p_user_id: Number(currentUserId),
    });

    if (error) {
      console.error('[Referral] claim_referral_rewards RPC failed:', error);
      setTelegramWarning('Referral reward claim failed. Please try again.');
      setClaimingRewards(false);
      return;
    }

    const claimedAmount = Number(data ?? 0);

    if (claimedAmount > 0) {
      setReferralStats((prev) => ({ ...prev, unclaimedRewards: 0, pending: [] }));
      const { data: userRow, error: userError } = await supabase
        .from('users')
        .select('points')
        .eq('telegram_id', currentUserId)
        .maybeSingle();

      if (userError && userError.code !== 'PGRST116') {
        console.error('[Referral] Failed to reload points after claim:', userError);
      }

      const refreshedPoints = Number(userRow?.points ?? points);
      setPoints(Number(refreshedPoints.toFixed(4)));
      setToastMessage('Rewards claimed successfully!');
      setTimeout(() => setToastMessage(null), 2200);
    }

    await syncReferralStats(currentUserId);
    setClaimingRewards(false);
  };

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const webApp = window.Telegram?.WebApp;
    if (webApp?.ready) {
      webApp.ready();
    }

    if (webApp?.expand) {
      webApp.expand();
    }

    const { tgUser, realUserId } = getTelegramContext();
    const realUsername = tgUser?.username || tgUser?.first_name || 'Telegram User';
    const referrerId = getReferrerId();

    setTelegramUser(tgUser ?? null);
    setTelegramId(realUserId);

    if (!realUserId) {
      setTelegramWarning('Please open this mini-app inside Telegram to save your balance.');
      setReferralLink('https://t.me/AURA_AGENBOT?start=ref_12345678');
      setPoints(0);
      return;
    }

    setTelegramWarning(null);

    const nextLink = `https://t.me/AURA_AGENBOT?start=ref_${realUserId}`;
    setReferralLink(nextLink);

    const loadUserPoints = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('*')
        .eq('telegram_id', realUserId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user points:', error);
        return;
      }

      if (!data) {
        if (referrerId && referrerId !== realUserId) {
          await processReferralOnStartup(realUserId, referrerId);
          await awardReferralBonus(referrerId, realUserId);
        }

        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              telegram_id: realUserId,
              username: realUsername,
              points: 0,
              referred_by: referrerId ?? null,
            },
          ]);

        if (insertError) {
          console.error('Error inserting new user:', insertError);
          return;
        }

        console.log('[Supabase] New user created with zero balance', {
          realUserId,
          realUsername,
          referrerId,
        });

        setPoints(0);
      } else {
        const savedPoints = Number(data.points ?? 0);
        console.log('[Supabase] Loaded saved user balance', { realUserId, realUsername, savedPoints });
        setPoints(savedPoints);

        if (!data.referred_by && referrerId) {
          await supabase
            .from('users')
            .update({ referred_by: referrerId })
            .eq('telegram_id', realUserId);
        }
      }

      await syncReferralStats(realUserId);
    };

    loadUserPoints();
  }, []);

  useEffect(() => {
    if (speedBoostSecondsLeft <= 0) {
      return;
    }

    const boostTimer = window.setInterval(() => {
      setSpeedBoostSecondsLeft((prev) => {
        if (prev <= 1) {
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => window.clearInterval(boostTimer);
  }, [speedBoostSecondsLeft]);

  useEffect(() => {
    if (!isMining) {
      return;
    }

    if (!miningLastUpdatedRef.current) {
      miningLastUpdatedRef.current = Date.now();
    }

    const miningInterval = window.setInterval(() => {
      const now = Date.now();
      const lastUpdated = miningLastUpdatedRef.current ?? now;
      const elapsedSeconds = Math.max((now - lastUpdated) / 1000, 0);

      if (elapsedSeconds > 0) {
        const earnedFromElapsedTime = Number((elapsedSeconds * effectiveMiningRate).toFixed(4));
        setMinedThisSession((prevValue) => Number((prevValue + earnedFromElapsedTime).toFixed(4)));
      }

      miningLastUpdatedRef.current = now;
    }, 1000);

    return () => window.clearInterval(miningInterval);
  }, [effectiveMiningRate, isMining]);

  const navItems: Array<{ key: 'home' | 'tasks' | 'miners' | 'friends' | 'profile'; label: string; icon: JSX.Element }> = [
    {
      key: 'home',
      label: 'Home',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 0 1 0-17zm0 2a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zm-.8 2.7h1.6v4.7h-1.6zm0 6.6h1.6v1.6h-1.6z" />
        </svg>
      ),
    },
    {
      key: 'tasks',
      label: 'Tasks',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M7 3.5A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V6A2.5 2.5 0 0 0 17 3.5zm0 2h10a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5zm2 2.5h6v2H9zm0 4h6v2H9zm0 4h4v2H9z" />
        </svg>
      ),
    },
    {
      key: 'miners',
      label: 'Miners',
      icon: <HollowGoldBrandLogo size={18} className="drop-shadow-[0_0_12px_rgba(229,193,88,0.7)]" />,
    },
    {
      key: 'friends',
      label: 'Friends',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M16 11a4 4 0 1 0-4-4a4 4 0 0 0 4 4zm-8 1a3 3 0 1 0-3-3a3 3 0 0 0 3 3zm8 1.5c2.7 0 5 1.7 5 3.8V18H11v-1.7c0-2.1 2.3-3.8 5-3.8zm-8-1.5A5 5 0 0 0 3 17.5V18h8v-.5A5 5 0 0 0 8 12.5z" />
        </svg>
      ),
    },
    {
      key: 'profile',
      label: 'Profile',
      icon: (
        <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
          <path d="M12 12.5A3.5 3.5 0 1 0 12 5.5a3.5 3.5 0 0 0 0 7zm-6 7a6 6 0 0 1 12 0v.5H6zm14-8a3 3 0 1 0 3 3a3 3 0 0 0-3-3zm-2 10.5V18h4v1.5z" />
        </svg>
      ),
    },
  ];

  const renderHomeView = () => (
    <div className="relative z-10 w-full text-white" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: 'calc(100vh - 70px)' }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(229,193,88,0.2),_transparent_38%),radial-gradient(circle_at_bottom,_rgba(0,168,255,0.12),_transparent_42%)]" />

      {telegramWarning && (
        <div className="fixed inset-x-3 top-3 z-20 rounded-2xl border border-[#f7d780]/40 bg-[#171a20]/95 px-4 py-3 text-center text-xs font-bold text-[#f7d780] shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          {telegramWarning}
        </div>
      )}

      {toastMessage && (
        <div className="fixed inset-x-3 top-16 z-20 rounded-2xl border border-[#8ef0b0]/40 bg-[#11251a]/95 px-4 py-3 text-center text-xs font-bold text-[#9ff7c3] shadow-[0_12px_30px_rgba(0,0,0,0.25)] backdrop-blur-sm">
          {toastMessage}
        </div>
      )}

      <div className="fixed top-0 left-0 z-10 w-full px-4 pt-6 text-white">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 rounded-full border border-[#e5c158]/40 bg-[#111317]/80 px-2 py-1.5 shadow-[0_0_20px_rgba(229,193,88,0.2)] backdrop-blur-sm">
            <HollowGoldBrandLogo size={18} className="drop-shadow-[0_0_12px_rgba(229,193,88,0.7)]" />
            <span className="text-[10px] font-black uppercase tracking-[0.22em] text-[#f3d37c]">Lvl 1 • IDLE</span>
          </div>
          <div className="flex items-center gap-2">
            {walletAddress && (
              <span className="rounded-full border border-[#8ef0b0]/40 bg-[#0f1c17]/80 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9ff7c3]">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            )}
            <TonConnectButton />
          </div>
        </div>
      </div>

      <div className="relative z-10 flex flex-1 flex-col justify-center pb-6 pt-20">
        <div className="mx-auto w-full max-w-md">
          <div className="grid grid-cols-2 gap-3">
            <div className="rounded-[22px] border border-[#e5c158]/30 bg-[#101317]/80 p-3 shadow-[0_0_22px_rgba(229,193,88,0.08)] backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#d9c27a]">Holding Wallet</div>
              <div className="mt-3 text-lg font-black text-[#f9e4a4]">{holdingBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
            </div>
            <div className="rounded-[22px] border border-[#e5c158]/30 bg-[#101317]/80 p-3 shadow-[0_0_22px_rgba(229,193,88,0.08)] backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#d9c27a]">Pool Wallet</div>
              <div className="mt-3 text-lg font-black text-[#f9e4a4]">{poolBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-[#e5c158]/30 bg-[#111317]/80 px-4 py-5 text-center shadow-[0_0_26px_rgba(229,193,88,0.12)] backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-[0.26em] text-[#c9b16a]">Live Counter</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#00ff88] drop-shadow-[0_0_16px_rgba(0,255,136,0.7)]">
              {`+${safeMinedThisSession.toFixed(4)} AGEN`}
            </div>
            <div className="mt-2 flex items-center justify-center gap-2 text-[10px] uppercase tracking-[0.22em] text-[#9ad7be]">
              <span className="inline-block h-2 w-2 rounded-full bg-[#00ff88] shadow-[0_0_12px_rgba(0,255,136,0.8)]"></span>
              {isMining ? 'PASSIVE MINING (LIVE)' : 'READY TO MINE'}
            </div>
          </div>

          <div className="mt-8 flex items-center justify-center">
            <div className="relative flex h-56 w-56 items-center justify-center rounded-full border border-[#e5c158]/20 bg-[radial-gradient(circle,_rgba(255,208,90,0.16),_rgba(0,0,0,0)_65%)] shadow-[0_0_40px_rgba(229,193,88,0.12)]">
              <button
                type="button"
                aria-label="Activate 2x mining speed boost"
                className="absolute right-2 top-1 z-10 flex h-14 w-14 flex-col items-center justify-center rounded-full border border-[#f7d780]/40 bg-[linear-gradient(135deg,#f7d57a,#d4af37_35%,#f3d784_100%)] text-[#16130b] shadow-[0_10px_26px_rgba(212,175,55,0.35)]"
                onClick={handleSpeedBoost}
              >
                <span className="text-[11px] font-black">⚡</span>
                <span className="text-[9px] font-black leading-none">{speedBoostSecondsLeft > 0 ? `${speedBoostSecondsLeft}s` : '2x'}</span>
              </button>
              <div className="absolute inset-5 rounded-full border border-[#e5c158]/15"></div>
              <HollowGoldBrandLogo size={170} className="drop-shadow-[0_0_24px_rgba(229,193,88,0.7)]" />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              className="w-full rounded-[20px] bg-[linear-gradient(135deg,#f7d57a,#d4af37_35%,#f3d784_100%)] px-5 py-4 text-lg font-black uppercase tracking-[0.18em] text-[#16130b] shadow-[0_18px_35px_rgba(212,175,55,0.35)] transition-transform active:scale-[0.99]"
              onClick={handleMiningAction}
            >
              {safeMinedThisSession > 0 ? 'CLAIM' : isMining ? 'PASSIVE MINING' : 'START'}
            </button>
            <button
              className="w-full rounded-[18px] border border-[#e5c158]/25 bg-[#171a1d] px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#f8d77a] shadow-[0_0_18px_rgba(229,193,88,0.06)]"
              onClick={handleWatchAd}
            >
              Watch Ad (+5 Mins)
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderMinersView = () => (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-xl flex-col px-4 pb-28 pt-6 text-white">
      <div className="mb-5 flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f4d889]">Miners</p>
          <h1 className="mt-2 text-3xl font-black text-[#fff8e1]">Upgrade Store</h1>
        </div>
        <button
          className="rounded-full border border-[#f7d780]/30 bg-[#f4c75b]/10 px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] text-[#f9e6ad]"
          onClick={handleSpeedBoost}
        >
          {speedBoostSecondsLeft > 0 ? `${speedBoostSecondsLeft}s` : '2x Boost'}
        </button>
      </div>

      <div className="rounded-[30px] border border-[#f7d780]/20 bg-[#181b21]/85 p-4 shadow-[0_18px_32px_rgba(0,0,0,0.2)] backdrop-blur-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Current Level</p>
            <h2 className="mt-2 text-3xl font-black text-[#fff3c4]">Lv. {currentLevel}</h2>
          </div>
          <div className="rounded-full border border-[#8ef0b0]/35 bg-[#0d1c17]/80 px-2.5 py-1.5 text-[9px] font-black uppercase tracking-[0.18em] text-[#a8ffd0]">
            {currentLevel >= 8 ? 'Peak' : 'Mining'}
          </div>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-[#11161b] p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Today&apos;s P&amp;L</div>
            <div className="mt-2 text-lg font-black text-[#a9f0b7]">+${(Math.max(currentLevel * 0.8, 2.4)).toFixed(1)}</div>
          </div>
          <div className="rounded-2xl bg-[#11161b] p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Mining Rate</div>
            <div className="mt-2 text-lg font-black text-[#f9e6ad]">{(effectiveMiningRate * 10000).toFixed(2)} TH/s</div>
          </div>
        </div>

        <div className="mt-4 rounded-2xl bg-[#101419] p-3">
          <div className="mb-2 flex items-center justify-between text-[10px] uppercase tracking-[0.18em] text-[#d7bf73]">
            <span>Performance</span>
            <span>{Math.min((currentLevel / 36) * 100, 100).toFixed(0)}%</span>
          </div>
          <div className="h-2.5 w-full overflow-hidden rounded-full bg-[#1f252d]">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#f7d57a,#d4af37_35%,#f3d784_100%)]" style={{ width: `${Math.min((currentLevel / 36) * 100, 100)}%` }} />
          </div>
        </div>

        {speedBoostSecondsLeft > 0 && (
          <div className="mt-4 rounded-2xl border border-[#5ee7a9]/30 bg-[#0f1d1a]/80 px-3 py-2 text-xs font-bold text-[#9ff7c3]">
            2x Speed Boost active: {speedBoostSecondsLeft}s remaining
          </div>
        )}
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        {minerLevels.map((entry) => {
          const isUnlocked = currentLevel >= entry.level;
          const isAffordable = points >= entry.price;
          const statusText = isUnlocked
            ? 'ACTIVE'
            : isAffordable
              ? 'NEED ' + entry.price + ' tokens to unlock'
              : 'LOCKED';

          return (
            <div key={entry.level} className={`rounded-[26px] border p-3 shadow-[0_10px_24px_rgba(0,0,0,0.18)] ${isUnlocked ? 'border-[#f7d780]/40 bg-[#1b1c1f]' : 'border-[#f7d780]/15 bg-[#14181d]'}`}>
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Lvl</p>
                  <h3 className="mt-1 text-xl font-black text-white">{entry.level}</h3>
                </div>
                <span className="rounded-full bg-[#f4c75b]/10 px-2 py-1 text-[9px] font-black uppercase tracking-[0.18em] text-[#f8d77a]">
                  {entry.speed}
                </span>
              </div>

              <div className="mt-4 space-y-2 text-xs text-white/75">
                <div className="flex items-center justify-between">
                  <span>Price</span>
                  <span className="font-bold text-[#f9e6ad]">{entry.price} tokens</span>
                </div>
              </div>

              <button
                className={`mt-4 w-full rounded-full px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] transition-all ${
                  isUnlocked
                    ? 'bg-[#1b3a2d] text-[#9ff7c3]'
                    : isAffordable
                      ? 'bg-[linear-gradient(135deg,#f7d57a,#d4af37_35%,#f3d784_100%)] text-[#16130b]'
                      : 'bg-[#1d2128] text-[#d8dbe0]'
                }`}
                onClick={() => void handleMinerUpgrade(entry.level)}
                disabled={!isAffordable && !isUnlocked}
              >
                {statusText}
              </button>
            </div>
          );
        })}
      </div>
    </div>
  );

  const tasks = [
    {
      id: 'watch_ad',
      title: 'Watch Ad & Earn',
      reward: '+5 AGEN',
      icon: '🎬',
      type: 'ad',
      max_daily: 10,
    },
    {
      id: 'join_channel_1',
      title: 'Join Official Telegram Channel',
      reward: '+1 AGEN',
      icon: '📢',
      link: 'https://t.me/AURA_AGENBOT',
      type: 'social',
    },
  ];

  const renderTasksView = () => (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-xl flex-col px-4 pb-28 pt-6 text-white">
      <div className="mb-5 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f4d889]">Task Board</p>
          <h1 className="mt-2 text-3xl font-black text-[#fff8e1]">Tasks</h1>
        </div>
      </div>

      <div className="space-y-4">
        {tasks.map((task) => {
          const status = taskStatus[task.id] ?? { opened: false, completed: false, claimed: false };
          const isCompleted = task.type === 'ad' ? adWatchCount >= (task.max_daily ?? 10) : status.claimed || status.completed;
          const buttonLabel = task.type === 'ad'
            ? isCompleted
              ? 'Completed'
              : 'Watch'
            : status.claimed || status.completed
              ? 'Completed'
              : status.opened
                ? 'Claim'
                : 'Go';

          return (
            <div key={task.id} className="rounded-[28px] border border-[#f7d780]/20 bg-[#181b21]/85 p-4 shadow-[0_18px_34px_rgba(0,0,0,0.2)] backdrop-blur-sm">
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-[#f4c75b]/15 text-2xl shadow-[0_0_16px_rgba(244,199,91,0.25)]">
                    {task.icon}
                  </div>
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#f8d77a]">Mission</p>
                    <h2 className="mt-2 text-lg font-bold text-white">{task.title}</h2>
                    {task.type === 'ad' && (
                      <p className="mt-2 text-xs text-white/70">Watched: {adWatchCount}/{task.max_daily}</p>
                    )}
                  </div>
                </div>
                <span className="rounded-full bg-[#f4c75b]/15 px-2.5 py-1 text-xs font-bold text-[#f8d77a]">{task.reward}</span>
              </div>

              <div className="mt-4 flex items-center justify-end">
                <button
                  className={`rounded-full px-4 py-2 text-xs font-black uppercase tracking-[0.16em] transition-all ${
                    isCompleted || (task.type === 'ad' && isAdLoading)
                      ? 'bg-[#1d2128] text-[#d8dbe0]'
                      : 'bg-[linear-gradient(135deg,#f7d57a,#d4af37_35%,#f3d784_100%)] text-[#16130b]'
                  }`}
                  onClick={() => {
                    if (task.type === 'ad') {
                      void handleWatchAdTask();
                    } else {
                      void handleChannelTaskAction(task.id);
                    }
                  }}
                  disabled={isCompleted || (task.type === 'ad' && isAdLoading)}
                >
                  {task.type === 'ad' && isAdLoading ? 'Loading...' : buttonLabel}
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  const renderFriendsView = () => (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-xl flex-col px-4 pb-28 pt-6 text-[#171712]">
      <div className="mb-5 rounded-[28px] bg-[#f7cc5a] p-5 shadow-[0_12px_30px_rgba(247,191,74,0.3)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#442d03]">Referral Program</p>
        <h1 className="mt-2 text-3xl font-black text-[#1b1412]">AGEN COIN</h1>
        <div className="mt-4 rounded-2xl bg-[#fff5d5] p-4 text-center text-base font-semibold text-[#2f2b21]">
          Get 10 AGEN coins for each friend invited!
        </div>
      </div>

      <div className="rounded-[28px] border border-[#f7d780]/20 bg-[#171a20] p-4 text-white shadow-[0_20px_40px_rgba(0,0,0,0.25)]">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#f8d77a]">Your Invite Link</p>
        <div className="mt-3 flex gap-2">
          <input
            readOnly
            value={referralLink}
            className="min-w-0 flex-1 rounded-2xl border border-[#f7d780]/20 bg-white/5 px-3 py-3 text-xs text-white/80 outline-none"
          />
          <button
            className="rounded-full bg-[#fff3be] px-4 py-3 text-sm font-bold text-[#1f2530]"
            onClick={handleCopyLink}
          >
            {copied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>

        <div className="mt-4 flex gap-2">
          <button
            className="flex-1 rounded-full bg-[#1f2530] px-4 py-3 text-sm font-bold text-white"
            onClick={handleInviteFriend}
          >
            Invite a Friend
          </button>
        </div>

        <div className="mt-5 grid grid-cols-2 gap-3">
          <div className="rounded-2xl bg-[#1d2128] p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f8d77a]">Total Referrals</p>
            <div className="mt-2 text-2xl font-black text-white">{referralStats.totalReferrals}</div>
          </div>
          <div className="rounded-2xl bg-[#1d2128] p-3 text-center">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f8d77a]">Unclaimed Rewards</p>
            <div className="mt-2 text-2xl font-black text-[#f9e6ad]">{referralStats.unclaimedRewards.toLocaleString()} AGEN</div>
          </div>
        </div>

        <button
          className="mt-4 w-full rounded-full bg-[linear-gradient(135deg,#f7d57a,#d4af37_35%,#f3d784_100%)] px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#16130b] disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleClaimReferralRewards}
          disabled={claimingRewards || referralStats.unclaimedRewards <= 0}
        >
          {claimingRewards ? 'Claiming...' : 'Claim Rewards'}
        </button>
      </div>
    </div>
  );

  const renderProfileView = () => (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-xl flex-col gap-4 overflow-y-auto px-4 pb-28 pt-6 text-white">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f4d889]">Profile</p>
          <h1 className="mt-2 text-3xl font-black text-[#fff8e1]">Account</h1>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#f7d780]/20 bg-[#181b21]/80 p-4 shadow-[0_18px_32px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">User ID</p>
            <h2 className="mt-2 text-xl font-bold text-[#fff6d3]">{telegramUser?.username || telegramUser?.first_name || 'Telegram User'}</h2>
          </div>
          <div className="rounded-full bg-[#f4c75b]/15 px-3 py-2 text-xs font-bold text-[#f7d780]">Online</div>
        </div>
        <div className="mt-4 rounded-2xl bg-[#13161b] p-3 text-sm text-white/80">
          <span className="text-white/50">Telegram ID:</span> {telegramId ?? 'N/A'}
        </div>
        <div className="mt-4 rounded-2xl bg-[#13161b] p-3 text-sm text-white/80">
          <span className="text-white/50">TON Wallet:</span> {walletAddress ?? 'Not connected'}
        </div>
        <div className="mt-4 flex justify-center">
          <TonConnectButton />
        </div>
      </div>

      <div className="rounded-[24px] border border-[#f7d780]/20 bg-[#181b21]/80 p-4 shadow-[0_18px_32px_rgba(0,0,0,0.2)]">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Total AGEN Assets</p>
        <div className="mt-3 flex items-center gap-2">
          <HollowGoldBrandLogo size={28} className="drop-shadow-[0_0_12px_rgba(229,193,88,0.8)]" />
          <span className="text-3xl font-black text-[#f9e6ad]">{points.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
          <div className="rounded-2xl bg-[#262b33] p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Holding</div>
            <div className="mt-2 font-bold text-[#f9e6ad]">{holdingBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
          </div>
          <div className="rounded-2xl bg-[#262b33] p-3">
            <div className="text-[10px] uppercase tracking-[0.18em] text-white/55">Pool</div>
            <div className="mt-2 font-bold text-[#f9e6ad]">{poolBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
          </div>
        </div>
      </div>

      <div className="rounded-[24px] border border-[#f7d780]/20 bg-[#181b21]/80 p-4 shadow-[0_18px_32px_rgba(0,0,0,0.2)]">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Sound Effects</p>
            <h3 className="mt-2 text-lg font-bold text-white">Mining Audio</h3>
          </div>
          <button className="relative inline-flex h-7 w-12 items-center rounded-full bg-[#f4c75b]/30 p-1 transition-colors">
            <span className="h-5 w-5 rounded-full bg-[#f7d780] shadow-md transition-transform translate-x-5"></span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button disabled className="rounded-[24px] border border-[#f7d780]/20 bg-[#1d2128]/80 p-4 text-left shadow-[0_16px_30px_rgba(0,0,0,0.15)] opacity-75">
          <div className="flex items-center justify-between gap-2">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Controls</p>
            <span className="rounded-full border border-[#f7d780]/25 bg-[#f4c75b]/10 px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#f8d77a]">Lock</span>
          </div>
          <h3 className="mt-3 flex items-center gap-2 text-lg font-bold text-white"><span aria-hidden="true">🔒</span> Withdraw</h3>
          <p className="mt-2 text-xs text-white/60">Coming Soon</p>
        </button>
        <button className="rounded-[24px] border border-[#f7d780]/20 bg-[#1d2128] p-4 text-left shadow-[0_16px_30px_rgba(0,0,0,0.15)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Controls</p>
          <h3 className="mt-3 text-lg font-bold text-white">History</h3>
          <p className="mt-2 text-xs text-white/60">Recent activity</p>
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0a0b0e] text-white font-medium" style={{ touchAction: 'auto' }}>
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(229,193,88,0.18),_transparent_35%),radial-gradient(circle_at_bottom,_rgba(0,168,255,0.1),_transparent_40%)]" />

      <div className="relative z-10 w-full">
        {activeTab === 'home' && renderHomeView()}
        {activeTab === 'tasks' && renderTasksView()}
        {activeTab === 'miners' && renderMinersView()}
        {activeTab === 'friends' && renderFriendsView()}
        {activeTab === 'profile' && renderProfileView()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-[#e5c158]/15 bg-[#101317]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur-md">
        <div className="grid grid-cols-5 gap-1 text-center text-[10px] font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all ${
                  isActive ? 'bg-[#f5d57c]/10 text-[#f7d780] shadow-[0_0_16px_rgba(229,193,88,0.12)]' : 'text-white/70'
                } ${item.key === 'miners' ? 'mx-1' : ''}`}
                onClick={() => setActiveTab(item.key)}
              >
                {item.icon}
                <span>{item.label}</span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default App;
