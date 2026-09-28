import React from 'react';
import { History, ArrowDownLeft, ArrowUpRight, Pickaxe, Award, PlayCircle, Zap } from 'lucide-react';
import { TransactionRecord } from '../api';

interface HistoryTabProps {
  transactions: TransactionRecord[];
  isLoading: boolean;
}

export const HistoryTab: React.FC<HistoryTabProps> = ({ transactions, isLoading }) => {
  const getIcon = (type: string) => {
    switch (type) {
      case 'MINING_CLAIM':
        return <Pickaxe className="w-4 h-4 text-[#F3BA2F]" />;
      case 'AD_REWARD':
        return <PlayCircle className="w-4 h-4 text-amber-400" />;
      case 'TASK_REWARD':
        return <Award className="w-4 h-4 text-purple-400" />;
      case 'REFERRAL_BOUNTY':
        return <ArrowDownLeft className="w-4 h-4 text-emerald-400" />;
      case 'LEVEL_UPGRADE':
        return <Zap className="w-4 h-4 text-[#0088CC]" />;
      case 'WITHDRAWAL_PENDING':
        return <ArrowUpRight className="w-4 h-4 text-rose-400" />;
      default:
        return <History className="w-4 h-4 text-white" />;
    }
  };

  const getFormatType = (type: string) => {
    switch (type) {
      case 'MINING_CLAIM':
        return 'Mining Harvest';
      case 'AD_REWARD':
        return 'Ad Session Reward';
      case 'TASK_REWARD':
        return 'Mission Bounty';
      case 'REFERRAL_BOUNTY':
        return 'Referral Bonus';
      case 'LEVEL_UPGRADE':
        return 'Tier Upgrade';
      case 'WITHDRAWAL_PENDING':
        return 'Withdrawal Request';
      default:
        return type;
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="crypto-card p-5 bg-gradient-to-b from-[#161D2C] to-[#111622]">
        <div className="text-xs uppercase font-extrabold tracking-widest text-[#F3BA2F] mb-1">
          PostgreSQL Audit Ledger
        </div>
        <h2 className="text-2xl font-black text-white">Transaction History</h2>
        <p className="text-xs text-[#8E9BAE] mt-1 leading-relaxed">
          Immutable server-side transaction logs with precise pre- and post-balances.
        </p>
      </div>

      {/* Transactions List */}
      <div className="crypto-card p-4">
        {isLoading ? (
          <div className="p-6 text-center text-xs text-[#8E9BAE]">Loading ledger records...</div>
        ) : transactions.length === 0 ? (
          <div className="p-8 text-center text-xs text-[#8E9BAE] bg-[#0B0E14] rounded-xl border border-white/5">
            <History className="w-8 h-8 text-[#5E697A] mx-auto mb-2 opacity-50" />
            No ledger transactions yet. Claim your first mining reward or watch an ad to populate the ledger.
          </div>
        ) : (
          <div className="flex flex-col gap-2.5">
            {transactions.map((tx) => {
              const isPositive = tx.amount >= 0;
              return (
                <div
                  key={tx.id}
                  className="p-3 bg-[#0B0E14] rounded-xl border border-white/5 flex items-center justify-between gap-3 text-xs"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white/5 flex items-center justify-center shrink-0">
                      {getIcon(tx.type)}
                    </div>
                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5">
                        {getFormatType(tx.type)}
                      </div>
                      <div className="text-[11px] text-[#8E9BAE] truncate max-w-[170px] sm:max-w-xs">
                        {tx.description || tx.reference_id || 'Protocol Operation'}
                      </div>
                      <div className="text-[10px] text-[#5E697A] mt-0.5 font-mono">
                        {new Date(tx.created_at).toLocaleString()}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <div
                      className={`font-black font-mono text-sm ${
                        isPositive ? 'text-[#FFD269]' : 'text-rose-400'
                      }`}
                    >
                      {isPositive ? `+${tx.amount.toFixed(4)}` : `${tx.amount.toFixed(4)}`} AGEN
                    </div>
                    <div className="text-[10px] text-[#5E697A] font-mono">
                      Bal: {tx.balance_after.toFixed(2)}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
