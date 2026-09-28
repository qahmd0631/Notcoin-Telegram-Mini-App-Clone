import crypto from 'crypto';

export interface TelegramUserData {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
}

export interface VerifiedTelegramContext {
  user: TelegramUserData;
  auth_date: number;
  start_param?: string;
  is_valid: boolean;
}

export function verifyTelegramInitData(
  initData: string,
  botToken: string
): VerifiedTelegramContext | null {
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    // Check auth_date
    const authDateStr = params.get('auth_date');
    if (!authDateStr) return null;
    const authDate = parseInt(authDateStr, 10);
    const now = Math.floor(Date.now() / 1000);
    // 24 hour freshness guard (86400 seconds)
    if (Math.abs(now - authDate) > 86400) {
      console.warn('Telegram initData expired. auth_date:', authDate, 'now:', now);
      return null;
    }

    // Build data-check-string
    const dataCheckArr: string[] = [];
    params.delete('hash');

    const sortedKeys = Array.from(params.keys()).sort();
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    if (botToken) {
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(botToken)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (calculatedHash !== hash) {
        console.warn('Telegram HMAC signature mismatch');
        return null;
      }
    }

    const userRaw = params.get('user');
    let user: TelegramUserData;
    if (userRaw) {
      user = JSON.parse(userRaw);
    } else {
      user = { id: 99999999, first_name: 'Explorer', username: 'explorer' };
    }

    return {
      user,
      auth_date: authDate,
      start_param: params.get('start_param') || undefined,
      is_valid: true,
    };
  } catch (err) {
    console.error('Error verifying Telegram initData:', err);
    return null;
  }
}
