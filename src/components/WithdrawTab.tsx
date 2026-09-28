import React, { useState } from 'react';
import { ArrowUpRight, Lock, Unlock, AlertCircle, CheckCircle2 } from 'lucide-react';
import { AURA_AGEN_SETTINGS } from '../lib/auragen';

interface WithdrawTabProps {
  balance: number;
  withdrawalsEnabled: boolean;
  onWithdraw: (amount: number, address: string) => Promise<void>;
  isSubmitting: boolean;
  connectedWallet?: string;
  onToggleWithdrawals?: (enabled: boolean) => Promise<void>;
}

export const WithdrawTab: React.FC<WithdrawTabProps> = ({
  balance,
  withdrawalsEnabled,
  onWithdraw,
  isSubmitting,
  connectedWallet,
  onToggleWithdrawals,
}) => {
  const [amountStr, setAmountStr] = useState('1000');
  const [destAddress, setDestAddress] = useState(connectedWallet || '');
  const [statusMsg, setStatusMsg] = useState<{ type: 'error' | 'success'; text: string } | null>(
    null
  );

  const minWithdrawal = AURA_AGEN_SETTINGS.withdrawal_minimum; // 1,000 AGEN

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(amountStr);

    if (isNaN(amount) || amount < minWithdrawal) {
      setStatusMsg({
        type: 'error',
        text: `Minimum withdrawal amount is ${minWithdrawal.toLocaleString()} AGEN`,
      });
      return;
    }

    if (amount > balance) {
      setStatusMsg({
        type: 'error',
        text: `Insufficient AGEN balance. Available: ${balance.toFixed(2)} AGEN`,
      });
      return;
    }

    if (!destAddress.trim()) {
      setStatusMsg({
        type: 'error',
        text: 'Please specify a destination TON wallet address',
      });
      return;
    }

    try {
      setStatusMsg(null);
      await onWithdraw(amount, destAddress.trim());
      setStatusMsg({
        type: 'success',
        text: `Successfully initiated withdrawal of ${amount.toLocaleString()} AGEN! Status: Pending review.`,
      });
    } catch (err: any) {
      setStatusMsg({
        type: 'error',
        text: err.message || 'Withdrawal submission failed',
      });
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="crypto-card p-5 bg-gradient-to-b from-[#161D2C] to-[#111622]">
        <div className="text-xs uppercase font-extrabold tracking-widest text-rose-400 mb-1">
          Managed Withdrawal Vault
        </div>
        <h2 className="text-2xl font-black text-white">Withdraw $AGEN</h2>
        <p className="text-xs text-[#8E9BAE] mt-1 leading-relaxed">
          Submit on-chain withdrawal requests to your TON wallet address. Balances are locked and
          deducted atomically upon submission.
        </p>
      </div>

      {/* Protocol Master Switch Banner */}
      <div
        className={`crypto-card p-4 flex items-center justify-between gap-3 border ${
          withdrawalsEnabled
            ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
            : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
        }`}
      >
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center ${
              withdrawalsEnabled ? 'bg-emerald-500/20' : 'bg-rose-500/20'
            }`}
          >
            {withdrawalsEnabled ? <Unlock className="w-5 h-5" /> : <Lock className="w-5 h-5" />}
          </div>
          <div>
            <div className="text-xs font-bold uppercase tracking-wider">
              Protocol Vault Status:{' '}
              <span className="font-black">{withdrawalsEnabled ? 'OPEN' : 'LOCKED'}</span>
            </div>
            <div className="text-[11px] text-[#8E9BAE]">
              {withdrawalsEnabled
                ? 'Withdrawals are currently active. Minimum 1,000 AGEN.'
                : 'Withdrawals are locked by protocol governance until TGE/DEX listing.'}
            </div>
          </div>
        </div>
      </div>

      {/* Withdrawal Form */}
      <div className="crypto-card p-5 bg-[#111622]">
        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <div>
            <label className="text-xs text-[#8E9BAE] uppercase font-bold block mb-1.5">
              Available Balance
            </label>
            <div className="text-2xl font-black text-white font-mono">
              {balance.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 4 })}{' '}
              <span className="text-sm font-bold text-[#F3BA2F]">AGEN</span>
            </div>
          </div>

          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-xs text-[#8E9BAE] uppercase font-bold">Withdraw Amount</label>
              <span className="text-[11px] text-[#8E9BAE]">
                Min: {minWithdrawal.toLocaleString()} AGEN
              </span>
            </div>
            <div className="relative">
              <input
                type="number"
                min={minWithdrawal}
                step="any"
                value={amountStr}
                onChange={(e) => setAmountStr(e.target.value)}
                placeholder="1000"
                className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-3 text-sm text-white font-mono focus:outline-none focus:border-[#F3BA2F]"
              />
              <button
                type="button"
                onClick={() => setAmountStr(Math.floor(balance).toString())}
                className="absolute right-2 top-2 px-2.5 py-1 text-[11px] font-bold bg-[#F3BA2F]/15 text-[#FFD269] rounded-lg hover:bg-[#F3BA2F]/25 transition"
              >
                MAX
              </button>
            </div>
          </div>

          <div>
            <label className="text-xs text-[#8E9BAE] uppercase font-bold block mb-1.5">
              Destination TON Wallet Address
            </label>
            <input
              type="text"
              value={destAddress}
              onChange={(e) => setDestAddress(e.target.value)}
              placeholder="e.g. UQA0N60XaN9c1l5DvOoQcnXWEX7YEFvNaETOnenlk3iSCPX5"
              className="w-full bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-3 text-xs text-white font-mono focus:outline-none focus:border-[#F3BA2F]"
            />
          </div>

          {statusMsg && (
            <div
              className={`p-3 rounded-xl border text-xs flex items-center gap-2 ${
                statusMsg.type === 'success'
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                  : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
              }`}
            >
              {statusMsg.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 shrink-0" />
              ) : (
                <AlertCircle className="w-4 h-4 shrink-0" />
              )}
              <span>{statusMsg.text}</span>
            </div>
          )}

          <button
            type="submit"
            disabled={isSubmitting || !withdrawalsEnabled || balance < minWithdrawal}
            className="gold-button w-full py-4 text-xs uppercase tracking-wider flex items-center justify-center gap-2 disabled:opacity-50"
          >
            <ArrowUpRight className="w-4 h-4" />
            {isSubmitting
              ? 'Submitting...'
              : !withdrawalsEnabled
              ? 'Withdrawals Locked by Protocol'
              : balance < minWithdrawal
              ? `Balance Below Minimum (${minWithdrawal} AGEN)`
              : 'Submit Withdrawal Request'}
          </button>
        </form>
      </div>

      {/* Admin Governance Demonstration Switch */}
      {onToggleWithdrawals && (
        <div className="crypto-card p-4 border-dashed border-white/10 bg-[#0B0E14]/80 flex items-center justify-between">
          <div>
            <span className="text-xs font-bold text-white block">Protocol Governance Toggle</span>
            <span className="text-[11px] text-[#8E9BAE]">
              Test both locked and unlocked vault workflows
            </span>
          </div>
          <button
            onClick={() => onToggleWithdrawals(!withdrawalsEnabled)}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition ${
              withdrawalsEnabled
                ? 'bg-rose-500/20 border-rose-500/40 text-rose-300'
                : 'bg-emerald-500/20 border-emerald-500/40 text-emerald-300'
            }`}
          >
            {withdrawalsEnabled ? 'Lock Vault (Default)' : 'Enable Vault (Test Mode)'}
          </button>
        </div>
      )}
    </div>
  );
};
