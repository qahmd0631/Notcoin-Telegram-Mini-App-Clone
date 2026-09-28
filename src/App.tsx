import { useEffect, useState, useCallback } from 'react';
import { useTonAddress } from '@tonconnect/ui-react';
import { Header } from './components/Header';
import { Navigation, TabKey } from './components/Navigation';
import { HomeTab } from './components/HomeTab';
import { MiningTab } from './components/MiningTab';
import { LevelsTab } from './components/LevelsTab';
import { TasksTab } from './components/TasksTab';
import { AdsTab } from './components/AdsTab';
import { ReferralTab } from './components/ReferralTab';
import { WalletTab } from './components/WalletTab';
import { HistoryTab } from './components/HistoryTab';
import { WithdrawTab } from './components/WithdrawTab';
import { api, UserStateResponse, TransactionRecord, ReferralItem } from './api';
import { getLevelDefinition, AURA_AGEN_SETTINGS } from './lib/auragen';

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        openTelegramLink?: (url: string) => void;
        initData?: string;
        initDataUnsafe?: {
          user?: {
            id: number;
            first_name?: string;
            last_name?: string;
            username?: string;
          };
          start_param?: string;
        };
      };
    };
    show_11862041?: () => void | Promise<unknown>;
  }
}

export default function App() {
  const [activeTab, setActiveTab] = useState<TabKey>('home');
  const [state, setState] = useState<UserStateResponse | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'error' } | null>(
    null
  );
  const [isLoading, setIsLoading] = useState(true);
  const [isClaiming, setIsClaiming] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [isSubmittingWithdraw, setIsSubmittingWithdraw] = useState(false);
  const [isLinkingWallet, setIsLinkingWallet] = useState(false);
  const [transactions, setTransactions] = useState<TransactionRecord[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [referralsList, setReferralsList] = useState<ReferralItem[]>([]);
  const [isLoadingReferrals, setIsLoadingReferrals] = useState(false);

  const userFriendlyAddress = useTonAddress();

  const showToast = useCallback((message: string, type: 'info' | 'success' | 'error' = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  }, []);

  // Initialize Telegram WebApp & Authenticate with backend
  useEffect(() => {
    if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
      window.Telegram.WebApp.ready?.();
      window.Telegram.WebApp.expand?.();
    }

    async function initUser() {
      try {
        setIsLoading(true);
        // Authenticate user with server
        await api.authenticate();
        // Load initial state
        const userState = await api.getState();
        setState(userState);
      } catch (err: any) {
        console.error('Initialization error:', err);
        showToast('Connected to AURA_AGEN protocol', 'info');
        // Retry or fallback
        const fallback = await api.getState().catch(() => null);
        if (fallback) setState(fallback);
      } finally {
        setIsLoading(false);
      }
    }

    initUser();
  }, [showToast]);

  // Periodic state refresh
  useEffect(() => {
    const timer = setInterval(async () => {
      try {
        const refreshed = await api.getState();
        setState((prev) => (prev ? { ...prev, ...refreshed } : refreshed));
      } catch {
        // Silently skip background state refresh errors
      }
    }, 15000);

    return () => clearInterval(timer);
  }, []);

  // Lazy load history or referrals when user switches to those tabs
  useEffect(() => {
    if (activeTab === 'history') {
      setIsLoadingHistory(true);
      api
        .getHistory()
        .then((res) => setTransactions(res.transactions))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingHistory(false));
    } else if (activeTab === 'referral') {
      setIsLoadingReferrals(true);
      api
        .getReferrals()
        .then((res) => setReferralsList(res.referrals))
        .catch((err) => console.error(err))
        .finally(() => setIsLoadingReferrals(false));
    }
  }, [activeTab]);

  // Handle Mining Claim
  const handleClaimMining = async () => {
    try {
      setIsClaiming(true);
      const res = await api.claimMining();
      showToast(`Successfully claimed +${res.claimed_amount} AGEN!`, 'success');
      // Refresh state
      const newState = await api.getState();
      setState(newState);
    } catch (err: any) {
      showToast(err.message || 'Claim failed', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  // Handle Tier Upgrade
  const handleUpgrade = async (targetLevel: number, txHash: string, walletAddress?: string) => {
    try {
      setIsUpgrading(true);
      await api.upgradeLevel(targetLevel, txHash, walletAddress);
      showToast(`Congratulations! Upgraded to Level ${targetLevel}!`, 'success');
      const newState = await api.getState();
      setState(newState);
    } catch (err: any) {
      showToast(err.message || 'Level upgrade failed', 'error');
      throw err;
    } finally {
      setIsUpgrading(false);
    }
  };

  // Handle Social Task Claim
  const handleClaimTask = async (taskId: string) => {
    try {
      setIsClaiming(true);
      const res = await api.claimTask(taskId);
      showToast(`Quest completed! Rewarded +${res.reward} AGEN!`, 'success');
      const newState = await api.getState();
      setState(newState);
    } catch (err: any) {
      showToast(err.message || 'Task claim failed', 'error');
    } finally {
      setIsClaiming(false);
    }
  };

  // Handle Monetag Ad Session with signed Nonce protocol
  const handleInitiateAndClaimAd = async () => {
    try {
      setIsAdLoading(true);
      // 1. Get signed nonce from server
      const { nonce } = await api.initiateAdSession();

      // 2. Trigger Monetag SDK if loaded
      if (typeof window.show_11862041 === 'function') {
        try {
          await window.show_11862041();
        } catch (adErr) {
          console.warn('Monetag ad impression warning:', adErr);
        }
      }

      // 3. Submit nonce to server for atomic validation & reward disbursement
      const res = await api.claimAdReward(nonce);
      showToast(`Ad verified! +${res.reward} AGEN credited!`, 'success');

      // Refresh state
      const newState = await api.getState();
      setState(newState);
    } catch (err: any) {
      showToast(err.message || 'Ad session failed', 'error');
      throw err;
    } finally {
      setIsAdLoading(false);
    }
  };

  // Handle Wallet Link
  const handleLinkWallet = async (address: string) => {
    try {
      setIsLinkingWallet(true);
      await api.linkWallet(address);
      showToast('Wallet address linked to mining profile!', 'success');
      const newState = await api.getState();
      setState(newState);
    } catch (err: any) {
      showToast(err.message || 'Failed to link wallet', 'error');
    } finally {
      setIsLinkingWallet(false);
    }
  };

  // Handle Withdrawal Request
  const handleWithdraw = async (amount: number, address: string) => {
    try {
      setIsSubmittingWithdraw(true);
      await api.requestWithdrawal(amount, address);
      showToast(`Withdrawal of ${amount} AGEN registered!`, 'success');
      const newState = await api.getState();
      setState(newState);
    } catch (err: any) {
      throw err;
    } finally {
      setIsSubmittingWithdraw(false);
    }
  };

  // Handle Governance Withdrawals Toggle
  const handleToggleWithdrawals = async (enabled: boolean) => {
    try {
      await fetch('/api/admin/toggle-withdrawals', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ enabled }),
      });
      showToast(`Protocol vault ${enabled ? 'unlocked' : 'locked'}!`, 'info');
      const newState = await api.getState();
      setState(newState);
    } catch (err: any) {
      showToast('Toggle failed', 'error');
    }
  };

  const user = state?.user;
  const currentLevel = user?.level || 1;
  const levelMeta = getLevelDefinition(currentLevel);
  const userBalance = user?.balance_agen || 0;
  const claimableBalance = user?.claimable_agen || 0;
  const miningRate = user?.mining_rate || 0.45;
  const completedAdsToday = state?.completed_ads_today || 0;
  const dailyAdLimit = state?.daily_ad_limit || AURA_AGEN_SETTINGS.daily_ad_limit;
  const completedTasks = state?.completed_tasks || [];
  const referralCount = state?.referral_count || 0;

  const isWithdrawalsEnabled =
    state?.settings?.withdrawals_enabled === true ||
    state?.settings?.withdrawals_enabled === 'true';

  const adsRemaining = Math.max(0, dailyAdLimit - completedAdsToday);

  return (
    <div className="min-h-screen bg-[#0B0E14] text-white flex flex-col justify-between selection:bg-[#F3BA2F] selection:text-[#0B0E14]">
      {/* Toast Notification Banner */}
      {toast && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-xl text-xs font-bold shadow-2xl backdrop-blur-md border animate-bounce flex items-center gap-2 max-w-sm w-[90%] justify-center border-[#F3BA2F]/40 bg-[#161D2C]/95 text-[#FFD269]">
          <span>{toast.message}</span>
        </div>
      )}

      {/* Top Header */}
      <Header
        username={user?.username}
        firstName={user?.first_name}
        level={currentLevel}
        levelLabel={levelMeta.label}
        miningRate={miningRate}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-lg w-full mx-auto p-4">
        {isLoading && !state ? (
          <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
            <div className="w-12 h-12 rounded-2xl border-2 border-[#F3BA2F] border-t-transparent animate-spin" />
            <span className="text-xs uppercase font-extrabold tracking-widest text-[#F3BA2F]">
              Connecting to AURA_AGEN Node...
            </span>
          </div>
        ) : (
          <>
            {activeTab === 'home' && (
              <HomeTab
                balance={userBalance}
                miningRate={miningRate}
                level={currentLevel}
                levelLabel={levelMeta.label}
                claimableAmount={claimableBalance}
                onClaim={handleClaimMining}
                isClaiming={isClaiming}
                onNavigate={setActiveTab}
                adsCompletedToday={completedAdsToday}
                dailyAdLimit={dailyAdLimit}
                referralCount={referralCount}
              />
            )}

            {activeTab === 'mining' && (
              <MiningTab
                balance={userBalance}
                miningRate={miningRate}
                level={currentLevel}
                levelLabel={levelMeta.label}
                claimableAmount={claimableBalance}
                onClaim={handleClaimMining}
                isClaiming={isClaiming}
                onNavigate={setActiveTab}
                lastClaimAt={user?.last_claim_at}
              />
            )}

            {activeTab === 'levels' && (
              <LevelsTab
                currentLevel={currentLevel}
                userBalance={userBalance}
                onUpgrade={handleUpgrade}
                isUpgrading={isUpgrading}
              />
            )}

            {activeTab === 'tasks' && (
              <TasksTab
                completedTasks={completedTasks}
                onClaimTask={handleClaimTask}
                isClaiming={isClaiming}
              />
            )}

            {activeTab === 'ads' && (
              <AdsTab
                completedToday={completedAdsToday}
                dailyLimit={dailyAdLimit}
                onInitiateAndClaimAd={handleInitiateAndClaimAd}
                isLoading={isAdLoading}
              />
            )}

            {activeTab === 'referral' && (
              <ReferralTab
                telegramId={user?.telegram_id}
                referralCode={user?.referral_code}
                referralCount={referralCount}
                referralsList={referralsList}
                isLoadingList={isLoadingReferrals}
              />
            )}

            {activeTab === 'wallet' && (
              <WalletTab
                storedWalletAddress={user?.wallet_address}
                onLinkWallet={handleLinkWallet}
                isLinking={isLinkingWallet}
              />
            )}

            {activeTab === 'history' && (
              <HistoryTab transactions={transactions} isLoading={isLoadingHistory} />
            )}

            {activeTab === 'withdraw' && (
              <WithdrawTab
                balance={userBalance}
                withdrawalsEnabled={isWithdrawalsEnabled}
                onWithdraw={handleWithdraw}
                isSubmitting={isSubmittingWithdraw}
                connectedWallet={userFriendlyAddress || user?.wallet_address}
                onToggleWithdrawals={handleToggleWithdrawals}
              />
            )}
          </>
        )}
      </main>

      {/* Bottom 9-Tab Navigation Bar */}
      <Navigation
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        adsRemaining={adsRemaining}
      />
    </div>
  );
}
