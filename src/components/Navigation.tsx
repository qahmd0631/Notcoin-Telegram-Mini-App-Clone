import React from 'react';
import {
  Home,
  Pickaxe,
  TrendingUp,
  CheckSquare,
  PlayCircle,
  Users,
  Wallet,
  History,
  ArrowUpRight,
} from 'lucide-react';

export type TabKey =
  | 'home'
  | 'mining'
  | 'levels'
  | 'tasks'
  | 'ads'
  | 'referral'
  | 'wallet'
  | 'history'
  | 'withdraw';

interface NavigationProps {
  activeTab: TabKey;
  onSelectTab: (tab: TabKey) => void;
  adsRemaining?: number;
}

export const Navigation: React.FC<NavigationProps> = ({
  activeTab,
  onSelectTab,
  adsRemaining,
}) => {
  const tabs: Array<{ key: TabKey; label: string; icon: React.ReactNode; badge?: string | number }> = [
    { key: 'home', label: 'Home', icon: <Home className="w-5 h-5" /> },
    { key: 'mining', label: 'Mine', icon: <Pickaxe className="w-5 h-5" /> },
    { key: 'levels', label: 'Levels', icon: <TrendingUp className="w-5 h-5" /> },
    { key: 'tasks', label: 'Tasks', icon: <CheckSquare className="w-5 h-5" /> },
    {
      key: 'ads',
      label: 'Ads',
      icon: <PlayCircle className="w-5 h-5" />,
      badge: adsRemaining !== undefined && adsRemaining > 0 ? adsRemaining : undefined,
    },
    { key: 'referral', label: 'Friends', icon: <Users className="w-5 h-5" /> },
    { key: 'wallet', label: 'Wallet', icon: <Wallet className="w-5 h-5" /> },
    { key: 'history', label: 'Ledger', icon: <History className="w-5 h-5" /> },
    { key: 'withdraw', label: 'Vault', icon: <ArrowUpRight className="w-5 h-5" /> },
  ];

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 bg-[#0B0E14]/95 backdrop-blur-lg border-t border-[rgba(243,186,47,0.14)] pb-[calc(env(safe-area-inset-bottom)+6px)] pt-1 px-2">
      <div className="flex items-center justify-between max-w-lg mx-auto overflow-x-auto no-scrollbar gap-1 py-1">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.key;
          return (
            <button
              key={tab.key}
              onClick={() => onSelectTab(tab.key)}
              className={`relative flex flex-col items-center justify-center min-w-[50px] py-1.5 px-2 rounded-xl transition-all duration-200 ${
                isActive
                  ? 'text-[#F3BA2F] bg-[rgba(243,186,47,0.12)]'
                  : 'text-[#8E9BAE] hover:text-white hover:bg-white/5'
              }`}
            >
              <div className="relative">
                {tab.icon}
                {tab.badge !== undefined && (
                  <span className="absolute -top-1.5 -right-2 bg-[#F3BA2F] text-[#0B0E14] text-[9px] font-black rounded-full w-4 h-4 flex items-center justify-center">
                    {tab.badge}
                  </span>
                )}
              </div>
              <span className="text-[10px] font-semibold mt-1 tracking-tight">
                {tab.label}
              </span>
            </button>
          );
        })}
      </div>
    </nav>
  );
};
