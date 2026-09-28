import React, { useState } from 'react';
import { useTonConnectUI, useTonWallet } from '@tonconnect/ui-react';
import { Zap, CheckCircle2, Copy, Check } from 'lucide-react';
import { LEVELS, AURA_AGEN_SETTINGS } from '../lib/auragen';

interface LevelsTabProps {
  currentLevel: number;
  userBalance?: number;
  onUpgrade: (targetLevel: number, txHash: string, walletAddress?: string) => Promise<void>;
  isUpgrading: boolean;
}

export const LevelsTab: React.FC<LevelsTabProps> = ({
  currentLevel,
  onUpgrade,
  isUpgrading,
}) => {
  const [tonConnectUI] = useTonConnectUI();
  const wallet = useTonWallet();
  const [selectedLevel, setSelectedLevel] = useState<number>(Math.min(currentLevel + 1, 12));
  const [manualTxHash, setManualTxHash] = useState('');
  const [isCopiedTreasury, setIsCopiedTreasury] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);

  const targetLevelMeta = LEVELS.find((l) => l.level === selectedLevel) || LEVELS[1];

  const handleCopyTreasury = async () => {
    try {
      await navigator.clipboard.writeText(AURA_AGEN_SETTINGS.ton_receiver_wallet);
      setIsCopiedTreasury(true);
      setTimeout(() => setIsCopiedTreasury(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleTonConnectPayment = async () => {
    if (!wallet) {
      tonConnectUI.openModal();
      return;
    }

    try {
      setStatusMessage('Preparing TON transaction...');
      const nanoTon = Math.round(targetLevelMeta.ton_amount * 1e9);

      const transaction = {
        validUntil: Math.floor(Date.now() / 1000) + 360,
        messages: [
          {
            address: AURA_AGEN_SETTINGS.ton_receiver_wallet,
            amount: nanoTon.toString(),
            payload: `Level ${selectedLevel} Upgrade`,
          },
        ],
      };

      const result = await tonConnectUI.sendTransaction(transaction);
      setStatusMessage('Transaction broadcasted! Verifying on server...');

      // Use the transaction BOC or hash
      const txHash = result.boc || `ton_tx_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      await onUpgrade(selectedLevel, txHash, wallet.account.address);
      setStatusMessage(null);
    } catch (err: any) {
      console.error('TON transaction failed:', err);
      setStatusMessage(err.message || 'Transaction was canceled or failed');
    }
  };

  const handleManualUpgrade = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualTxHash.trim()) {
      setStatusMessage('Please enter a valid TON transaction hash');
      return;
    }
    try {
      setStatusMessage('Verifying on server ledger...');
      await onUpgrade(selectedLevel, manualTxHash.trim(), wallet?.account?.address);
      setManualTxHash('');
      setStatusMessage(null);
    } catch (err: any) {
      setStatusMessage(err.message || 'Verification failed');
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fadeIn">
      {/* Header Summary */}
      <div className="crypto-card p-5 bg-gradient-to-b from-[#161D2C] to-[#111622]">
        <div className="text-xs uppercase font-extrabold tracking-widest text-[#F3BA2F] mb-1">
          12-Tier Level Progression Matrix
        </div>
        <h2 className="text-2xl font-black text-white">Tier {currentLevel} Miner</h2>
        <p className="text-xs text-[#8E9BAE] mt-1 leading-relaxed">
          Upgrade with exact TON deposit directly to the protocol treasury to permanently accelerate
          your mining speed up to 921.60 AGEN/hr.
        </p>

        {/* Treasury info box */}
        <div className="mt-4 p-3 bg-[#0B0E14] rounded-xl border border-white/5 flex items-center justify-between gap-2">
          <div className="min-w-0">
            <div className="text-[10px] text-[#8E9BAE] uppercase font-bold">
              TON Receiving Treasury (Mainnet)
            </div>
            <div className="text-xs text-[#FFD269] font-mono truncate">
              {AURA_AGEN_SETTINGS.ton_receiver_wallet}
            </div>
          </div>
          <button
            onClick={handleCopyTreasury}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white shrink-0"
            title="Copy Treasury Address"
          >
            {isCopiedTreasury ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Upgrade Action Panel (For next tier) */}
      {currentLevel < 12 ? (
        <div className="crypto-card p-5 border-[rgba(243,186,47,0.3)] bg-[#111622]">
          <div className="flex items-center justify-between mb-3">
            <div>
              <span className="text-[10px] uppercase font-bold text-[#F3BA2F]">Next Level Available</span>
              <h3 className="text-lg font-black text-white">
                Tier {targetLevelMeta.level}: {targetLevelMeta.label}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-[10px] uppercase font-bold text-[#8E9BAE]">New Rate</span>
              <div className="text-sm font-black text-[#0088CC]">
                {targetLevelMeta.hourly_rate} AGEN/hr
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs mb-4">
            <div className="p-2.5 bg-[#0B0E14] rounded-lg border border-white/5">
              <span className="text-[#8E9BAE] block text-[10px]">Required Deposit</span>
              <span className="text-white font-bold">{targetLevelMeta.ton_amount} TON</span>
            </div>
            <div className="p-2.5 bg-[#0B0E14] rounded-lg border border-white/5">
              <span className="text-[#8E9BAE] block text-[10px]">Multiplier</span>
              <span className="text-[#FFD269] font-bold">
                {(targetLevelMeta.hourly_rate / 0.45).toFixed(1)}x Genesis Speed
              </span>
            </div>
          </div>

          {statusMessage && (
            <div className="p-2.5 mb-3 bg-[#0B0E14] rounded-lg text-xs text-[#FFD269] border border-[#F3BA2F]/20 text-center">
              {statusMessage}
            </div>
          )}

          <div className="flex flex-col gap-2.5">
            <button
              onClick={handleTonConnectPayment}
              disabled={isUpgrading}
              className="gold-button w-full py-3.5 text-sm uppercase tracking-wider flex items-center justify-center gap-2"
            >
              <Zap className="w-4 h-4" />
              {isUpgrading
                ? 'Processing...'
                : wallet
                ? `Upgrade via TON Connect (${targetLevelMeta.ton_amount} TON)`
                : 'Connect TON Wallet to Upgrade'}
            </button>

            {/* Manual TX Hash Input */}
            <form onSubmit={handleManualUpgrade} className="mt-2 flex gap-2">
              <input
                type="text"
                value={manualTxHash}
                onChange={(e) => setManualTxHash(e.target.value)}
                placeholder="Or paste verified TON Tx Hash..."
                className="flex-1 bg-[#0B0E14] border border-white/10 rounded-xl px-3 py-2 text-xs text-white placeholder-[#5E697A] focus:outline-none focus:border-[#F3BA2F]"
              />
              <button
                type="submit"
                disabled={isUpgrading || !manualTxHash.trim()}
                className="ton-button px-4 py-2 text-xs whitespace-nowrap"
              >
                Verify Hash
              </button>
            </form>
          </div>
        </div>
      ) : (
        <div className="crypto-card p-5 bg-gradient-to-r from-amber-500/20 to-[#F3BA2F]/20 text-center border-amber-400/40">
          <CheckCircle2 className="w-8 h-8 text-[#FFD269] mx-auto mb-2" />
          <h3 className="text-lg font-black text-white">Apex Miner Status Achieved</h3>
          <p className="text-xs text-[#8E9BAE] mt-1">
            You are operating at the highest possible tier (Level 12) with a top mining velocity of 921.60 AGEN/hr!
          </p>
        </div>
      )}

      {/* 12-Tier Progression Table */}
      <div className="crypto-card p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#8E9BAE] mb-3">
          Complete 12-Tier Architecture
        </div>
        <div className="flex flex-col gap-2">
          {LEVELS.map((tier) => {
            const isCurrent = tier.level === currentLevel;
            const isCompleted = tier.level < currentLevel;
            return (
              <div
                key={tier.level}
                onClick={() => setSelectedLevel(tier.level)}
                className={`p-3 rounded-xl border transition-all flex items-center justify-between cursor-pointer ${
                  isCurrent
                    ? 'bg-[rgba(243,186,47,0.12)] border-[#F3BA2F] shadow-lg shadow-[rgba(243,186,47,0.1)]'
                    : isCompleted
                    ? 'bg-[#111622]/60 border-white/5 opacity-80'
                    : 'bg-[#111622] border-white/5 hover:border-white/20'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-8 h-8 rounded-lg flex items-center justify-center font-black text-xs ${
                      isCurrent
                        ? 'bg-[#F3BA2F] text-[#0B0E14]'
                        : isCompleted
                        ? 'bg-emerald-500/20 text-emerald-400'
                        : 'bg-white/5 text-[#8E9BAE]'
                    }`}
                  >
                    {isCompleted ? <Check className="w-4 h-4" /> : tier.level}
                  </div>
                  <div>
                    <div className="text-xs font-bold text-white flex items-center gap-1.5">
                      {tier.label}
                      {isCurrent && (
                        <span className="text-[9px] bg-[#F3BA2F] text-[#0B0E14] font-extrabold px-1.5 py-0.2 rounded">
                          ACTIVE
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-[#8E9BAE]">
                      {tier.agen_amount.toLocaleString()} AGEN · {tier.ton_amount} TON
                    </div>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-xs font-black text-[#FFD269]">
                    {tier.hourly_rate.toFixed(2)}/hr
                  </div>
                  <div className="text-[10px] text-[#8E9BAE]">AGEN Speed</div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mathematical Baseline Reference */}
      <div className="crypto-card p-4 text-xs text-[#8E9BAE] leading-relaxed">
        <span className="font-bold text-white block mb-1">
          Conversion Baseline Constant:
        </span>
        100 AGEN = 0.1 TON &rArr; <span className="text-[#FFD269] font-mono">1 AGEN = 0.001 TON</span>.
        All on-chain level payments are verified and tracked against the protocol treasury ledger to
        prevent transaction reuse.
      </div>
    </div>
  );
};
