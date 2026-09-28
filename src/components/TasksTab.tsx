import React, { useState } from 'react';
import { Send, CheckCircle2, ExternalLink, Sparkles, ShieldCheck } from 'lucide-react';
import { AURA_AGEN_SETTINGS } from '../lib/auragen';

interface TasksTabProps {
  completedTasks: string[];
  onClaimTask: (taskId: string) => Promise<void>;
  isClaiming: boolean;
}

export const TasksTab: React.FC<TasksTabProps> = ({
  completedTasks,
  onClaimTask,
  isClaiming,
}) => {
  const [openedChannel, setOpenedChannel] = useState(false);
  const isChannelCompleted = completedTasks.includes('telegram_channel');

  const handleOpenChannel = () => {
    setOpenedChannel(true);
    const channelUrl = AURA_AGEN_SETTINGS.telegram_channel;
    const webApp = window.Telegram?.WebApp;
    if (typeof webApp?.openTelegramLink === 'function') {
      webApp.openTelegramLink(channelUrl);
    } else {
      window.open(channelUrl, '_blank', 'noopener,noreferrer');
    }
  };

  const handleVerifyChannel = async () => {
    await onClaimTask('telegram_channel');
  };

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="crypto-card p-5 bg-gradient-to-b from-[#161D2C] to-[#111622]">
        <div className="text-xs uppercase font-extrabold tracking-widest text-[#F3BA2F] mb-1">
          Mission & Bounty Center
        </div>
        <h2 className="text-2xl font-black text-white">Ecosystem Quests</h2>
        <p className="text-xs text-[#8E9BAE] mt-1 leading-relaxed">
          Complete official protocol missions to earn instant $AGEN token allocations directly to your balance.
        </p>
      </div>

      {/* Main Telegram Channel Task Card */}
      <div className="crypto-card p-5 border-[rgba(243,186,47,0.25)] bg-[#111622]">
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[#0088CC]/15 border border-[#0088CC]/30 flex items-center justify-center text-[#0088CC] shrink-0">
              <Send className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-sm font-black text-white">Join @NEW_AURA_GEN Channel</span>
                <span className="text-[10px] bg-purple-500/20 text-purple-300 font-bold px-1.5 py-0.5 rounded">
                  Official
                </span>
              </div>
              <p className="text-xs text-[#8E9BAE] mt-0.5">
                Subscribe to our main broadcast channel for network announcements and airdrop snapshots.
              </p>
            </div>
          </div>
          <div className="text-right shrink-0">
            <span className="text-xs font-black text-[#FFD269] block">+2.00 AGEN</span>
            <span className="text-[10px] text-[#8E9BAE]">One-time</span>
          </div>
        </div>

        <div className="mt-4 pt-4 border-t border-white/5 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="text-xs text-[#8E9BAE] flex items-center gap-1.5 self-start sm:self-center">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            Server-verified membership
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            {isChannelCompleted ? (
              <div className="w-full sm:w-auto py-2.5 px-4 bg-emerald-500/10 border border-emerald-500/30 rounded-xl text-emerald-400 text-xs font-bold flex items-center justify-center gap-1.5">
                <CheckCircle2 className="w-4 h-4" />
                Completed & Rewarded
              </div>
            ) : (
              <>
                <button
                  onClick={handleOpenChannel}
                  className="ton-button flex-1 sm:flex-initial py-2.5 px-4 text-xs flex items-center justify-center gap-1.5"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Open Channel
                </button>
                <button
                  onClick={handleVerifyChannel}
                  disabled={isClaiming || !openedChannel}
                  className="gold-button flex-1 sm:flex-initial py-2.5 px-4 text-xs flex items-center justify-center gap-1.5 disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  {isClaiming ? 'Verifying...' : 'Verify & Claim'}
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Upcoming Quests */}
      <div className="crypto-card p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#8E9BAE] mb-3">
          Upcoming Protocol Quests
        </div>
        <div className="flex flex-col gap-2">
          <div className="p-3 bg-[#0B0E14] rounded-xl border border-white/5 flex items-center justify-between opacity-75">
            <div>
              <div className="text-xs font-bold text-white">Join AURA_AGEN Discussion Group</div>
              <div className="text-[11px] text-[#8E9BAE]">Engage with community miners</div>
            </div>
            <span className="text-xs font-semibold text-[#8E9BAE]">+1.5 AGEN · Coming Soon</span>
          </div>

          <div className="p-3 bg-[#0B0E14] rounded-xl border border-white/5 flex items-center justify-between opacity-75">
            <div>
              <div className="text-xs font-bold text-white">Follow X/Twitter Announcements</div>
              <div className="text-[11px] text-[#8E9BAE]">Track major listing updates</div>
            </div>
            <span className="text-xs font-semibold text-[#8E9BAE]">+3 AGEN · Coming Soon</span>
          </div>
        </div>
      </div>
    </div>
  );
};
