import { useEffect, useMemo, useState } from 'react';
import { TonConnectButton, useTonAddress, useTonWallet } from '@tonconnect/ui-react';
import './index.css';
import {
  AURA_AGEN_SETTINGS,
  LEVELS,
  calculateElapsedMining,
  getLevelDefinition,
  getLevelProgress,
  getMiningRateForLevel,
  getNextLevelDefinition,
} from './lib/auragen';
import { BOT_USERNAME } from './bot';

type TelegramUser = {
  id?: number | string;
  username?: string;
  first_name?: string;
};

declare global {
  interface Window {
    Telegram?: {
      WebApp?: {
        ready?: () => void;
        expand?: () => void;
        initData?: string;
        initDataUnsafe?: {
          user?: TelegramUser;
          start_param?: string;
        };
      };
    };
    show_11862041?: () => void | Promise<unknown>;
  }
}

const formatNumber = (value: number, digits = 4) => Number(value).toLocaleString(undefined, { maximumFractionDigits: digits, minimumFractionDigits: 0 });

const getTelegramContext = () => {
  const webApp = window.Telegram?.WebApp;
  const tgUser = webApp?.initDataUnsafe?.user ?? null;
  const realUserId = tgUser?.id ? String(tgUser.id) : null;
  return { webApp, tgUser, realUserId };
};

const getReferralLink = (telegramId?: string | null) => {
  if (!telegramId) {
    return `https://t.me/${BOT_USERNAME}?start=ref`;
  }
  return `https://t.me/${BOT_USERNAME}?start=ref_${telegramId}`;
};

function App() {
  const [activeTab, setActiveTab] = useState<'home' | 'tasks' | 'miners' | 'friends' | 'profile'>('home');
  const [telegramUser, setTelegramUser] = useState<TelegramUser | null>(null);
  const [telegramId, setTelegramId] = useState<string | null>(null);
  const [walletAddress, setWalletAddress] = useState<string | null>(null);
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const [telegramWarning, setTelegramWarning] = useState<string | null>(null);
  const [balance, setBalance] = useState(0);
  const [claimableBalance, setClaimableBalance] = useState(0);
  const [currentLevel, setCurrentLevel] = useState(1);
  const [miningRate, setMiningRate] = useState(getMiningRateForLevel(1));
  const [adCount, setAdCount] = useState(0);
  const [isAdLocked, setIsAdLocked] = useState(false);
  const [isAdLoading, setIsAdLoading] = useState(false);
  const [speedBoostSecondsLeft, setSpeedBoostSecondsLeft] = useState(0);
  const [taskStatus, setTaskStatus] = useState({
    telegram_channel: { opened: false, completed: false, claimed: false },
  });
  const [copied, setCopied] = useState(false);

  const userFriendlyAddress = useTonAddress();
  const tonWallet = useTonWallet();
  const connectedWalletAddress = tonWallet?.account?.address ?? userFriendlyAddress ?? null;

  const currentLevelMeta = getLevelDefinition(currentLevel);
  const nextLevelMeta = getNextLevelDefinition(currentLevel);
  const progress = getLevelProgress(currentLevel, balance);
  const effectiveMiningRate = Number((miningRate * (speedBoostSecondsLeft > 0 ? 2 : 1)).toFixed(4));
  const referralLink = getReferralLink(telegramId);
  const adLimitReached = isAdLocked || adCount >= AURA_AGEN_SETTINGS.daily_ad_limit;

  const hasBotToken = useMemo(() => Boolean((import.meta.env.VITE_BOT_TOKEN ?? '').trim()), []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const webApp = window.Telegram?.WebApp;
    if (webApp?.ready) {
      webApp.ready();
    }
    if (webApp?.expand) {
      webApp.expand();
    }

    const { tgUser, realUserId } = getTelegramContext();
    setTelegramUser(tgUser ?? null);
    setTelegramId(realUserId);

    if (!realUserId) {
      setTelegramWarning('Open this mini-app inside Telegram to unlock wallet and mining features.');
      return;
    }

    setTelegramWarning(null);
    setBalance(0);
    setClaimableBalance(0);
    setMiningRate(getMiningRateForLevel(1));
    setCurrentLevel(1);
    setWalletAddress(null);
  }, []);

  useEffect(() => {
    if (!telegramId) {
      return;
    }
    setToastMessage('Telegram session ready');
    const timeout = window.setTimeout(() => setToastMessage(null), 2200);
    return () => window.clearTimeout(timeout);
  }, [telegramId]);

  useEffect(() => {
    if (speedBoostSecondsLeft <= 0) {
      return;
    }

    const timer = window.setInterval(() => {
      setSpeedBoostSecondsLeft((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [speedBoostSecondsLeft]);

  useEffect(() => {
    const reward = calculateElapsedMining(new Date(Date.now() - 60 * 60 * 1000).toISOString(), effectiveMiningRate);
    setClaimableBalance(reward);
  }, [effectiveMiningRate]);

  useEffect(() => {
    if (connectedWalletAddress) {
      setWalletAddress(connectedWalletAddress.trim());
    }
  }, [connectedWalletAddress]);

  const handleClaim = () => {
    const nextBalance = Number((balance + claimableBalance).toFixed(4));
    setBalance(nextBalance);
    setClaimableBalance(0);
    setToastMessage(`Claimed ${formatNumber(claimableBalance)} AGEN`);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const handleWatchAd = async () => {
    if (adLimitReached) {
      setToastMessage('Ad limit reached for today.');
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    setIsAdLoading(true);
    if (typeof window.show_11862041 === 'function') {
      try {
        await window.show_11862041();
      } catch {
        setToastMessage('Ad did not complete. Please try again.');
        setTimeout(() => setToastMessage(null), 2200);
        setIsAdLoading(false);
        return;
      }
    }

    const nextCount = Math.min(adCount + 1, AURA_AGEN_SETTINGS.daily_ad_limit);
    const bonus = AURA_AGEN_SETTINGS.ad_reward;
    setAdCount(nextCount);
    setIsAdLocked(nextCount >= AURA_AGEN_SETTINGS.daily_ad_limit);
    setBalance((prev) => Number((prev + bonus).toFixed(4)));
    setIsAdLoading(false);
    setToastMessage(`+${bonus} AGEN from ad`);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const handleTelegramTask = () => {
    const next = { opened: true, completed: true, claimed: true };
    setTaskStatus((prev) => ({ ...prev, telegram_channel: next }));
    const reward = AURA_AGEN_SETTINGS.task_reward;
    setBalance((prev) => Number((prev + reward).toFixed(4)));
    setToastMessage(`+${reward} AGEN from Telegram task`);
    setTimeout(() => setToastMessage(null), 2200);
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(referralLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1400);
    } catch {
      setToastMessage('Clipboard unavailable');
      setTimeout(() => setToastMessage(null), 2200);
    }
  };

  const handleInviteFriend = () => {
    const shareUrl = `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodeURIComponent('Join AURA_AGEN and mine with me.')}`;
    window.open(shareUrl, '_blank', 'noopener,noreferrer');
  };

  const handleLevelUpgrade = (level: number) => {
    const target = getLevelDefinition(level);
    if (balance < target.agen_amount) {
      setToastMessage(`Need ${target.agen_amount} AGEN for level ${level}.`);
      setTimeout(() => setToastMessage(null), 2200);
      return;
    }

    setBalance((prev) => Number((prev - target.agen_amount).toFixed(4)));
    setCurrentLevel(level);
    setMiningRate(target.hourly_rate);
    setToastMessage(`Level ${level} unlocked.`);
    setTimeout(() => setToastMessage(null), 2200);
  };

  return (
    <div className="app-shell">
      <div className="app-bg" />

      <div className="mobile-frame">
        {telegramWarning && <div className="alert-box warning">{telegramWarning}</div>}
        {toastMessage && <div className="alert-box success">{toastMessage}</div>}

        {activeTab === 'home' && (
          <main className="screen home-screen">
            <header className="topbar">
              <div className="brand-wrap">
                <div className="brand-icon">
                  <span>A</span>
                </div>
                <div>
                  <div className="eyebrow">AURA_AGEN</div>
                  <div className="brand-title">Mining Terminal</div>
                </div>
              </div>
              <div className="pill level-pill">LV {currentLevel}</div>
            </header>

            <section className="hero-card">
              <div className="hero-topline">
                <div>
                  <div className="muted-label">AGEN balance</div>
                  <div className="balance-value">{formatNumber(balance, 4)} AGEN</div>
                </div>
                <div className="pill network-pill">{AURA_AGEN_SETTINGS.ton_network}</div>
              </div>

              <div className="stats-grid">
                <div className="metric-card">
                  <div className="muted-label">Claimable</div>
                  <div className="metric-value">{formatNumber(claimableBalance, 4)}</div>
                </div>
                <div className="metric-card">
                  <div className="muted-label">Mining rate</div>
                  <div className="metric-value">{formatNumber(effectiveMiningRate, 4)}/h</div>
                </div>
              </div>

              <div className="progress-box">
                <div className="progress-head">
                  <span>Progress</span>
                  <span>{progress}%</span>
                </div>
                <div className="progress-track">
                  <span style={{ width: `${Math.min(progress, 100)}%` }} />
                </div>
                <div className="progress-foot">
                  <span>Lvl {currentLevel}</span>
                  <span>Next {nextLevelMeta.level}</span>
                </div>
              </div>

              <div className="mine-visual-wrap">
                <div className="mine-orb">
                  <div className="orb-badge">{speedBoostSecondsLeft > 0 ? `${speedBoostSecondsLeft}s` : '2x'}</div>
                  <div className="orb-core">A</div>
                </div>
              </div>

              <div className="cta-stack">
                <button className="primary-btn" onClick={handleClaim} disabled={claimableBalance <= 0}>
                  {claimableBalance > 0 ? 'Claim AGEN' : 'Mine now'}
                </button>
                <button className="secondary-btn" onClick={() => void handleWatchAd()} disabled={isAdLoading || adLimitReached}>
                  {isAdLoading ? 'Loading...' : adLimitReached ? `Ad limit ${adCount}/${AURA_AGEN_SETTINGS.daily_ad_limit}` : `Watch ad (${adCount}/${AURA_AGEN_SETTINGS.daily_ad_limit})`}
                </button>
              </div>
            </section>

            <section className="mini-grid">
              <div className="mini-card">
                <div className="muted-label">Mining timer</div>
                <div className="mini-value">{Math.max(0, 60 - ((claimableBalance / Math.max(effectiveMiningRate, 0.0001)) * 60)) < 0 ? 0 : Math.max(0, 60 - ((claimableBalance / Math.max(effectiveMiningRate, 0.0001)) * 60)).toFixed(0)} s</div>
              </div>
              <div className="mini-card">
                <div className="muted-label">Referral reward</div>
                <div className="mini-value">{AURA_AGEN_SETTINGS.referral_reward}</div>
              </div>
            </section>
          </main>
        )}

        {activeTab === 'tasks' && (
          <main className="screen tasks-screen">
            <header className="section-header">
              <div>
                <div className="eyebrow">Tasks</div>
                <h1>Mission board</h1>
              </div>
            </header>

            <div className="task-list">
              <div className="task-card">
                <div className="task-topline">
                  <div>
                    <div className="muted-label">Daily ad</div>
                    <div className="task-title">Watch ads</div>
                  </div>
                  <div className="reward-pill">+{AURA_AGEN_SETTINGS.ad_reward} AGEN</div>
                </div>
                <div className="task-footer">
                  <span>{adCount}/{AURA_AGEN_SETTINGS.daily_ad_limit}</span>
                  <button className="small-btn" onClick={() => void handleWatchAd()} disabled={adLimitReached || isAdLoading}>Claim</button>
                </div>
              </div>

              <div className="task-card">
                <div className="task-topline">
                  <div>
                    <div className="muted-label">Telegram</div>
                    <div className="task-title">Official channel</div>
                  </div>
                  <div className="reward-pill">+{AURA_AGEN_SETTINGS.task_reward} AGEN</div>
                </div>
                <div className="task-footer">
                  <span>{taskStatus.telegram_channel.claimed ? 'Claimed' : 'Ready'}</span>
                  <button className="small-btn" onClick={handleTelegramTask} disabled={taskStatus.telegram_channel.claimed}>Claim</button>
                </div>
              </div>
            </div>
          </main>
        )}

        {activeTab === 'miners' && (
          <main className="screen levels-screen">
            <header className="section-header">
              <div>
                <div className="eyebrow">Levels</div>
                <h1>Mine tiers</h1>
              </div>
            </header>

            <div className="level-summary">
              <div>
                <div className="muted-label">Current level</div>
                <div className="summary-value">{currentLevel}</div>
              </div>
              <div className="pill network-pill">{currentLevelMeta.label}</div>
            </div>

            <div className="levels-list">
              {LEVELS.map((level) => {
                const isUnlocked = level.level <= currentLevel;
                const canUpgrade = balance >= level.agen_amount;
                return (
                  <div key={level.level} className={`level-row ${isUnlocked ? 'active' : ''}`}>
                    <div>
                      <div className="eyebrow">Level {level.level}</div>
                      <div className="task-title">{level.label}</div>
                    </div>
                    <button className="small-btn" onClick={() => handleLevelUpgrade(level.level)} disabled={!canUpgrade && !isUnlocked}>
                      {isUnlocked ? 'Active' : canUpgrade ? 'Upgrade' : 'Locked'}
                    </button>
                  </div>
                );
              })}
            </div>
          </main>
        )}

        {activeTab === 'friends' && (
          <main className="screen referral-screen">
            <header className="section-header">
              <div>
                <div className="eyebrow">Referral</div>
                <h1>Invite & earn</h1>
              </div>
            </header>

            <div className="referral-card">
              <div className="muted-label">Your referral link</div>
              <div className="link-row">
                <input readOnly value={referralLink} />
                <button className="small-btn" onClick={handleCopyLink}>{copied ? 'Copied' : 'Copy'}</button>
              </div>
              <div className="share-row">
                <button className="secondary-btn" onClick={handleInviteFriend}>Share</button>
              </div>
            </div>
          </main>
        )}

        {activeTab === 'profile' && (
          <main className="screen wallet-screen">
            <header className="section-header">
              <div>
                <div className="eyebrow">Wallet</div>
                <h1>Account</h1>
              </div>
            </header>

            <div className="profile-card">
              <div className="user-badge-row">
                <div>
                  <div className="muted-label">Telegram user</div>
                  <div className="task-title">{telegramUser?.username || telegramUser?.first_name || 'User'}</div>
                </div>
                <div className="pill network-pill">{telegramId ? 'Online' : 'Offline'}</div>
              </div>

              <div className="wallet-data">
                <div className="wallet-row">Telegram ID: {telegramId ?? 'N/A'}</div>
                <div className="wallet-row">TON wallet: {walletAddress ?? 'Not connected'}</div>
                <div className="wallet-row">Bot token: {hasBotToken ? 'Configured' : 'Missing'}</div>
              </div>

              <div className="wallet-button-wrap">
                <TonConnectButton />
              </div>
            </div>
          </main>
        )}
      </div>

      <nav className="bottom-nav">
        {[
          ['Home', 'home'],
          ['Tasks', 'tasks'],
          ['Levels', 'miners'],
          ['Referral', 'friends'],
          ['Wallet', 'profile'],
        ].map(([label, key]) => (
          <button
            key={key}
            type="button"
            className={`nav-item ${activeTab === key ? 'active' : ''}`}
            onClick={() => setActiveTab(key as 'home' | 'tasks' | 'miners' | 'friends' | 'profile')}
          >
            {label}
          </button>
        ))}
      </nav>
    </div>
  );
}

export default App;
