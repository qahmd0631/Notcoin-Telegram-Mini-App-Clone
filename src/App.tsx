import { useEffect, useRef, useState } from 'react';
import './index.css';
import { agenMark } from './images';
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
  }
}

const App = () => {
  const [points, setPoints] = useState(0);
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'friends' | 'profile'>('home');
  const [referralLink, setReferralLink] = useState('https://t.me/AURA_AGENBOT?startapp=ref_12345678');
  const [copied, setCopied] = useState(false);
  const [telegramWarning, setTelegramWarning] = useState<string | null>(null);
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [isMining, setIsMining] = useState(true);
  const [minedThisSession, setMinedThisSession] = useState(0);
  const [bonusMinutes, setBonusMinutes] = useState(0);
  const [claimingRewards, setClaimingRewards] = useState(false);
  const [referralStats, setReferralStats] = useState({ totalReferrals: 0, unclaimedRewards: 0, pending: [] as ReferralRecord[] });
  const miningLastUpdatedRef = useRef<number | null>(null);

  const miningRate = 0.0001;
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
  const getReferrerIdFromStartParam = () => {
    const startParam = window.Telegram?.WebApp?.initDataUnsafe?.start_param;
    if (typeof startParam !== 'string' || !startParam.startsWith('ref_')) {
      return null;
    }
    return startParam.replace(/^ref_/, '');
  };
  const syncReferralStats = async (userId: string | null) => {
    if (!userId) {
      setReferralStats({ totalReferrals: 0, unclaimedRewards: 0, pending: [] });
      return;
    }

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', userId);

    if (error) {
      console.warn('[Referral] Failed to load referral stats:', error);
      return;
    }

    const rows = Array.isArray(data) ? data as ReferralRecord[] : [];
    const pending = rows.filter((row) => {
      const claimed = row.claimed ?? row.reward_claimed ?? false;
      return !claimed;
    });
    const unclaimedRewards = pending.reduce((sum, row) => sum + normalizePoints(row.reward_amount ?? 10), 0);

    setReferralStats({
      totalReferrals: rows.length,
      unclaimedRewards: Number(unclaimedRewards.toFixed(4)),
      pending,
    });
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

    setClaimingRewards(true);

    const { data, error } = await supabase
      .from('referrals')
      .select('*')
      .eq('referrer_id', currentUserId);

    if (error) {
      console.error('[Referral] Claim lookup failed:', error);
      setClaimingRewards(false);
      return;
    }

    const pendingRows = Array.isArray(data) ? (data as ReferralRecord[]).filter((row) => !(row.claimed ?? row.reward_claimed ?? false)) : [];
    const rewardTotal = pendingRows.reduce((sum, row) => sum + normalizePoints(row.reward_amount ?? 10), 0);

    if (!pendingRows.length || rewardTotal <= 0) {
      setClaimingRewards(false);
      await syncReferralStats(currentUserId);
      return;
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('points')
      .eq('telegram_id', currentUserId)
      .maybeSingle();

    if (userError && userError.code !== 'PGRST116') {
      console.error('[Referral] Failed to load reward user:', userError);
      setClaimingRewards(false);
      return;
    }

    const currentBalance = normalizePoints(userRow?.points ?? points);
    const nextBalance = Number((currentBalance + rewardTotal).toFixed(4));

    const { error: updateError } = await supabase
      .from('users')
      .update({ points: nextBalance })
      .eq('telegram_id', currentUserId);

    if (updateError) {
      console.error('[Referral] Reward claim update failed:', updateError);
      setTelegramWarning('Referral reward claim failed. Please try again.');
      setClaimingRewards(false);
      return;
    }

    for (const row of pendingRows) {
      if (!row.id) {
        continue;
      }

      const { error: markError } = await supabase
        .from('referrals')
        .update({ claimed: true, reward_claimed: true })
        .eq('id', row.id);

      if (markError) {
        console.warn('[Referral] Could not mark referral as claimed:', markError);
      }
    }

    setPoints(nextBalance);
    setTelegramWarning(null);
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
    const referrerId = getReferrerIdFromStartParam();

    setTelegramUser(tgUser ?? null);
    setTelegramId(realUserId);

    if (!realUserId) {
      setTelegramWarning('Please open this mini-app inside Telegram to save your balance.');
      setReferralLink('https://t.me/AURA_AGENBOT?startapp=ref_12345678');
      setPoints(0);
      return;
    }

    setTelegramWarning(null);

    const nextLink = `https://t.me/AURA_AGENBOT?startapp=ref_${realUserId}`;
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
        const { data: insertedUser, error: insertError } = await supabase
          .from('users')
          .insert([
            {
              telegram_id: realUserId,
              username: realUsername,
              points: 0,
              referred_by: referrerId ?? null,
            },
          ])
          .select('*')
          .single();

        if (insertError) {
          console.error('Error inserting new user:', insertError);
          return;
        }

        console.log('[Supabase] New user created with zero balance', {
          realUserId,
          realUsername,
          referrerId,
          insertedUser,
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

      if (referrerId && referrerId !== realUserId) {
        const { data: existingReferral, error: referralCheckError } = await supabase
          .from('referrals')
          .select('id')
          .eq('referred_id', realUserId)
          .maybeSingle();

        if (referralCheckError && referralCheckError.code !== 'PGRST116') {
          console.error('[Referral] Lookup failed:', referralCheckError);
          return;
        }

        if (!existingReferral) {
          const { error: referralInsertError } = await supabase
            .from('referrals')
            .insert([
              {
                referrer_id: referrerId,
                referred_id: realUserId,
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
            .eq('telegram_id', referrerId)
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
            .eq('telegram_id', referrerId);

          if (referrerUpdateError) {
            console.error('[Referral] Referrer reward update failed:', referrerUpdateError);
          } else {
            console.log('[Referral] Referrer reward added', {
              referrerId,
              referredId: realUserId,
              rewardAmount: 10,
              nextReferrerBalance,
            });
          }
        }
      }

      await syncReferralStats(realUserId);
    };

    loadUserPoints();
  }, []);

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
        const earnedFromElapsedTime = Number((elapsedSeconds * miningRate).toFixed(4));
        setMinedThisSession((prevValue) => Number((prevValue + earnedFromElapsedTime).toFixed(4)));
      }

      miningLastUpdatedRef.current = now;
    }, 1000);

    return () => window.clearInterval(miningInterval);
  }, [isMining]);

  const navItems: Array<{ key: 'home' | 'tasks' | 'friends' | 'profile'; label: string; icon: JSX.Element }> = [
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

      <div className="fixed top-0 left-0 z-10 w-full px-4 pt-6 text-white">
        <div className="flex items-center justify-between">
          <div className="rounded-full border border-[#e5c158]/40 bg-[#111317]/80 px-3 py-2 text-[10px] font-black uppercase tracking-[0.22em] text-[#f3d37c] shadow-[0_0_20px_rgba(229,193,88,0.2)] backdrop-blur-sm">
            Lvl 1 • IDLE
          </div>
          <button className="rounded-full bg-[linear-gradient(135deg,#00a8ff,#58d7ff)] px-4 py-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#06131d] shadow-[0_0_24px_rgba(0,168,255,0.45)]">
            Connect Wallet
          </button>
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
              <div className="absolute inset-5 rounded-full border border-[#e5c158]/15"></div>
              <img src={agenMark} width={170} height={170} alt="AGEN golden Penrose triangle" className="drop-shadow-[0_0_24px_rgba(229,193,88,0.7)]" />
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
              className="w-full rounded-[18px] border border-[#e5c158]/25 bg-[#171a1d] px-4 py-3 text-sm font-black uppercase tracking-[0.16em] text-[#f8d57a] shadow-[0_0_18px_rgba(229,193,88,0.06)]"
              onClick={handleWatchAd}
            >
              Watch Ad (+5 Mins)
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderTasksView = () => (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-xl flex-col px-4 pb-28 pt-6 text-white">
      <div className="mb-4 flex items-center justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.2em] text-[#f4d889]">Task Board</p>
          <h1 className="mt-2 text-3xl font-black text-[#fff8e1]">Tasks</h1>
        </div>
      </div>

      <div className="space-y-4">
        {[1, 2, 3].map((task) => (
          <div key={task} className="rounded-[24px] border border-[#f7d780]/20 bg-[#181b21]/80 p-4">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.18em] text-[#f8d77a]">Campaign</p>
                <h2 className="mt-2 text-lg font-bold text-white">Daily Mission {task}</h2>
              </div>
              <span className="rounded-full bg-[#f4c75b]/15 px-2.5 py-1 text-xs font-bold text-[#f8d77a]">+{task * 250} AGEN</span>
            </div>
            <p className="mt-3 text-sm text-white/70">Complete the action and earn more AGEN while the bot keeps mining in the background.</p>
          </div>
        ))}
      </div>
    </div>
  );

  const renderFriendsView = () => (
    <div className="relative z-10 mx-auto flex min-h-[calc(100vh-70px)] w-full max-w-xl flex-col px-4 pb-28 pt-6 text-[#171712]">
      <div className="mb-5 rounded-[28px] bg-[#f7cc5a] p-5 shadow-[0_12px_30px_rgba(247,191,74,0.3)]">
        <p className="text-[10px] uppercase tracking-[0.22em] text-[#442d03]">Referral Program</p>
        <h1 className="mt-2 text-3xl font-black text-[#1b1412]">Frens</h1>
        <div className="mt-4 rounded-2xl bg-[#fff5d5] p-4 text-center text-base font-semibold text-[#2f2b21]">
          Get 10 AGEN points for each friend invited!
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
      </div>

      <div className="rounded-[24px] border border-[#f7d780]/20 bg-[#181b21]/80 p-4 shadow-[0_18px_32px_rgba(0,0,0,0.2)]">
        <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Total AGEN Assets</p>
        <div className="mt-3 flex items-end gap-2">
          <img src={agenMark} width={28} height={28} alt="AGEN" />
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
        <button className="rounded-[24px] border border-[#f7d780]/20 bg-[#1d2128] p-4 text-left shadow-[0_16px_30px_rgba(0,0,0,0.15)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#f4d889]">Controls</p>
          <h3 className="mt-3 text-lg font-bold text-white">Withdraw</h3>
          <p className="mt-2 text-xs text-white/60">Move rewards</p>
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
        {activeTab === 'friends' && renderFriendsView()}
        {activeTab === 'profile' && renderProfileView()}
      </div>

      <div className="fixed bottom-0 left-0 right-0 z-[1000] border-t border-[#e5c158]/15 bg-[#101317]/95 px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2 backdrop-blur-md">
        <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-medium">
          {navItems.map((item) => {
            const isActive = activeTab === item.key;

            return (
              <button
                key={item.key}
                className={`flex flex-col items-center justify-center gap-1 rounded-xl py-2 transition-all ${
                  isActive ? 'bg-[#f5d57c]/10 text-[#f7d780] shadow-[0_0_16px_rgba(229,193,88,0.12)]' : 'text-white/70'
                }`}
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
