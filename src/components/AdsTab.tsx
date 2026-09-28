import React, { useState } from 'react';
import { PlayCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import { AURA_AGEN_SETTINGS } from '../lib/auragen';

interface AdsTabProps {
  completedToday: number;
  dailyLimit: number;
  onInitiateAndClaimAd: () => Promise<void>;
  isLoading: boolean;
}

export const AdsTab: React.FC<AdsTabProps> = ({
  completedToday,
  dailyLimit,
  onInitiateAndClaimAd,
  isLoading,
}) => {
  const [statusMsg, setStatusMsg] = useState<string | null>(null);
  const remaining = Math.max(0, dailyLimit - completedToday);
  const isLimitReached = completedToday >= dailyLimit;

  const handleWatchAd = async () => {
    if (isLimitReached) {
      setStatusMsg('Daily ad limit reached. Resets at 00:00 UTC.');
      return;
    }

    try {
      setStatusMsg('Initiating cryptographically signed ad session...');
      await onInitiateAndClaimAd();
      setStatusMsg(null);
    } catch (err: any) {
      setStatusMsg(err.message || 'Ad session failed to complete.');
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="crypto-card p-5 bg-gradient-to-b from-[#161D2C] to-[#111622]">
        <div className="text-xs uppercase font-extrabold tracking-widest text-[#F3BA2F] mb-1">
          Monetag Ad Session Engine
        </div>
        <h2 className="text-2xl font-black text-white">Daily Ad Vault</h2>
        <p className="text-xs text-[#8E9BAE] mt-1 leading-relaxed">
          Watch short sponsored media to claim instant $AGEN tokens. Each session is validated server-side
          via single-use cryptographic nonces.
        </p>
      </div>

      {/* Quota Tracker Card */}
      <div className="crypto-card p-5 bg-[#111622] border-[rgba(243,186,47,0.25)]">
        <div className="flex items-center justify-between mb-2">
          <span className="text-xs text-[#8E9BAE] uppercase font-bold">Daily Allocation Quota</span>
          <span className="text-sm font-black text-white">
            {completedToday} / {dailyLimit}{' '}
            <span className="text-xs text-[#8E9BAE] font-normal">Completed</span>
          </span>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-[#0B0E14] h-2.5 rounded-full overflow-hidden border border-white/5 mb-4">
          <div
            className="h-full bg-gradient-to-r from-[#F3BA2F] to-[#FFD269] rounded-full transition-all duration-300"
            style={{ width: `${Math.min(100, (completedToday / dailyLimit) * 100)}%` }}
          />
        </div>

        <div className="grid grid-cols-2 gap-3 text-xs mb-5">
          <div className="p-3 bg-[#0B0E14] rounded-xl border border-white/5">
            <span className="text-[#8E9BAE] text-[10px] uppercase font-bold block">Reward Per Ad</span>
            <span className="text-lg font-black text-[#FFD269]">
              +{AURA_AGEN_SETTINGS.ad_reward}.00 AGEN
            </span>
          </div>
          <div className="p-3 bg-[#0B0E14] rounded-xl border border-white/5">
            <span className="text-[#8E9BAE] text-[10px] uppercase font-bold block">Sessions Left Today</span>
            <span className="text-lg font-black text-white">{remaining}</span>
          </div>
        </div>

        {statusMsg && (
          <div className="p-3 mb-4 rounded-xl bg-[#0B0E14] border border-[#F3BA2F]/30 text-xs text-[#FFD269] flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        <button
          onClick={handleWatchAd}
          disabled={isLoading || isLimitReached}
          className="gold-button w-full py-4 text-sm uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
        >
          <PlayCircle className="w-5 h-5" />
          {isLoading
            ? 'Running Ad & Verifying...'
            : isLimitReached
            ? 'Daily Quota Completed (10/10)'
            : 'Watch Sponsored Ad (+1.00 AGEN)'}
        </button>
      </div>

      {/* Protocol Nonce Verification Specs */}
      <div className="crypto-card p-4 text-xs text-[#8E9BAE] leading-relaxed">
        <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Cryptographic Nonce Security
        </div>
        <p>
          Monetag Zone: <span className="font-mono text-[#FFD269]">11862041</span>.
          Every ad session requests a time-bound single-use cryptographic token expiring in 5 minutes.
          Rewards are strictly disbursed server-side only upon receipt of the authentic nonce.
        </p>
      </div>
    </div>
  );
};
