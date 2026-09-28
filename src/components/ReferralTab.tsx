import React, { useState } from 'react';
import { Users, Copy, Check, Share2, ShieldAlert, Sparkles } from 'lucide-react';
import { ReferralItem } from '../api';
import { AURA_AGEN_SETTINGS } from '../lib/auragen';

interface ReferralTabProps {
  telegramId?: number;
  referralCode?: string;
  referralCount: number;
  referralsList: ReferralItem[];
  isLoadingList: boolean;
}

export const ReferralTab: React.FC<ReferralTabProps> = ({
  telegramId,
  referralCode,
  referralCount,
  referralsList,
  isLoadingList,
}) => {
  const [isCopied, setIsCopied] = useState(false);

  const refParam = referralCode || (telegramId ? `ref_${telegramId}` : 'ref');
  const referralLink = `https://t.me/${AURA_AGEN_SETTINGS.bot_username}?start=${encodeURIComponent(refParam)}`;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setIsCopied(true);
      setTimeout(() => setIsCopied(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleShare = () => {
    const text = encodeURIComponent(
      `🚀 Join me on AURA_AGEN ($AGEN) and start mining crypto on TON Mainnet! Earn 50 AGEN instantly:`
    );
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${text}`;

    const webApp = window.Telegram?.WebApp;
    if (typeof webApp?.openTelegramLink === 'function') {
      webApp.openTelegramLink(shareUrl);
    } else {
      window.open(shareUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const totalEarned = referralCount * AURA_AGEN_SETTINGS.referral_reward;

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="crypto-card p-5 bg-gradient-to-b from-[#161D2C] to-[#111622]">
        <div className="text-xs uppercase font-extrabold tracking-widest text-[#F3BA2F] mb-1">
          Decentralized Referral Bounty
        </div>
        <h2 className="text-2xl font-black text-white">Invite & Earn 50 AGEN</h2>
        <p className="text-xs text-[#8E9BAE] mt-1 leading-relaxed">
          Grow the AURA_AGEN mining network. Receive an instant 50 AGEN credit directly to your ledger for
          every verified new miner who joins with your link.
        </p>
      </div>

      {/* Stats Overview */}
      <div className="grid grid-cols-2 gap-3">
        <div className="crypto-card p-4">
          <div className="text-xs text-[#8E9BAE] uppercase font-bold flex items-center gap-1.5">
            <Users className="w-3.5 h-3.5 text-[#0088CC]" />
            Total Invited
          </div>
          <div className="text-2xl font-black text-white mt-1">{referralCount}</div>
          <div className="text-[11px] text-[#8E9BAE]">Unique miners</div>
        </div>

        <div className="crypto-card p-4">
          <div className="text-xs text-[#8E9BAE] uppercase font-bold flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-[#F3BA2F]" />
            Total Bounty Earned
          </div>
          <div className="text-2xl font-black text-[#FFD269] mt-1">
            {totalEarned.toLocaleString()}{' '}
            <span className="text-xs font-normal text-[#8E9BAE]">AGEN</span>
          </div>
          <div className="text-[11px] text-[#8E9BAE]">50 AGEN per referral</div>
        </div>
      </div>

      {/* Referral Link Box */}
      <div className="crypto-card p-5 bg-[#111622] border-[rgba(243,186,47,0.25)]">
        <div className="text-xs text-[#8E9BAE] uppercase font-bold mb-2">
          Your Personal Invitation Link
        </div>
        <div className="flex items-center gap-2 bg-[#0B0E14] p-2 rounded-xl border border-white/5 mb-3">
          <input
            type="text"
            readOnly
            value={referralLink}
            className="flex-1 bg-transparent text-xs text-white font-mono truncate px-1 focus:outline-none"
          />
          <button
            onClick={handleCopy}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white transition shrink-0"
            title="Copy link"
          >
            {isCopied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>

        <div className="flex gap-2.5">
          <button
            onClick={handleShare}
            className="gold-button flex-1 py-3 text-xs uppercase tracking-wider flex items-center justify-center gap-2"
          >
            <Share2 className="w-4 h-4" />
            Share in Telegram
          </button>
          <button
            onClick={handleCopy}
            className="ton-button px-4 py-3 text-xs font-bold flex items-center justify-center gap-1.5"
          >
            {isCopied ? 'Copied!' : 'Copy Link'}
          </button>
        </div>
      </div>

      {/* Referred Friends List */}
      <div className="crypto-card p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#8E9BAE] mb-3 flex items-center justify-between">
          <span>Referred Miners Ledger</span>
          <span className="text-white font-mono">{referralsList.length}</span>
        </div>

        {isLoadingList ? (
          <div className="p-4 text-center text-xs text-[#8E9BAE]">Loading referral network...</div>
        ) : referralsList.length === 0 ? (
          <div className="p-6 text-center text-xs text-[#8E9BAE] bg-[#0B0E14] rounded-xl border border-white/5">
            <Users className="w-8 h-8 text-[#5E697A] mx-auto mb-2 opacity-50" />
            No friends invited yet. Share your unique link above to claim 50 AGEN per friend!
          </div>
        ) : (
          <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
            {referralsList.map((item, idx) => (
              <div
                key={idx}
                className="p-2.5 bg-[#0B0E14] rounded-xl border border-white/5 flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-[#0088CC]/10 text-[#0088CC] flex items-center justify-center font-bold text-xs">
                    {idx + 1}
                  </div>
                  <div>
                    <div className="font-bold text-white">
                      {item.username ? `@${item.username}` : item.first_name || `Miner #${item.telegram_id}`}
                    </div>
                    <div className="text-[10px] text-[#8E9BAE]">
                      {new Date(item.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>
                <div className="font-bold text-[#FFD269] text-xs">+50 AGEN</div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Security Anti-Abuse notice */}
      <div className="crypto-card p-4 text-xs text-[#8E9BAE] leading-relaxed">
        <div className="font-bold text-white text-[11px] uppercase tracking-wider mb-1 flex items-center gap-1.5">
          <ShieldAlert className="w-4 h-4 text-amber-400" />
          Anti-Sybil Guards
        </div>
        Self-referrals and duplicate accounts are strictly rejected by PostgreSQL schema constraints.
        Bounties are automatically issued on user creation inside an atomic transaction.
      </div>
    </div>
  );
};
