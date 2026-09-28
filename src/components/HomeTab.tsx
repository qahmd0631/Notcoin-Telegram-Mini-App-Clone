import React, { useEffect, useState } from 'react';
import {
  Pickaxe,
  TrendingUp,
  PlayCircle,
  Users,
  CheckSquare,
  ArrowUpRight,
  Sparkles,
  Zap,
} from 'lucide-react';
import { TabKey } from './Navigation';
import { getLevelProgress, getNextLevelDefinition } from '../lib/auragen';

interface HomeTabProps {
  balance: number;
  miningRate: number;
  level: number;
  levelLabel: string;
  claimableAmount: number;
  onClaim: () => Promise<void>;
  isClaiming: boolean;
  onNavigate: (tab: TabKey) => void;
  adsCompletedToday: number;
  dailyAdLimit: number;
  referralCount: number;
}

export const HomeTab: React.FC<HomeTabProps> = ({
  balance,
  miningRate,
  level,
  levelLabel,
  claimableAmount,
  onClaim,
  isClaiming,
  onNavigate,
  adsCompletedToday,
  dailyAdLimit,
  referralCount,
}) => {
  // Live ticker for claimable balance
  const [liveClaimable, setLiveClaimable] = useState(claimableAmount);

  useEffect(() => {
    setLiveClaimable(claimableAmount);
  }, [claimableAmount]);

  useEffect(() => {
    // Increment continuously based on mining rate (rate per 3600 seconds)
    const interval = setInterval(() => {
      setLiveClaimable((prev) => prev + (miningRate / 3600) * 0.1);
    }, 100);
    return () => clearInterval(interval);
  }, [miningRate]);

  const nextLevel = getNextLevelDefinition(level);
  const progressPct = getLevelProgress(level, balance);

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fadeIn">
      {/* Primary Balance Hero */}
      <div className="crypto-card p-5 relative overflow-hidden bg-gradient-to-b from-[#161D2C] to-[#111622]">
        <div className="absolute top-0 right-0 w-36 h-36 bg-[#F3BA2F]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="flex items-center justify-between text-xs text-[#8E9BAE] mb-1">
          <span className="uppercase tracking-widest font-bold text-[11px] text-[#F3BA2F]">
            Stored Protocol Balance
          </span>
          <span className="flex items-center gap-1 font-semibold text-white/80">
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            Live Ledger
          </span>
        </div>

        <div className="flex items-baseline gap-2 mt-1">
          <span className="text-4xl sm:text-5xl font-extrabold tracking-tight text-white">
            {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}
          </span>
          <span className="text-lg font-bold text-[#F3BA2F]">$AGEN</span>
        </div>

        {/* Level Progression Bar */}
        <div className="mt-4 pt-3 border-t border-[rgba(243,186,47,0.1)]">
          <div className="flex justify-between items-center text-xs mb-1.5">
            <span className="text-[#8E9BAE]">
              Tier {level} ({levelLabel})
            </span>
            <span className="text-[#FFD269] font-medium">
              Next: Lv.{nextLevel.level} ({nextLevel.agen_amount.toLocaleString()} AGEN)
            </span>
          </div>
          <div className="w-full bg-[#0B0E14] h-2 rounded-full overflow-hidden border border-white/5">
            <div
              className="h-full bg-gradient-to-r from-[#F3BA2F] via-[#FFD269] to-[#0088CC] rounded-full transition-all duration-500"
              style={{ width: `${progressPct}%` }}
            />
          </div>
        </div>
      </div>

      {/* Mining Reactor Card */}
      <div className="crypto-card p-4 bg-[#111622] flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-xl bg-[rgba(243,186,47,0.12)] border border-[rgba(243,186,47,0.25)] flex items-center justify-center text-[#F3BA2F]">
              <Pickaxe className="w-5 h-5 animate-bounce" style={{ animationDuration: '2s' }} />
            </div>
            <div>
              <div className="text-xs text-[#8E9BAE] uppercase font-bold tracking-wider">
                Unclaimed Mining Yield
              </div>
              <div className="text-xl font-black text-[#FFD269] font-mono">
                +{liveClaimable.toFixed(4)} <span className="text-xs text-[#8E9BAE]">AGEN</span>
              </div>
            </div>
          </div>
          <div className="text-right">
            <div className="text-[10px] text-[#8E9BAE] uppercase font-bold">Mining Speed</div>
            <div className="text-sm font-extrabold text-[#0088CC] flex items-center justify-end gap-1">
              <Zap className="w-3.5 h-3.5" />
              {miningRate.toFixed(2)}/hr
            </div>
          </div>
        </div>

        <button
          onClick={onClaim}
          disabled={isClaiming || liveClaimable < 0.0001}
          className="gold-button w-full py-3 text-sm flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <Sparkles className="w-4 h-4" />
          {isClaiming ? 'Harvesting Server Yield...' : 'Claim Accumulated AGEN'}
        </button>
      </div>

      {/* Quick Action Hub */}
      <div>
        <div className="text-xs font-bold uppercase tracking-wider text-[#8E9BAE] mb-2 px-1">
          Ecosystem Navigation
        </div>
        <div className="grid grid-cols-3 gap-2.5">
          <button
            onClick={() => onNavigate('mining')}
            className="crypto-card p-3 flex flex-col items-center justify-center text-center hover:border-[#F3BA2F]/40 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#F3BA2F]/10 text-[#F3BA2F] flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <Pickaxe className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Mining Hub</span>
            <span className="text-[10px] text-[#8E9BAE] mt-0.5">{miningRate}/hr active</span>
          </button>

          <button
            onClick={() => onNavigate('levels')}
            className="crypto-card p-3 flex flex-col items-center justify-center text-center hover:border-[#F3BA2F]/40 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-[#0088CC]/10 text-[#0088CC] flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <TrendingUp className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">12 Levels</span>
            <span className="text-[10px] text-[#8E9BAE] mt-0.5">Tier {level} of 12</span>
          </button>

          <button
            onClick={() => onNavigate('tasks')}
            className="crypto-card p-3 flex flex-col items-center justify-center text-center hover:border-[#F3BA2F]/40 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-purple-500/10 text-purple-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <CheckSquare className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Tasks</span>
            <span className="text-[10px] text-[#8E9BAE] mt-0.5">+2 AGEN bounty</span>
          </button>

          <button
            onClick={() => onNavigate('ads')}
            className="crypto-card p-3 flex flex-col items-center justify-center text-center hover:border-[#F3BA2F]/40 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 text-amber-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <PlayCircle className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Daily Ads</span>
            <span className="text-[10px] text-[#8E9BAE] mt-0.5">
              {adsCompletedToday}/{dailyAdLimit} done
            </span>
          </button>

          <button
            onClick={() => onNavigate('referral')}
            className="crypto-card p-3 flex flex-col items-center justify-center text-center hover:border-[#F3BA2F]/40 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <Users className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Referrals</span>
            <span className="text-[10px] text-[#8E9BAE] mt-0.5">{referralCount} invited</span>
          </button>

          <button
            onClick={() => onNavigate('withdraw')}
            className="crypto-card p-3 flex flex-col items-center justify-center text-center hover:border-[#F3BA2F]/40 transition group"
          >
            <div className="w-10 h-10 rounded-xl bg-rose-500/10 text-rose-400 flex items-center justify-center mb-1.5 group-hover:scale-110 transition">
              <ArrowUpRight className="w-5 h-5" />
            </div>
            <span className="text-xs font-bold text-white">Vault</span>
            <span className="text-[10px] text-[#8E9BAE] mt-0.5">Withdrawals</span>
          </button>
        </div>
      </div>

      {/* Referral Bounty Promo Banner */}
      <div
        onClick={() => onNavigate('referral')}
        className="crypto-card p-4 bg-gradient-to-r from-[rgba(243,186,47,0.12)] to-[rgba(0,136,204,0.12)] border-[rgba(243,186,47,0.25)] flex items-center justify-between cursor-pointer hover:border-[#F3BA2F] transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-[#F3BA2F] text-[#0B0E14] flex items-center justify-center font-black">
            50
          </div>
          <div>
            <div className="text-sm font-bold text-white">Instant Referral Bounty</div>
            <div className="text-xs text-[#8E9BAE]">Earn 50 AGEN per unique verified friend</div>
          </div>
        </div>
        <span className="text-xs text-[#F3BA2F] font-bold">Invite &rarr;</span>
      </div>
    </div>
  );
};
