export type TelegramWebAppData = {
  user?: {
    id?: number | string;
    username?: string;
    first_name?: string;
    last_name?: string;
  };
  start_param?: string;
  hash?: string;
};

export type UserRecord = {
  id?: string;
  telegram_id?: string | number;
  username?: string | null;
  points?: number;
  referral_code?: string | null;
  referred_by?: string | number | null;
  wallet_address?: string | null;
  level?: number;
  created_at?: string;
  updated_at?: string;
};

export type ReferralRecord = {
  id?: string;
  referrer_id?: string | number | null;
  referred_id?: string | number | null;
  reward_amount?: number | string | null;
  claimed?: boolean | null;
  reward_claimed?: boolean | null;
  created_at?: string;
};

export type TaskStatus = Record<string, { opened: boolean; completed: boolean; claimed: boolean }>;
