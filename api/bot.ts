import type { VercelRequest, VercelResponse } from './types';
import { applyCors } from './lib/cors';

const BOT_USERNAME = process.env.VITE_TELEGRAM_BOT_USERNAME || 'AURA_AGENBOT';
const MINI_APP_URL =
  process.env.VITE_MINI_APP_URL ||
  process.env.APP_URL ||
  `https://t.me/${BOT_USERNAME}/app`;
const CHANNEL_URL = process.env.VITE_TELEGRAM_CHANNEL || 'https://t.me/NEW_AURA_GEN';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (applyCors(req, res)) return;

  if (req.method === 'GET') {
    return res.status(200).json({
      status: 'ok',
      bot: `@${BOT_USERNAME}`,
      webhook_active: true,
      time: new Date().toISOString(),
    });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const token =
    process.env.TELEGRAM_BOT_TOKEN || process.env.BOT_TOKEN || process.env.VITE_BOT_TOKEN;

  try {
    const update = req.body;
    const message = update?.message;

    if (!message || !message.text) {
      return res.status(200).json({ ok: true });
    }

    const chatId = message.chat?.id;
    const text = message.text.trim();
    const firstName = message.from?.first_name || 'Miner';

    if (text.startsWith('/start')) {
      const parts = text.split(' ');
      const payload = parts.length > 1 ? parts[1].trim() : null;

      let webAppUrl = MINI_APP_URL;
      if (payload) {
        webAppUrl += (webAppUrl.includes('?') ? '&' : '?') + `startapp=${encodeURIComponent(payload)}`;
      }

      let referralNotice = '';
      if (payload) {
        referralNotice = `\n🎁 *Invited via Referral:* Entered with code \`${payload}\`. Both you and your sponsor earn 50 AGEN!\n`;
      }

      const welcomeText = `💎 *Welcome to AURA_AGEN ($AGEN)* 💎

Hello *${firstName}*! You have entered the official high-yield decentralized mining ecosystem on TON Mainnet.

⚡ *Key Features:*
• *Automated Server Mining:* Earn up to 921.60 AGEN/hr across 12 tiers.
• *Referral Bounty:* Earn *50 AGEN* instantly for each referred miner.
• *Monetag Ad Vault:* Earn 1 AGEN per completed session (up to 10 daily).
• *Social Tasks:* Claim 2 AGEN for subscribing to @NEW_AURA_GEN.
• *TON Treasury:* Seamless upgrades to treasury wallet \`UQA0N60XaN9c1l5DvOoQcnXWEX7YEFvNaETOnenlk3iSCPX5\`.

${referralNotice}
Click the button below to launch the Mini App inside Telegram!`;

      // Send telegram reply with WebApp inline button
      if (token && chatId) {
        await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            chat_id: chatId,
            text: welcomeText,
            parse_mode: 'Markdown',
            reply_markup: {
              inline_keyboard: [
                [
                  {
                    text: '⚡ Launch AURA_AGEN App',
                    web_app: { url: webAppUrl },
                  },
                ],
                [
                  {
                    text: '📢 Join Official Channel',
                    url: CHANNEL_URL,
                  },
                ],
              ],
            },
          }),
        }).catch((err) => console.error('Error sending Telegram message:', err));
      }
    }

    return res.status(200).json({ ok: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return res.status(200).json({ ok: true, error: error.message });
  }
}
