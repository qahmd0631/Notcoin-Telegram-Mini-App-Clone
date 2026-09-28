import React from 'react';
import { TonConnectButton } from '@tonconnect/ui-react';
import { Zap } from 'lucide-react';

interface HeaderProps {
  username?: string;
  firstName?: string;
  level: number;
  levelLabel: string;
  miningRate: number;
}

export const Header: React.FC<HeaderProps> = ({
  username,
  firstName,
  level,
  levelLabel,
  miningRate,
}) => {
  return (
    <header className="flex items-center justify-between py-3 px-4 border-b border-[rgba(243,186,47,0.12)] bg-[#0B0E14]/90 backdrop-blur-md sticky top-0 z-40">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#FFD269] to-[#F3BA2F] p-0.5 flex items-center justify-center shadow-lg shadow-[rgba(243,186,47,0.2)]">
          <div className="w-full h-full bg-[#0B0E14] rounded-[10px] flex items-center justify-center">
            <span className="font-extrabold text-[#F3BA2F] text-lg tracking-wider">A</span>
          </div>
        </div>
        <div>
          <div className="flex items-center gap-1.5">
            <span className="font-extrabold text-sm tracking-tight text-white">AURA_AGEN</span>
            <span className="text-[10px] text-[#0088CC] font-semibold flex items-center gap-0.5 bg-[rgba(0,136,204,0.12)] px-1.5 py-0.5 rounded">
              <Zap className="w-2.5 h-2.5 fill-current" />
              {miningRate.toFixed(2)}/h
            </span>
          </div>
          <div className="flex items-center gap-2 text-xs text-[#8E9BAE]">
            <span className="text-white font-medium truncate max-w-[90px]">
              {username ? `@${username}` : firstName || 'Miner'}
            </span>
            <span>·</span>
            <span className="text-[#F3BA2F] font-semibold">
              Lv.{level} {levelLabel}
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="scale-90 origin-right">
          <TonConnectButton />
        </div>
      </div>
    </header>
  );
};
