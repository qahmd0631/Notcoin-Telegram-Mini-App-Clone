import React, { useEffect, useState } from 'react';
import { Pickaxe, Zap, Clock, ShieldCheck, Sparkles, TrendingUp } from 'lucide-react';
import { TabKey } from './Navigation';

interface MiningTabProps {
  balance?: number;
  miningRate: number;
  level: number;
  levelLabel: string;
  claimableAmount: number;
  onClaim: () => Promise<void>;
  isClaiming: boolean;
  onNavigate: (tab: TabKey) => void;
  lastClaimAt?: string;
}

export const MiningTab: React.FC<MiningTabProps> = ({
  miningRate,
  level,
  levelLabel,
  claimableAmount,
  onClaim,
  isClaiming,
  onNavigate,
  lastClaimAt,
}) => {
  const [liveClaimable, setLiveClaimable] = useState(claimableAmount);
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  useEffect(() => {
    setLiveClaimable(claimableAmount);
  }, [claimableAmount]);

  useEffect(() => {
    const start = lastClaimAt ? new Date(lastClaimAt).getTime() : Date.now();
    const interval = setInterval(() => {
      const now = Date.now();
      const elapsed = Math.max(0, Math.floor((now - start) / 1000));
      setElapsedSeconds(elapsed);
      setLiveClaimable(claimableAmount + (elapsed * (miningRate / 3600)));
    }, 100);
    return () => clearInterval(interval);
  }, [lastClaimAt, claimableAmount, miningRate]);

  const formatElapsed = (sec: number) => {
    const hrs = Math.floor(sec / 3600);
    const mins = Math.floor((sec % 3600) / 60);
    const secs = sec % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins
      .toString()
      .padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const projected24h = (miningRate * 24).toFixed(2);

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fadeIn">
      {/* Reactor Visual Container */}
      <div className="crypto-card p-6 flex flex-col items-center justify-center text-center relative overflow-hidden bg-gradient-to-b from-[#161D2C] to-[#0B0E14]">
        <div className="text-xs uppercase font-extrabold tracking-widest text-[#F3BA2F] mb-1">
          Server-Side Mining Engine
        </div>
        <div className="text-xs text-[#8E9BAE] mb-6">
          Level {level} {levelLabel} · {miningRate.toFixed(2)} AGEN/hr
        </div>

        {/* Pulsing Orb Reactor */}
        <div className="relative w-48 h-48 flex items-center justify-center mb-6">
          {/* Outer glow ring */}
          <div className="absolute inset-0 rounded-full border border-[rgba(243,186,47,0.25)] pulse-reactor" />
          <div className="absolute inset-4 rounded-full border border-dashed border-[#0088CC]/40 animate-spin" style={{ animationDuration: '24s' }} />
          
          {/* Core */}
          <div className="w-32 h-32 rounded-full bg-gradient-to-br from-[#FFD269] via-[#F3BA2F] to-[#C99014] p-1 flex items-center justify-center shadow-2xl shadow-[rgba(243,186,47,0.35)]">
            <div className="w-full h-full rounded-full bg-[#0B0E14] flex flex-col items-center justify-center p-2 text-center">
              <Pickaxe className="w-8 h-8 text-[#F3BA2F] mb-1" />
              <span className="text-[10px] font-bold text-[#8E9BAE] uppercase">Mining Active</span>
            </div>
          </div>
        </div>

        {/* Live Accumulation Metric */}
        <div className="flex flex-col items-center">
          <div className="text-3xl sm:text-4xl font-black text-white font-mono tracking-tight">
            +{liveClaimable.toFixed(4)}{' '}
            <span className="text-sm font-bold text-[#F3BA2F]">AGEN</span>
          </div>
          <div className="text-xs text-[#8E9BAE] flex items-center gap-1.5 mt-1 font-mono">
            <Clock className="w-3.5 h-3.5 text-[#0088CC]" />
            Elapsed: {formatElapsed(elapsedSeconds)}
          </div>
        </div>

        {/* Claim Action */}
        <div className="w-full mt-6">
          <button
            onClick={onClaim}
            disabled={isClaiming || liveClaimable < 0.0001}
            className="gold-button w-full py-3.5 text-sm uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Sparkles className="w-4 h-4" />
            {isClaiming ? 'Broadcasting Claim Transaction...' : 'Claim Mining Rewards'}
          </button>
        </div>
      </div>

      {/* Accounting Metrics Grid */}
      <div className="grid grid-cols-2 gap-3">
        <div className="crypto-card p-4">
          <div className="text-xs text-[#8E9BAE] uppercase font-bold flex items-center gap-1.5">
            <Zap className="w-3.5 h-3.5 text-[#F3BA2F]" />
            Hourly Rate
          </div>
          <div className="text-xl font-extrabold text-white mt-1">
            {miningRate.toFixed(2)}{' '}
            <span className="text-xs font-normal text-[#8E9BAE]">AGEN/hr</span>
          </div>
          <div className="text-[11px] text-[#8E9BAE] mt-1">
            Tier {level} standard throughput
          </div>
        </div>

        <div className="crypto-card p-4">
          <div className="text-xs text-[#8E9BAE] uppercase font-bold flex items-center gap-1.5">
            <TrendingUp className="w-3.5 h-3.5 text-[#0088CC]" />
            24h Projected Yield
          </div>
          <div className="text-xl font-extrabold text-[#FFD269] mt-1">
            {projected24h}{' '}
            <span className="text-xs font-normal text-[#8E9BAE]">AGEN</span>
          </div>
          <div className="text-[11px] text-[#8E9BAE] mt-1">
            Zero downtime automatic accrual
          </div>
        </div>
      </div>

      {/* Upgrade Callout */}
      <div className="crypto-card p-4 bg-[#161D2C] border-[rgba(243,186,47,0.2)] flex items-center justify-between">
        <div>
          <div className="text-sm font-bold text-white">Boost Mining Capacity</div>
          <div className="text-xs text-[#8E9BAE] mt-0.5">
            Upgrade your level to multiply mining throughput up to 921.60 AGEN/hr
          </div>
        </div>
        <button
          onClick={() => onNavigate('levels')}
          className="ton-button px-4 py-2 text-xs font-bold whitespace-nowrap"
        >
          View Tiers &rarr;
        </button>
      </div>

      {/* Formula Explanation Accordion */}
      <div className="crypto-card p-4 text-xs text-[#8E9BAE] leading-relaxed">
        <div className="font-bold text-white uppercase tracking-wider text-[11px] mb-1.5 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Server-Enforced Math Model
        </div>
        <p className="font-mono bg-[#0B0E14] p-2.5 rounded-lg border border-white/5 text-[#FFD269] text-[11px]">
          Earned AGEN = Δt × Mining Rate (AGEN/hr)
        </p>
        <p className="mt-2">
          Where <span className="text-white">Δt = Current Server Timestamp - Last Claim Timestamp</span>.
          All balances are checked atomically in PostgreSQL on each harvest.
        </p>
      </div>
    </div>
  );
};
