import type { JSX } from 'react';

type HomeViewProps = {
  telegramWarning: string | null;
  toastMessage: string | null;
  activeUserLevel: number;
  walletAddress: string | null;
  displayedBalance: number;
  currentMiningSpeed: number;
  isMining: boolean;
  liveMiningValue: number;
  adLimitReached: boolean;
  speedBoostSecondsLeft: number;
  isAdLoading: boolean;
  safeMinedThisSession: number;
  adCount: number;
  isAdLocked: boolean;
  adProgressText: string;
  handleSpeedBoost: () => Promise<void>;
  handleMiningAction: () => Promise<void>;
  handleWatchAd: () => Promise<void>;
  LogoComponent: (props: { size?: number; className?: string }) => JSX.Element;
};

export function HomeView({
  telegramWarning,
  toastMessage,
  activeUserLevel,
  walletAddress,
  displayedBalance,
  currentMiningSpeed,
  isMining,
  liveMiningValue,
  adLimitReached,
  speedBoostSecondsLeft,
  isAdLoading,
  safeMinedThisSession,
  adCount,
  isAdLocked,
  adProgressText,
  handleSpeedBoost,
  handleMiningAction,
  handleWatchAd,
  LogoComponent,
}: HomeViewProps) {
  const Logo = LogoComponent;

  return (
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
          <div className="rounded-full border border-[#f7d780]/35 bg-[#1f1b13]/80 px-3 py-1.5 text-[10px] font-black uppercase tracking-[0.22em] text-[#f8d77a] shadow-[0_0_18px_rgba(229,193,88,0.15)]">
            LVL {activeUserLevel}
          </div>
          <div className="flex items-center gap-2">
            {walletAddress && (
              <span className="rounded-full border border-[#8ef0b0]/40 bg-[#0f1c17]/80 px-2.5 py-1.5 text-[9px] font-bold uppercase tracking-[0.18em] text-[#9ff7c3]">
                {walletAddress.slice(0, 6)}...{walletAddress.slice(-4)}
              </span>
            )}
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
            <div className="flex items-center justify-between gap-2 text-[10px] uppercase tracking-[0.26em] text-[#c9b16a]">
              <span>Live Counter</span>
              <span className="rounded-full border border-[#e5c158]/25 bg-[#f4c75b]/10 px-2 py-1 text-[8px] text-[#f8d77a]">Lvl {activeUserLevel}</span>
            </div>
            <div className="mt-3 text-3xl font-black tracking-[-0.06em] text-[#00ff88] drop-shadow-[0_0_16px_rgba(0,255,136,0.7)]">
              {`+${liveMiningValue.toFixed(4)} AGEN`}
            </div>
            <div className="mt-2 text-[10px] font-black uppercase tracking-[0.18em] text-[#f7d780]">
              Speed: {currentMiningSpeed.toFixed(4)} AGEN/hr
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
              <Logo size={170} className="drop-shadow-[0_0_24px_rgba(229,193,88,0.7)]" />
            </div>
          </div>

          <div className="mt-6 flex flex-col gap-3">
            <button
              className="w-full rounded-[20px] bg-[linear-gradient(135deg,#f7d57a,#d4af37_35%,#f3d784_100%)] px-5 py-4 text-lg font-black uppercase tracking-[0.18em] text-[#16130b] shadow-[0_18px_35px_rgba(212,175,55,0.35)] transition-transform active:scale-[0.99]"
              onClick={() => void handleMiningAction()}
            >
              {safeMinedThisSession > 0 ? 'CLAIM' : isMining ? 'PASSIVE MINING' : 'START'}
            </button>
            <div className="flex flex-col gap-2">
              <button
                className={`w-full rounded-[18px] border px-4 py-3 text-sm font-black uppercase tracking-[0.16em] shadow-[0_0_18px_rgba(229,193,88,0.06)] ${isAdLocked || adCount >= 10 ? 'cursor-not-allowed border-[#f7d780]/20 bg-[#1d2128] text-[#d8dbe0]' : 'border-[#e5c158]/25 bg-[#171a1d] text-[#f8d77a]'}`}
                onClick={() => void handleWatchAd()}
                disabled={isAdLocked || adCount >= 10}
              >
                {isAdLocked || adCount >= 10 ? 'LIMIT REACHED (10/10)' : `WATCH AD (${Math.min(adCount, 10)}/10)`}
              </button>
              {(isAdLocked || adCount >= 10) && (
                <div className="rounded-full border border-[#f7d780]/25 bg-[#f4c75b]/10 px-2.5 py-1.5 text-center text-[9px] font-black uppercase tracking-[0.18em] text-[#f8d77a]">
                  {adProgressText}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
