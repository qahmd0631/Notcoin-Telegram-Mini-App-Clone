export interface UserStateResponse {
  user: {
    id: number | string;
    telegram_id: number;
    username?: string;
    first_name?: string;
    last_name?: string;
    wallet_address?: string;
    balance_agen: number;
    claimable_agen: number;
    level: number;
    mining_rate: number;
    mining_started_at: string;
    last_claim_at: string;
    referral_code: string;
    is_banned: boolean;
    created_at: string;
    elapsed_seconds?: number;
  };
  completed_ads_today: number;
  daily_ad_limit: number;
  completed_tasks: string[];
  referral_count: number;
  settings: Record<string, any>;
  levels: Array<{
    level: number;
    agen_amount: number;
    ton_amount: number;
    hourly_rate: number;
    label: string;
  }>;
}

export interface TransactionRecord {
  id: string;
  type: string;
  amount: number;
  balance_before: number;
  balance_after: number;
  description: string;
  reference_id?: string;
  created_at: string;
}

export interface ReferralItem {
  telegram_id: number;
  username?: string;
  first_name?: string;
  created_at: string;
}

const getHeaders = () => {
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  // JWT Token from local storage
  if (typeof window !== 'undefined') {
    const token = localStorage.getItem('aura_jwt_token');
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    if (window.Telegram?.WebApp?.initData) {
      headers['x-telegram-init-data'] = window.Telegram.WebApp.initData;
    }

    const localId = localStorage.getItem('aura_telegram_id');
    if (localId) {
      headers['x-telegram-id'] = localId;
    }
  }

  return headers;
};

export const api = {
  async authenticate(initData?: string, referralCode?: string) {
    const res = await fetch('/api/auth/telegram', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        initData: initData || window.Telegram?.WebApp?.initData || '',
        referral_code: referralCode,
        telegram_id: window.Telegram?.WebApp?.initDataUnsafe?.user?.id,
        username: window.Telegram?.WebApp?.initDataUnsafe?.user?.username,
        first_name: window.Telegram?.WebApp?.initDataUnsafe?.user?.first_name,
        last_name: window.Telegram?.WebApp?.initDataUnsafe?.user?.last_name,
        start_param: window.Telegram?.WebApp?.initDataUnsafe?.start_param,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Auth failed');
    }
    const data = await res.json();
    if (data.token) {
      localStorage.setItem('aura_jwt_token', data.token);
    }
    if (data.user?.telegram_id) {
      localStorage.setItem('aura_telegram_id', String(data.user.telegram_id));
    }
    return data;
  },

  async getState(): Promise<UserStateResponse> {
    const res = await fetch('/api/user/state', {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to fetch state');
    }
    return res.json();
  },

  async claimMining(): Promise<{ claimed_amount: number; new_balance: number; last_claim_at: string }> {
    const res = await fetch('/api/mining/claim', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Claim failed');
    }
    return res.json();
  },

  async initiateAdSession(): Promise<{ nonce: string; expires_at: string; zone_id: string; reward: number }> {
    const res = await fetch('/api/ads/initiate', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({}),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to start ad');
    }
    return res.json();
  },

  async claimAdReward(nonce: string): Promise<{ reward: number; new_balance: number; completed_today: number }> {
    const res = await fetch('/api/ads/claim', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ nonce }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Failed to claim ad');
    }
    return res.json();
  },

  async claimTask(taskId = 'telegram_channel'): Promise<{ reward: number; new_balance: number }> {
    const res = await fetch('/api/tasks/claim', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ task_id: taskId }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Task claim failed');
    }
    return res.json();
  },

  async upgradeLevel(targetLevel: number, txHash: string, walletAddress?: string) {
    const res = await fetch('/api/levels/upgrade', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({
        target_level: targetLevel,
        tx_hash: txHash,
        wallet_address: walletAddress,
      }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Level upgrade failed');
    }
    return res.json();
  },

  async linkWallet(walletAddress: string) {
    const res = await fetch('/api/wallet/link', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ wallet_address: walletAddress }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Wallet link failed');
    }
    return res.json();
  },

  async requestWithdrawal(amount: number, walletAddress: string) {
    const res = await fetch('/api/withdrawals/request', {
      method: 'POST',
      headers: getHeaders(),
      body: JSON.stringify({ amount, wallet_address: walletAddress }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Withdrawal failed');
    }
    return res.json();
  },

  async getHistory(): Promise<{ transactions: TransactionRecord[] }> {
    const res = await fetch('/api/ledger/history', {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'History failed');
    }
    return res.json();
  },

  async getReferrals(): Promise<{
    referrals: ReferralItem[];
    total_referred: number;
    total_earned_agen: number;
    bounty_per_referral: number;
  }> {
    const res = await fetch('/api/referrals/list', {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      throw new Error(err.error || err.message || 'Referrals failed');
    }
    return res.json();
  },

  async getSettings(): Promise<Record<string, any>> {
    const res = await fetch('/api/settings', {
      method: 'GET',
      headers: getHeaders(),
    });
    if (!res.ok) {
      throw new Error('Settings failed');
    }
    return res.json();
  },
};
