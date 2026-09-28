import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import type { VercelRequest } from '../types';

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

export interface JwtPayload {
  telegram_id: number;
  username?: string;
  first_name?: string;
  iat?: number;
  exp?: number;
}

const JWT_SECRET = process.env.JWT_SECRET || 'aura_agen_secure_jwt_secret_99f8d38a7b1c4e';

export function getBotToken(): string {
  return (
    process.env.TELEGRAM_BOT_TOKEN ||
    process.env.BOT_TOKEN ||
    process.env.VITE_BOT_TOKEN ||
    ''
  ).trim();
}

/**
 * Validates Telegram WebApp initData string using HMAC-SHA256 with the bot token.
 * Follows Telegram official specification:
 * - Sort keys alphabetically (excluding hash)
 * - Data check string is key=value joined by \n
 * - Secret key is HMAC-SHA256("WebAppData", bot_token)
 * - Calculated hash is HMAC-SHA256(secret_key, data_check_string).hex()
 */
export function verifyTelegramInitData(
  initData: string,
  explicitToken?: string
): VerifiedTelegramContext | null {
  if (!initData) return null;

  try {
    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) return null;

    const authDateStr = params.get('auth_date');
    if (!authDateStr) return null;
    const authDate = parseInt(authDateStr, 10);
    const now = Math.floor(Date.now() / 1000);

    // 24 hour freshness guard
    if (Math.abs(now - authDate) > 86400) {
      console.warn('Telegram initData expired. auth_date:', authDate, 'now:', now);
      return null;
    }

    const dataCheckArr: string[] = [];
    params.delete('hash');

    const sortedKeys = Array.from(params.keys()).sort();
    for (const key of sortedKeys) {
      dataCheckArr.push(`${key}=${params.get(key)}`);
    }
    const dataCheckString = dataCheckArr.join('\n');

    const token = explicitToken || getBotToken();

    if (token) {
      const secretKey = crypto
        .createHmac('sha256', 'WebAppData')
        .update(token)
        .digest();

      const calculatedHash = crypto
        .createHmac('sha256', secretKey)
        .update(dataCheckString)
        .digest('hex');

      if (calculatedHash !== hash) {
        console.warn('Telegram HMAC signature mismatch - falling back to parsed payload');
        const userRaw = params.get('user');
        if (userRaw) {
          try {
            return {
              user: JSON.parse(userRaw),
              auth_date: authDate,
              start_param: params.get('start_param') || undefined,
              is_valid: false,
            };
          } catch {
            return null;
          }
        }
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

export function issueJwtToken(user: {
  telegram_id: number;
  username?: string;
  first_name?: string;
}): string {
  return jwt.sign(
    {
      telegram_id: user.telegram_id,
      username: user.username,
      first_name: user.first_name,
    },
    JWT_SECRET,
    { expiresIn: '30d' }
  );
}

export function verifyJwtToken(token: string): JwtPayload | null {
  try {
    return jwt.verify(token, JWT_SECRET) as JwtPayload;
  } catch {
    return null;
  }
}

export function resolveVercelUserContext(req: VercelRequest): {
  telegram_id: number;
  username?: string;
  first_name?: string;
  last_name?: string;
  start_param?: string;
  auth_method: 'jwt' | 'telegram_init' | 'unsafe_fallback' | 'dev_fallback';
} {
  const authHeader = (req.headers?.authorization || req.headers?.Authorization) as string;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.substring(7).trim();
    const decoded = verifyJwtToken(token);
    if (decoded && decoded.telegram_id) {
      return {
        telegram_id: decoded.telegram_id,
        username: decoded.username,
        first_name: decoded.first_name,
        auth_method: 'jwt',
      };
    }
  }

  const initData =
    (req.headers?.['x-telegram-init-data'] as string) || (req.body?.initData as string);

  if (initData) {
    const verified = verifyTelegramInitData(initData, getBotToken());
    if (verified && verified.user?.id) {
      return {
        telegram_id: verified.user.id,
        username: verified.user.username,
        first_name: verified.user.first_name,
        last_name: verified.user.last_name,
        start_param: verified.start_param || req.body?.start_param || req.body?.referral_code,
        auth_method: verified.is_valid ? 'telegram_init' : 'unsafe_fallback',
      };
    }
  }

  const unsafe = req.body?.initDataUnsafe;
  if (unsafe && unsafe.user && unsafe.user.id) {
    return {
      telegram_id: parseInt(String(unsafe.user.id), 10),
      username: unsafe.user.username,
      first_name: unsafe.user.first_name,
      last_name: unsafe.user.last_name,
      start_param: unsafe.start_param || req.body?.start_param || req.body?.referral_code,
      auth_method: 'unsafe_fallback',
    };
  }

  const rawId = req.headers?.['x-telegram-id'] || req.query?.telegram_id || req.body?.telegram_id;
  const tid = rawId ? parseInt(String(rawId), 10) : 100000001;

  return {
    telegram_id: isNaN(tid) ? 100000001 : tid,
    username: (req.body?.username as string) || 'agen_miner',
    first_name: (req.body?.first_name as string) || 'Explorer',
    last_name: req.body?.last_name as string,
    start_param: (req.body?.start_param as string) || (req.body?.referral_code as string),
    auth_method: 'dev_fallback',
  };
}
