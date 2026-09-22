import { useEffect, useState } from 'react';
import './index.css';
import { agenMark } from './images';
import { supabase } from './supabase';

const App = () => {
  const [points, setPoints] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [showFrens, setShowFrens] = useState(false);
  const [referralLink, setReferralLink] = useState('https://t.me/Copmujbot/Gop');
  const [copied, setCopied] = useState(false);
  const [telegramUser, setTelegramUser] = useState<{ id?: number; username?: string } | null>(null);
  const [isMining, setIsMining] = useState(false);
  const [isClaimReady, setIsClaimReady] = useState(false);
  const [sessionSeconds, setSessionSeconds] = useState(0);
  const [minedThisSession, setMinedThisSession] = useState(0);

  const miningRate = 0.0008;
  const miningDuration = 20;
  const holdingBalance = Number((points * 0.75).toFixed(4));
  const poolBalance = Number((points * 0.25).toFixed(4));

  const handleMiningAction = () => {
    if (!isMining && !isClaimReady) {
      setSessionSeconds(0);
      setMinedThisSession(0);
      setIsMining(true);
      setIsClaimReady(false);
      return;
    }

    if (isClaimReady) {
      const claimValue = Number(minedThisSession.toFixed(4));
      setPoints((prevPoints) => Number((prevPoints + claimValue).toFixed(4)));
      setMinedThisSession(0);
      setSessionSeconds(0);
      setIsClaimReady(false);
      setIsMining(false);
    }
  };

  const handleInviteFriend = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}`;
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

  useEffect(() => {
    if (typeof window !== 'undefined') {
      window.localStorage.clear();
    }

    if (typeof window === 'undefined') {
      return;
    }

    const telegramUserData = (window as any)?.Telegram?.WebApp?.initDataUnsafe?.user;
    const telegramId = typeof telegramUserData?.id === 'number' ? telegramUserData.id : null;
    setTelegramUser(telegramUserData ?? null);

    const nextLink = telegramId == null
      ? 'https://t.me/Copmujbot/Gop'
      : `https://t.me/Copmujbot/Gop?startapp=ref_${telegramId}`;

    setReferralLink(nextLink);

    if (telegramId == null) {
      return;
    }

    const loadUserPoints = async () => {
      const { data, error } = await supabase
        .from('users')
        .select('points')
        .eq('telegram_id', telegramId)
        .maybeSingle();

      if (error && error.code !== 'PGRST116') {
        console.error('Error fetching user points:', error);
        return;
      }

      if (!data) {
        const { error: insertError } = await supabase
          .from('users')
          .insert([
            {
              telegram_id: telegramId,
              username: telegramUserData?.username || 'User',
              points: 0,
            },
          ]);

        if (insertError) {
          console.error('Error inserting new user:', insertError);
          return;
        }

        setPoints(0);
        return;
      }

      setPoints(Number(data.points ?? 0));
    };

    loadUserPoints();
  }, []);

  useEffect(() => {
    if (!telegramUser?.id) {
      return;
    }

    const syncPoints = async () => {
      const { error } = await supabase
        .from('users')
        .update({
          username: telegramUser.username || 'User',
          points,
        })
        .eq('telegram_id', telegramUser.id);

      if (error) {
        console.error('Error syncing user points:', error);
      }
    };

    const debounceTimer = window.setTimeout(syncPoints, 200);

    return () => window.clearTimeout(debounceTimer);
  }, [points, telegramUser?.id, telegramUser?.username]);

  useEffect(() => {
    if (!isMining) {
      return;
    }

    const miningInterval = window.setInterval(() => {
      setMinedThisSession((prevValue) => Number((prevValue + miningRate).toFixed(4)));
      setSessionSeconds((prevSeconds) => {
        const nextSeconds = prevSeconds + 1;

        if (nextSeconds >= miningDuration) {
          setIsMining(false);
          setIsClaimReady(true);
          return miningDuration;
        }

        return nextSeconds;
      });
    }, 1000);

    return () => window.clearInterval(miningInterval);
  }, [isMining]);

  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy((prevEnergy) => Math.min(prevEnergy + 1, 6500));
    }, 100);

    return () => clearInterval(interval);
  }, []);

  return (
    <div className="bg-gradient-main min-h-screen px-4 flex flex-col items-center text-white font-medium pb-28">
      <div className="absolute inset-0 h-1/2 bg-gradient-overlay z-0"></div>
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="radial-gradient-overlay"></div>
      </div>

      <div className="w-full z-10 min-h-screen flex flex-col items-center text-white">
        <div className="fixed top-0 left-0 w-full px-4 pt-6 z-10 text-white">
          <div className="flex items-center justify-between">
            <div className="rounded-full bg-[#1a1d24]/80 px-3 py-2 text-xs font-semibold tracking-[0.18em] text-[#f9d77c] uppercase shadow-lg shadow-black/20 backdrop-blur-sm">
              Level 1 • Mining
            </div>
            <button className="rounded-full bg-[#f4c75b] px-4 py-2 text-xs font-bold text-[#1b1412] shadow-lg shadow-[#f4c75b]/20">
              Connect Wallet
            </button>
          </div>
        </div>

        <div className="w-full flex-1 flex flex-col items-center justify-center pt-20 pb-8">
          <div className="w-full max-w-md rounded-[28px] border border-[#f8d787]/20 bg-[#1b1d22]/70 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.35)] backdrop-blur-sm">
            <div className="flex items-center justify-between text-[#f5d58f]">
              <span className="text-xs uppercase tracking-[0.2em] text-[#f9d77c]">Balance</span>
              <span className="text-xs text-white/70">{isMining ? 'Mining' : isClaimReady ? 'Ready' : 'Standby'}</span>
            </div>

            <div className="mt-4">
              <div className="text-[11px] uppercase tracking-[0.22em] text-white/60">Total AGEN</div>
              <div className="mt-2 flex items-end gap-2">
                <img src={agenMark} width={32} height={32} alt="AGEN" />
                <span className="text-4xl font-black leading-none text-[#f9e6ad]">{points.toLocaleString(undefined, { maximumFractionDigits: 4 })}</span>
              </div>
            </div>

            <div className="mt-5 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-2xl bg-[#262a32] p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">Holding</div>
                <div className="mt-2 text-lg font-bold text-[#f9e6ad]">{holdingBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
              </div>
              <div className="rounded-2xl bg-[#262a32] p-3">
                <div className="text-[10px] uppercase tracking-[0.2em] text-white/55">Pool</div>
                <div className="mt-2 text-lg font-bold text-[#f9e6ad]">{poolBalance.toLocaleString(undefined, { maximumFractionDigits: 4 })}</div>
              </div>
            </div>

            <div className="mt-6 rounded-2xl border border-[#f3c65e]/20 bg-[#f4c75b]/10 px-4 py-3 text-center">
              <div className="text-[10px] uppercase tracking-[0.22em] text-[#f4d889]">Mining status</div>
              <div className="mt-1 text-lg font-bold text-[#fff4d1]">
                {isMining ? `+${minedThisSession.toFixed(4)} AGEN` : isClaimReady ? `+${minedThisSession.toFixed(4)} AGEN ready` : '+0.0000 AGEN'}
              </div>
              <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/60">
                {isMining ? `Mining ${sessionSeconds}s / ${miningDuration}s` : isClaimReady ? 'Claim available' : 'Idle'}
              </div>
            </div>

            <div className="mt-7 flex items-center justify-center">
              <div className="relative flex h-56 w-56 items-center justify-center rounded-full bg-[radial-gradient(circle,_rgba(249,208,122,0.18),_rgba(249,208,122,0.04)_52%,_transparent_70%)]">
                <div className="absolute inset-3 rounded-full border border-[#f7d780]/20"></div>
                <img src={agenMark} width={220} height={220} alt="AGEN golden Penrose triangle" className="drop-shadow-[0_0_35px_rgba(244,199,91,0.6)]" />
              </div>
            </div>

            <div className="mt-6">
              <button
                className="w-full rounded-2xl bg-gradient-to-r from-[#f7cd69] via-[#f7bf4a] to-[#ffebae] px-5 py-4 text-lg font-black tracking-[0.18em] text-[#1b1412] shadow-[0_12px_30px_rgba(247,191,74,0.35)] transition-transform active:scale-[0.99]"
                onClick={handleMiningAction}
              >
                {isMining ? 'MINING…' : isClaimReady ? 'CLAIM' : 'START'}
              </button>
            </div>
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 z-[1000] bg-[#12151b] border-t border-white/10 px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
          <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-medium">
            <button className="flex flex-col items-center justify-center gap-1 rounded-xl bg-white/5 py-2 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 0 1 0-17zm0 2a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zm-.8 2.7h1.6v4.7h-1.6zm0 6.6h1.6v1.6h-1.6z" />
              </svg>
              <span>Home</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-white/70">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M7 3.5A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V6A2.5 2.5 0 0 0 17 3.5zm0 2h10a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5zm2 2.5h6v2H9zm0 4h6v2H9zm0 4h4v2H9z" />
              </svg>
              <span>Tasks</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-white/70" onClick={() => setShowFrens(true)}>
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M16 11a4 4 0 1 0-4-4a4 4 0 0 0 4 4zm-8 1a3 3 0 1 0-3-3a3 3 0 0 0 3 3zm8 1.5c2.7 0 5 1.7 5 3.8V18H11v-1.7c0-2.1 2.3-3.8 5-3.8zm-8-1.5A5 5 0 0 0 3 17.5V18h8v-.5A5 5 0 0 0 8 12.5z" />
              </svg>
              <span>Friends</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 rounded-xl py-2 text-white/70">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 12.5A3.5 3.5 0 1 0 12 5.5a3.5 3.5 0 0 0 0 7zm-6 7a6 6 0 0 1 12 0v.5H6zm14-8a3 3 0 1 0 3 3a3 3 0 0 0-3-3zm-2 10.5V18h4v1.5z" />
              </svg>
              <span>Profile</span>
            </button>
          </div>
          <div className="mt-3 w-full rounded-full bg-[#f9c035]">
            <div className="h-4 rounded-full bg-gradient-to-r from-[#f3c45a] to-[#fffad0]" style={{ width: `${(energy / 6500) * 100}%` }}></div>
          </div>
        </div>

        {showFrens && (
          <div className="fixed inset-0 z-20 flex items-end justify-center bg-black/50 p-4" onClick={() => setShowFrens(false)}>
            <div className="w-full max-w-md rounded-[28px] bg-[#f7cc5a] p-5 text-[#171712] shadow-2xl" onClick={(e) => e.stopPropagation()}>
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold">Frens</h2>
                <button className="text-xl font-bold" onClick={() => setShowFrens(false)} aria-label="Close friends panel">
                  ×
                </button>
              </div>

              <div className="mt-4 rounded-2xl bg-[#fff5d5] p-4 text-center text-base font-semibold text-[#2f2b21]">
                Get 10,000 AGEN points for each friend invited!
              </div>

              <div className="mt-4 rounded-2xl bg-white/70 p-3 text-xs break-all text-[#2f2b21]">
                {referralLink}
              </div>

              <div className="mt-4 flex gap-2">
                <button
                  className="flex-1 rounded-full bg-[#1f2530] px-4 py-3 text-sm font-bold text-white"
                  onClick={handleInviteFriend}
                >
                  Invite a Friend
                </button>
                <button
                  className="flex-1 rounded-full bg-[#fff3be] px-4 py-3 text-sm font-bold text-[#1f2530]"
                  onClick={handleCopyLink}
                >
                  {copied ? 'Copied!' : 'Copy Link'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default App;
