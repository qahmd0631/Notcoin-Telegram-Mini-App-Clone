import React, { useState } from 'react';
import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import { Wallet, Copy, Check, ShieldCheck } from 'lucide-react';
import { AURA_AGEN_SETTINGS } from '../lib/auragen';

interface WalletTabProps {
  storedWalletAddress?: string;
  onLinkWallet: (address: string) => Promise<void>;
  isLinking: boolean;
}

export const WalletTab: React.FC<WalletTabProps> = ({
  storedWalletAddress,
  onLinkWallet,
  isLinking,
}) => {
  const userFriendlyAddress = useTonAddress();
  const wallet = useTonWallet();
  const [copiedUser, setCopiedUser] = useState(false);
  const [copiedTreasury, setCopiedTreasury] = useState(false);

  const activeAddress = wallet?.account?.address || userFriendlyAddress || storedWalletAddress;

  const handleCopyUser = async () => {
    if (!activeAddress) return;
    try {
      await navigator.clipboard.writeText(activeAddress);
      setCopiedUser(true);
      setTimeout(() => setCopiedUser(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleCopyTreasury = async () => {
    try {
      await navigator.clipboard.writeText(AURA_AGEN_SETTINGS.ton_receiver_wallet);
      setCopiedTreasury(true);
      setTimeout(() => setCopiedTreasury(false), 2000);
    } catch {
      // Fallback
    }
  };

  const handleSaveToProfile = async () => {
    if (activeAddress) {
      await onLinkWallet(activeAddress);
    }
  };

  return (
    <div className="flex flex-col gap-4 pb-20 animate-fadeIn">
      {/* Header */}
      <div className="crypto-card p-5 bg-gradient-to-b from-[#161D2C] to-[#111622]">
        <div className="text-xs uppercase font-extrabold tracking-widest text-[#0088CC] mb-1">
          TON Mainnet Infrastructure
        </div>
        <h2 className="text-2xl font-black text-white">Wallet Connection</h2>
        <p className="text-xs text-[#8E9BAE] mt-1 leading-relaxed">
          Connect your non-custodial TON wallet (Tonkeeper, MyTonWallet, OpenMask, Telegram Wallet) to
          verify on-chain tier upgrades and link withdrawal accounts.
        </p>
      </div>

      {/* TonConnect Action Box */}
      <div className="crypto-card p-5 bg-[#111622] flex flex-col items-center justify-center text-center">
        <div className="w-14 h-14 rounded-2xl bg-[#0088CC]/10 text-[#0088CC] flex items-center justify-center mb-3">
          <Wallet className="w-7 h-7" />
        </div>

        <h3 className="text-base font-bold text-white mb-1">
          {wallet ? 'TON Wallet Connected' : 'Connect TON Connect 2.0'}
        </h3>
        <p className="text-xs text-[#8E9BAE] mb-4 max-w-xs">
          {wallet
            ? `Active on ${wallet.device.appName || 'TON Wallet'}`
            : 'Select your preferred TON wallet provider to authenticate on-chain'}
        </p>

        <div className="mb-4">
          <TonConnectButton />
        </div>

        {activeAddress && (
          <div className="w-full mt-2 p-3 bg-[#0B0E14] rounded-xl border border-white/5 flex items-center justify-between text-left">
            <div className="min-w-0 pr-2">
              <span className="text-[10px] text-[#8E9BAE] uppercase font-bold block">
                Connected Address
              </span>
              <span className="text-xs font-mono text-white truncate block">
                {activeAddress}
              </span>
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={handleCopyUser}
                className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white"
                title="Copy address"
              >
                {copiedUser ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
              </button>
            </div>
          </div>
        )}

        {wallet && activeAddress !== storedWalletAddress && (
          <button
            onClick={handleSaveToProfile}
            disabled={isLinking}
            className="ton-button w-full mt-3 py-2.5 text-xs flex items-center justify-center gap-1.5"
          >
            {isLinking ? 'Linking...' : 'Link Address to Mining Profile'}
          </button>
        )}
      </div>

      {/* Treasury Contract Info */}
      <div className="crypto-card p-4">
        <div className="text-xs font-bold uppercase tracking-wider text-[#8E9BAE] mb-2 flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          Official Protocol Receiving Treasury
        </div>
        <div className="p-3 bg-[#0B0E14] rounded-xl border border-white/5 flex items-center justify-between">
          <div className="min-w-0 pr-2">
            <span className="text-[10px] text-[#8E9BAE] uppercase font-bold block">
              Treasury Contract (Mainnet)
            </span>
            <span className="text-xs font-mono text-[#FFD269] truncate block">
              {AURA_AGEN_SETTINGS.ton_receiver_wallet}
            </span>
          </div>
          <button
            onClick={handleCopyTreasury}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 text-white shrink-0"
          >
            {copiedTreasury ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
};
