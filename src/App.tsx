import { useEffect, useState } from 'react';
import './index.css';
import Arrow from './icons/Arrow';
import { agenMark, trophy } from './images';
import { supabase } from './supabase';

const App = () => {
  const [points, setPoints] = useState(0);
  const [energy, setEnergy] = useState(0);
  const [clicks, setClicks] = useState<{ id: number, x: number, y: number }[]>([]);
  const [showFrens, setShowFrens] = useState(false);
  const [referralLink, setReferralLink] = useState('https://t.me/Copmujbot/Gop');
  const [copied, setCopied] = useState(false);
  const [telegramUser, setTelegramUser] = useState<{ id?: number; username?: string } | null>(null);
  const pointsToAdd = 12;
  const energyToReduce = 12;

  const handleClick = (e: React.MouseEvent<HTMLDivElement, MouseEvent>) => {
    if (energy - energyToReduce < 0) {
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    setPoints((prevPoints) => prevPoints + pointsToAdd);
    setEnergy((prevEnergy) => (prevEnergy - energyToReduce < 0 ? 0 : prevEnergy - energyToReduce));
    setClicks((prevClicks) => [...prevClicks, { id: Date.now(), x, y }]);
  };

  const handleAnimationEnd = (id: number) => {
    setClicks((prevClicks) => prevClicks.filter(click => click.id !== id));
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

  // useEffect hook to restore energy over time
  useEffect(() => {
    const interval = setInterval(() => {
      setEnergy((prevEnergy) => Math.min(prevEnergy + 1, 6500));
    }, 100); // Restore 10 energy points every second

    return () => clearInterval(interval); // Clear interval on component unmount
  }, []);

  return (
    <div className="bg-gradient-main min-h-screen px-4 flex flex-col items-center text-white font-medium pb-28">

      <div className="absolute inset-0 h-1/2 bg-gradient-overlay z-0"></div>
      <div className="absolute inset-0 flex items-center justify-center z-0">
        <div className="radial-gradient-overlay"></div>
      </div>

      <div className="w-full z-10 min-h-screen flex flex-col items-center text-white">

        <div className="fixed top-0 left-0 w-full px-4 pt-8 z-10 flex flex-col items-center text-white">
          <div className="w-full cursor-pointer">
            <div className="brand-banner text-center py-2 rounded-xl">
              <p className="text-lg"><span className="brand-name">AGEN</span> squad <Arrow size={18} className="ml-0 mb-1 inline-block" /></p>
            </div>
          </div>
          <div className="mt-12 text-5xl font-bold flex items-center">
            <img src={agenMark} width={44} height={44} alt="AGEN" />
            <span className="ml-2">{points.toLocaleString()}</span>
          </div>
          <div className="text-base mt-2 flex items-center">
            <img src={trophy} width={24} height={24} />
            <span className="ml-1">Gold <Arrow size={18} className="ml-0 mb-1 inline-block" /></span>
          </div>
        </div>


        <div className="fixed bottom-0 left-0 right-0 z-[1000] bg-[#12151b] border-t border-white/10 px-2 pb-[max(env(safe-area-inset-bottom),0.75rem)] pt-2">
          <div className="grid grid-cols-4 gap-1 text-center text-[10px] font-medium text-white/70">
            <button className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl bg-white/5 text-white">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 3.5a8.5 8.5 0 1 1 0 17a8.5 8.5 0 0 1 0-17zm0 2a6.5 6.5 0 1 0 0 13a6.5 6.5 0 0 0 0-13zm-.8 2.7h1.6v4.7h-1.6zm0 6.6h1.6v1.6h-1.6z"/>
              </svg>
              <span>Home</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-white/70">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M7 3.5A2.5 2.5 0 0 0 4.5 6v12A2.5 2.5 0 0 0 7 20.5h10a2.5 2.5 0 0 0 2.5-2.5V6A2.5 2.5 0 0 0 17 3.5zm0 2h10a.5.5 0 0 1 .5.5v12a.5.5 0 0 1-.5.5H7a.5.5 0 0 1-.5-.5V6a.5.5 0 0 1 .5-.5zm2 2.5h6v2H9zm0 4h6v2H9zm0 4h4v2H9z"/>
              </svg>
              <span>Tasks</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-white/70" onClick={() => setShowFrens(true)}>
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M16 11a4 4 0 1 0-4-4a4 4 0 0 0 4 4zm-8 1a3 3 0 1 0-3-3a3 3 0 0 0 3 3zm8 1.5c2.7 0 5 1.7 5 3.8V18H11v-1.7c0-2.1 2.3-3.8 5-3.8zm-8-1.5A5 5 0 0 0 3 17.5V18h8v-.5A5 5 0 0 0 8 12.5z"/>
              </svg>
              <span>Friends</span>
            </button>
            <button className="flex flex-col items-center justify-center gap-1 py-2 rounded-xl text-white/70">
              <svg viewBox="0 0 24 24" className="h-5 w-5 fill-current" aria-hidden="true">
                <path d="M12 12.5A3.5 3.5 0 1 0 12 5.5a3.5 3.5 0 0 0 0 7zm-6 7a6 6 0 0 1 12 0v.5H6zm14-8a3 3 0 1 0 3 3a3 3 0 0 0-3-3zm-2 10.5V18h4v1.5z"/>
              </svg>
              <span>Profile</span>
            </button>
          </div>
          <div className="w-full bg-[#f9c035] rounded-full mt-3">
            <div className="bg-gradient-to-r from-[#f3c45a] to-[#fffad0] h-4 rounded-full" style={{ width: `${(energy / 6500) * 100}%` }}></div>
          </div>
        </div>


        <div className="flex-grow flex items-center justify-center">
          <div
            className="tap-button relative mt-4"
            onClick={handleClick}
            role="button"
            tabIndex={0}
            aria-label="Tap the AGEN mark to earn points"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                e.currentTarget.click();
              }
            }}
          >
            <img className="tap-button-image" src={agenMark} width={256} height={256} alt="AGEN golden triangular loop" />
            {clicks.map((click) => (
              <div
                key={click.id}
                className="absolute text-5xl font-bold opacity-0"
                style={{
                  top: `${click.y - 42}px`,
                  left: `${click.x - 28}px`,
                  animation: `float 1s ease-out`
                }}
                onAnimationEnd={() => handleAnimationEnd(click.id)}
              >
                12
              </div>
            ))}
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
