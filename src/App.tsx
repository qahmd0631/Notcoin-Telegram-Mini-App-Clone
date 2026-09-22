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
    viewBox="0 0 220 220"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-label="AGEN logo"
    role="img"
    style={{ filter: 'drop-shadow(0 0 12px rgba(247, 206, 101, 0.8)) drop-shadow(0 0 28px rgba(191, 126, 14, 0.7))' }}
  >
    <defs>
      <linearGradient id="agenCoinGold" x1="30" y1="24" x2="190" y2="196" gradientUnits="userSpaceOnUse">
        <stop offset="0" stopColor="#fff7d0" />
        <stop offset="0.14" stopColor="#fce99a" />
        <stop offset="0.32" stopColor="#f5c74d" />
        <stop offset="0.56" stopColor="#d59a1d" />
        <stop offset="0.8" stopColor="#b56d0b" />
        <stop offset="1" stopColor="#fff0ad" />
      </linearGradient>
      <filter id="agenShadow" x="-40%" y="-40%" width="180%" height="180%">
        <feDropShadow dx="0" dy="3" stdDeviation="3.5" floodColor="#8f5d0d" floodOpacity="0.35" />
        <feDropShadow dx="0" dy="0" stdDeviation="4.5" floodColor="#f9d96b" floodOpacity="0.9" />
      </filter>
    </defs>

    <g filter="url(#agenShadow)">
      <circle cx="110" cy="110" r="94" fill="url(#agenCoinGold)" />
      <circle cx="110" cy="110" r="82" fill="#fff3bf" fillOpacity="0.12" stroke="#f9efbf" strokeOpacity="0.75" strokeWidth="2.2" />
      <circle cx="110" cy="110" r="72" stroke="#8b5d11" strokeOpacity="0.8" strokeWidth="4" fill="none" />
      <circle cx="110" cy="110" r="60" stroke="#f8d77b" strokeOpacity="0.52" strokeWidth="2" fill="none" />
      <path d="M56 76C70 51 88 38 110 38C132 38 150 51 164 76" stroke="url(#agenCoinGold)" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M56 144C70 169 88 182 110 182C132 182 150 169 164 144" stroke="url(#agenCoinGold)" strokeWidth="9" strokeLinecap="round" fill="none" />
      <path d="M110 56L150 154H70L110 56Z" fill="#1f1c1a" opacity="0.95" />
      <path d="M110 76L136 144H84L110 76Z" fill="#2a2a29" opacity="0.8" />
      <path d="M102 98H118L128 128H92L102 98Z" fill="#f7d77d" opacity="0.18" />
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
  const [adCount, setAdCount] = useState(0);
  const [isAdLocked, setIsAdLocked] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [balance, setBalance] = useState(0);
  const [miningRate, setMiningRate] = useState(0.0001);
  const [pendingMiningRewards, setPendingMiningRewards] = useState(0);
  const [taskStatus, setTaskStatus] = useState<Record<string, { opened: boolean; completed: boolean; claimed: boolean }>>({
    watch_ad: { opened: false, completed: false, claimed: false },
    join_channel_1: { opened: false, completed: false, claimed: false },
  });
  const userFriendlyAddress = useTonAddress();
  const miningLastUpdatedRef = useRef<number | null>(null);
  const lastLinkedWalletRef = useRef<string | null>(null);
  const lastClaimTimeRef = useRef<string | null>(null);

  const getUtcDateKey = (value = new Date()) => value.toISOString().slice(0, 10);

  const computeMiningDeltaReward = (lastClaimRaw: string | null | undefined, rate: number) => {
    if (!lastClaimRaw) {
      return 0;
    }

    const lastClaimMs = new Date(lastClaimRaw).getTime();
    if (!Number.isFinite(lastClaimMs)) {
      return 0;
    }

    const elapsedSeconds = Math.max(0, (Date.now() - lastClaimMs) / 1000);
    return Number((elapsedSeconds * rate).toFixed(4));
  };

  const syncAppState = async (userId: string | null) => {
    if (!userId) {
      setAdCount(0);
      setAdWatchCount(0);
      setIsAdLocked(false);
      setBalance(0);
      setMiningRate(0.0001);
      setPendingMiningRewards(0);
      return;
    }

    const { data, error } = await supabase.rpc('get_master_app_state', {
      p_user_id: String(userId),
    });

    if (!data || error) {
      console.warn('[Master State] Failed to hydrate app state:', error ?? 'no data');
      await fetchInitialAdCount(userId);
      await syncMiningState(userId);
      return;
    }

    const nextAdCount = Number(data.ad_count ?? data.daily_count ?? 0);
    const nextLocked = Boolean(data.is_ad_locked ?? nextAdCount >= 10);
    const nextBalance = Number(data.balance ?? data.points ?? 0);
    const nextMiningRate = Number(data.mining_rate ?? 0.0001);
    const nextLastClaimTime = (data.last_claim_time ?? data.last_active_time ?? data.last_claimed_at ?? null) as string | null;
    const nextPendingRewards = Number(data.pending_rewards ?? computeMiningDeltaReward(nextLastClaimTime, nextMiningRate));

    lastClaimTimeRef.current = nextLastClaimTime;
    setAdCount(nextAdCount);
    setAdWatchCount(nextAdCount);
    setIsAdLocked(nextLocked);
    setBalance(nextBalance);
    setPoints(nextBalance);
    setMiningRate(nextMiningRate);
    setPendingMiningRewards(nextPendingRewards);
    setMinedThisSession(nextPendingRewards);
  };

  const initAppState = async (userId: string | null) => {
    if (!userId) {
      return;
    }

    const { data, error } = await supabase.rpc('get_master_app_state', {
      p_user_id: String(userId),
    });

    if (!data || error) {
      console.warn('[Root State] get_master_app_state failed:', error ?? 'no data');
      await syncDailyAdCount(userId);
      await syncMiningState(userId);
      return;
    }

    const nextAdCount = Number(data.ad_count ?? data.daily_count ?? 0);
    const nextLocked = Boolean(data.is_ad_locked ?? nextAdCount >= 10);
    const nextBalance = Number(data.balance ?? data.points ?? 0);
    const nextMiningRate = Number(data.mining_rate ?? 0.0001);
    const nextLastClaimTime = (data.last_claim_time ?? data.last_active_time ?? data.last_claimed_at ?? null) as string | null;
    const nextPendingRewards = Number(data.pending_rewards ?? computeMiningDeltaReward(nextLastClaimTime, nextMiningRate));

    lastClaimTimeRef.current = nextLastClaimTime;
    setAdCount(nextAdCount);
    setAdWatchCount(nextAdCount);
    setIsAdLocked(nextLocked);
    setBalance(nextBalance);
    setPoints(nextBalance);
    setMiningRate(nextMiningRate);
    setPendingMiningRewards(nextPendingRewards);
    setMinedThisSession(nextPendingRewards);
  };

  const isAdLimitLocked = (count: number, lastDate: string | null) => {
    if (count < 10 || !lastDate) {
      return false;
    }

    const todayKey = getUtcDateKey();
    if (lastDate === todayKey) {
      return true;
    }

    const lastDateMs = Date.parse(`${lastDate}T00:00:00.000Z`);
    const nowMs = Date.now();
    return Number.isFinite(lastDateMs) && nowMs - lastDateMs < 24 * 60 * 60 * 1000;
  };

  const fetchInitialAdCount = async (userId: string | null) => {
    if (!userId) {
      setAdWatchCount(0);
      setIsAdLocked(false);
      return 0;
    }

    const { data, error } = await supabase
      .from('user_ad_logs')
      .select('user_id, daily_count, last_ad_date, last_day_utc, updated_at')
      .eq('user_id', String(userId))
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[Ad Count] Failed to load saved ad count:', error);
      setAdWatchCount(0);
      setIsAdLocked(false);
      return 0;
    }

    if (!data) {
      setAdWatchCount(0);
      setIsAdLocked(false);
      return 0;
    }

    const savedCount = Number(data.daily_count ?? 0);
    const savedDate = (data.last_ad_date ?? data.last_day_utc ?? null) as string | null;
    const locked = isAdLimitLocked(savedCount, savedDate);
    const nextCount = locked ? Math.min(savedCount, 10) : 0;

    setAdWatchCount(nextCount);
    setIsAdLocked(locked);
    return nextCount;
  };

  const syncMiningState = async (userId: string | null) => {
    if (!userId) {
      return;
    }

    try {
      const { data, error } = await supabase.rpc('sync_mining_state', {
        p_user_id: String(userId),
      });

      if (error) {
        console.warn('[Mining Sync] Failed to sync mining state:', error);
        return;
      }

      const lastClaimRaw = data?.last_claim_time ?? data?.last_claimed_at ?? data?.last_claimed ?? null;
      const miningRateValue = Number(data?.mining_rate ?? data?.rate ?? 0.0001);
      const lastClaimMs = lastClaimRaw ? new Date(lastClaimRaw).getTime() : null;
      const nowMs = Date.now();
      const pendingHours = lastClaimMs ? Math.max(0, (nowMs - lastClaimMs) / (1000 * 60 * 60)) : 0;
      const pendingBalance = Number((pendingHours * miningRateValue).toFixed(4));

      if (Number.isFinite(pendingBalance) && pendingBalance > 0) {
        setMinedThisSession(pendingBalance);
      }

      if (data?.points !== undefined && data?.points !== null) {
        setPoints(Number(data.points));
      }
    } catch (error) {
      console.warn('[Mining Sync] Error syncing mining state:', error);
    }
  };

  const syncDailyAdCount = async (userId: string | null) => {
    if (!userId) {
      setAdWatchCount(0);
      return 0;
    }

    const todayKey = getUtcDateKey();
    const { data, error } = await supabase
      .from('user_ad_logs')
      .select('user_id, daily_count, last_ad_date, last_day_utc, updated_at')
      .eq('user_id', String(userId))
      .maybeSingle();

    if (error && error.code !== 'PGRST116') {
      console.warn('[Ad Count] Failed to load daily ad count:', error);
      setAdWatchCount(0);
      return 0;
    }

    const record = (data ?? null) as Record<string, unknown> | null;
    const storedCount = Number(record?.daily_count ?? record?.ad_count ?? 0);
    const storedDay = (record?.last_ad_date ?? record?.last_day_utc ?? record?.day_key ?? record?.log_date ?? null) as string | null;
    const locked = isAdLimitLocked(storedCount, storedDay);
    const normalizedCount = locked ? Math.min(storedCount, 10) : 0;

    if (!record || !locked) {
      const { error: upsertError } = await supabase
        .from('user_ad_logs')
        .upsert(
          {
            user_id: String(userId),
            daily_count: normalizedCount,
            last_ad_date: todayKey,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'user_id' }
        );

      if (upsertError) {
        console.warn('[Ad Count] Failed to reset daily ad count:', upsertError);
      }
    }

    setAdWatchCount(normalizedCount);
    return normalizedCount;
  };

  const resolveRpcAdCount = (payload: unknown): number | null => {
    if (payload === null || payload === undefined) {
      return null;
    }

    if (Array.isArray(payload)) {
      for (const item of payload) {
        const value = resolveRpcAdCount(item);
        if (value !== null) {
          return value;
        }
      }
      return null;
    }

    if (typeof payload !== 'object') {
      return null;
    }

    const record = payload as Record<string, unknown>;
    const possibleKeys = ['new_ad_count', 'new_count', 'daily_ads_completed', 'watched_count', 'ad_count', 'count'];
    for (const key of possibleKeys) {
      const value = record[key];
      if (value !== undefined && value !== null && value !== '') {
        const numeric = Number(value);
        if (Number.isFinite(numeric)) {
          return Math.max(0, Math.min(10, numeric));
        }
      }
    }

    return null;
  };

  const adLimitReached = isAdLocked || adCount >= 10;
  const effectiveMiningRate = Number((Math.max(0.0001, miningRate) * (speedBoostSecondsLeft > 0 ? 2 : 1)).toFixed(4));
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
  const displayedMiningRewards = pendingMiningRewards > 0 ? pendingMiningRewards : safeMinedThisSession;
  const displayedBalance = balance > 0 ? balance : points;

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

    const currentDailyCount = await syncDailyAdCount(currentUserId);
    if (adLimitReached || currentDailyCount >= 10 || isAdLoading) {
      setToastMessage('LOCKED / Limit Reached');
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    if (typeof (window as any).show_11862041 !== 'function') {
      alert('Ad SDK is loading, please try again in a few seconds.');
      return;
    }

    setIsAdLoading(true);

    try {
      await (window as any).show_11862041();

      const { data, error } = await supabase.rpc('record_ad_watch', {
        p_user_id: String(currentUserId),
      });

      if (error) {
        console.error('Supabase Error:', error);
        alert('Error adding reward: ' + error.message);
        return;
      }

      const nextCount = Math.min(Number(data?.ad_count ?? data?.daily_count ?? currentDailyCount + 1), 10);
      const nextLocked = Boolean(data?.is_ad_locked ?? nextCount >= 10);
      const nextBalance = Number(data?.new_balance ?? data?.balance ?? points + 5);
      const reward = 5;
      const nextPoints = Number((points + reward).toFixed(4));

      setAdWatchCount(nextCount);
      setAdCount(nextCount);
      setIsAdLocked(nextLocked);
      setPoints(Number(nextBalance || nextPoints));
      await initAppState(currentUserId);

      console.log('record_ad_watch success', data);
      alert(`Success! Ad watched (${nextCount}/10). Reward added.`);

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
      await persistUserBalance(Number(nextBalance || nextPoints), 'task_watch_ad', currentUserId);
    } catch (err) {
      console.error('Ad Error:', err);
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

      try {
        await supabase.rpc('claim_mining_rewards', {
          p_user_id: String(activeTelegramId),
        });
      } catch (claimError) {
        console.warn('[Mining Claim] RPC failed, falling back to local claim:', claimError);
      }

      const nowIso = new Date().toISOString();
      const { data, error } = await supabase
        .from('users')
        .update({
          points: newTotalPoints,
          last_claim_time: nowIso,
          last_active_time: nowIso,
        })
        .eq('telegram_id', activeTelegramId);

      console.log('[Supabase] CLAIM save', { activeTelegramId, currentPoints, pendingReward, newTotalPoints, data, error });

      if (error) {
        console.error('[Supabase] CLAIM update failed:', error);
        setTelegramWarning('Claim save failed. Please try again.');
        return;
      }

      setPoints(newTotalPoints);
      setPendingMiningRewards(0);
      setMinedThisSession(0);
      lastClaimTimeRef.current = nowIso;
      setIsMining(true);
      miningLastUpdatedRef.current = Date.now();
      return;
    }

    if (!isMining) {
      setMinedThisSession(0);
      setPendingMiningRewards(0);
      setIsMining(true);
      miningLastUpdatedRef.current = Date.now();
    }
  };

  const handleSpeedBoost = async () => {
    const currentUserId = telegramId ?? getTelegramContext().realUserId;
    if (!currentUserId) {
      setTelegramWarning('Please open this mini-app inside Telegram to use the 2x boost.');
      return;
    }

    if (speedBoostSecondsLeft > 0) {
      setToastMessage('Speed boost already active.');
      window.setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    if (adLimitReached) {
      setToastMessage('LOCKED / Limit Reached');
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    if (typeof window !== 'undefined' && typeof window.show_11862041 === 'function') {
      try {
        await window.show_11862041();
      } catch (error) {
        console.warn('[Monetag] Rewarded ad trigger failed:', error);
        setToastMessage('Ad did not complete. Please try again.');
        setTimeout(() => setToastMessage(null), 2200);
        return;
      }
    }

    const { data, error } = await supabase.rpc('record_ad_watch', {
      p_user_id: String(currentUserId),
    });

    if (error) {
      console.error('[Monetag Boost] Supabase reward failed:', error);
      setToastMessage('Reward sync failed. Please try again.');
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    const nextCount = Math.min(Number(data?.ad_count ?? data?.daily_count ?? adCount + 1), 10);
    const nextLocked = Boolean(data?.is_ad_locked ?? nextCount >= 10);
    const nextBalance = Number(data?.new_balance ?? data?.balance ?? points);

    setAdWatchCount(nextCount);
    setAdCount(nextCount);
    setIsAdLocked(nextLocked);
    setPoints(nextBalance);
    await initAppState(currentUserId);
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

    const webApp = window.Telegram?.WebApp;
    const tgUser = webApp?.initDataUnsafe?.user ?? null;
    const userId = tgUser?.id ? String(tgUser.id) : (webApp ? null : '12345678');

    if (!userId) {
      setTelegramWarning('Please open this mini-app inside Telegram to watch ads and earn rewards.');
      return;
    }

    if (adLimitReached) {
      setToastMessage('LOCKED / Limit Reached');
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    if (typeof (window as any).show_11862041 === 'function') {
      try {
        await (window as any).show_11862041();
      } catch (err) {
        console.error('Ad execution error:', err);
        setToastMessage('Ad did not complete. Please try again.');
        setTimeout(() => setToastMessage(null), 2200);
        return;
      }
    }

    const { data, error } = await supabase.rpc('record_ad_watch', {
      p_user_id: String(userId),
    });

    if (error) {
      console.error('record_ad_watch failed:', error);
      setToastMessage('Reward sync failed. Please try again.');
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    const nextCount = Math.min(Number(data?.ad_count ?? data?.daily_count ?? adCount + 1), 10);
    const nextLocked = Boolean(data?.is_ad_locked ?? nextCount >= 10);
    const nextBalance = Number(data?.new_balance ?? data?.balance ?? points + 0.05);

    setAdWatchCount(nextCount);
    setAdCount(nextCount);
    setIsAdLocked(nextLocked);
    setPoints(nextBalance);
    setBonusMinutes(normalizedBonus + 5);
    await initAppState(userId);
    await persistUserBalance(nextBalance, 'ad_bonus', userId);
    alert(`Success! Ad watched (${nextCount}/10). Reward added.`);
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
    setAdCount(adWatchCount);
  }, [adWatchCount]);

  useEffect(() => {
    if (!telegramId) {
      return;
    }

    const refreshAppState = () => {
      void syncAppState(telegramId);
    };

    refreshAppState();
    window.addEventListener('focus', refreshAppState);
    return () => window.removeEventListener('focus', refreshAppState);
  }, [telegramId]);

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

      await initAppState(realUserId);
      await syncDailyAdCount(realUserId);
      await syncReferralStats(realUserId);
    };

    loadUserPoints();
  }, []);

  useEffect(() => {
    if (!isMining) {
      return;
    }

    const updatePassiveMining = () => {
      const sourceTime = lastClaimTimeRef.current ?? new Date().toISOString();
      const lastEpoch = new Date(sourceTime).getTime();
      const elapsedSeconds = Number.isFinite(lastEpoch) ? Math.max(0, (Date.now() - lastEpoch) / 1000) : 0;
      const liveReward = Number((elapsedSeconds * effectiveMiningRate).toFixed(4));
      setPendingMiningRewards(liveReward);
      setMinedThisSession(liveReward);
    };

    updatePassiveMining();
    const rewardTimer = window.setInterval(updatePassiveMining, 1000);
    return () => window.clearInterval(rewardTimer);
  }, [isMining, effectiveMiningRate]);

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
      const baseTimestamp = lastClaimTimeRef.current ?? new Date().toISOString();
      const earnedFromElapsedTime = computeMiningDeltaReward(baseTimestamp, effectiveMiningRate);
      setMinedThisSession(earnedFromElapsedTime);
      setPendingMiningRewards(earnedFromElapsedTime);
      miningLastUpdatedRef.current = Date.now();
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
              <div className="mt-3 text-lg font-black text-[#f9e4a4]">{(displayedBalance * 0.75).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
            </div>
            <div className="rounded-[22px] border border-[#e5c158]/30 bg-[#101317]/80 p-3 shadow-[0_0_22px_rgba(229,193,88,0.08)] backdrop-blur-sm">
              <div className="text-[10px] uppercase tracking-[0.2em] text-[#d9c27a]">Pool Wallet</div>
              <div className="mt-3 text-lg font-black text-[#f9e4a4]">{(displayedBalance * 0.25).toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
            </div>
          </div>

          <div className="mt-6 rounded-[28px] border border-[#e5c158]/30 bg-[#111317]/80 px-4 py-5 text-center shadow-[0_0_26px_rgba(229,193,88,0.12)] backdrop-blur-sm">
            <div className="text-[10px] uppercase tracking-[0.26em] text-[#c9b16a]">Live Counter</div>
            <div className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#00ff88] drop-shadow-[0_0_16px_rgba(0,255,136,0.7)]">
              {`+${displayedMiningRewards.toFixed(4)} AGEN`}
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
                className={`absolute right-2 top-1 z-10 flex h-14 w-14 flex-col items-center justify-center rounded-full border text-[#16130b] shadow-[0_10px_26px_rgba(212,175,55,0.35)] ${adLimitReached ? 'cursor-not-allowed border-[#f7d780]/25 bg-[#1d2128] text-[#d8dbe0]' : 'border-[#f7d780]/40 bg-[linear-gradient(135deg,#f7d57a,#d4af37_35%,#f3d784_100%)]'}`}
                onClick={() => void handleSpeedBoost()}
                disabled={adLimitReached || speedBoostSecondsLeft > 0 || isAdLoading}
              >
                <span className="text-[11px] font-black">⚡</span>
                <span className="text-[9px] font-black leading-none">{speedBoostSecondsLeft > 0 ? `${speedBoostSecondsLeft}s` : adLimitReached ? 'LOCK' : '2x'}</span>
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
            <div className="flex flex-col gap-2">
              <button
                className={`w-full rounded-[18px] border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] shadow-[0_0_18px_rgba(229,193,88,0.06)] ${isAdLocked || adCount >= 10 ? 'cursor-not-allowed border-[#f7d780]/20 bg-[#1d2128] text-[#d8dbe0]' : 'border-[#e5c158]/25 bg-[#171a1d] text-[#f8d77a]'}`}
                onClick={handleWatchAd}
                disabled={isAdLocked || adCount >= 10}
              >
                {isAdLocked ? 'Daily Limit Reached (10/10) - Unlocks in 24h' : 'Watch Ad (+5 Mins)'}
              </button>
              {isAdLocked && (
                <div className="rounded-full border border-[#f7d780]/25 bg-[#f4c75b]/10 px-2.5 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.18em] text-[#f8d77a]">
                  Daily Limit Reached (10/10) - Unlocks in 24h
                </div>
              )}
            </div>
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
          className={`rounded-full border px-3 py-2 text-[10px] font-black uppercase tracking-[0.16em] ${adLimitReached ? 'cursor-not-allowed border-[#f7d780]/20 bg-[#1d2128] text-[#d8dbe0]' : 'border-[#f7d780]/30 bg-[#f4c75b]/10 text-[#f9e6ad]'}`}
          onClick={() => void handleSpeedBoost()}
          disabled={adLimitReached || speedBoostSecondsLeft > 0 || isAdLoading}
        >
          {speedBoostSecondsLeft > 0 ? `${speedBoostSecondsLeft}s` : adLimitReached ? 'LOCKED / Limit Reached' : '2x Boost'}
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
          const isCompleted = task.type === 'ad' ? adLimitReached || adCount >= (task.max_daily ?? 10) : status.claimed || status.completed;
          const buttonLabel = task.type === 'ad'
            ? isCompleted
              ? 'LOCKED'
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
                      <p className="mt-2 text-xs text-white/70">
                        {adLimitReached ? 'LOCKED / Limit Reached' : `Watched: ${adCount}/${task.max_daily}`}
                      </p>
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
                  disabled={task.type === 'ad' ? (adLimitReached || isAdLoading) : isCompleted || isAdLoading}
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
