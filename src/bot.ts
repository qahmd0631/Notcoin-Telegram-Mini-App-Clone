export const BOT_USERNAME = 'AURA_AGENBOT';

export const getBotToken = () => {
  const runtimeToken = typeof process !== 'undefined' ? process.env?.BOT_TOKEN : undefined;
  return (import.meta.env.VITE_BOT_TOKEN ?? runtimeToken ?? '').trim();
};

export const getBotStartCommand = (referrerId?: string | number) => {
  if (!referrerId) {
    return '/start';
  }
  return `/start ref_${String(referrerId)}`;
};

export const buildMiniAppLaunchUrl = (referrerId?: string | number) => {
  const base = `https://t.me/${BOT_USERNAME}/app?startapp=main`;
  return referrerId ? `${base}&start=${encodeURIComponent(String(referrerId))}` : base;
};
