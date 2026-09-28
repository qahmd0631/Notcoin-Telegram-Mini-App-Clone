import { Bot, InlineKeyboard } from 'grammy';
import dotenv from 'dotenv';
import { AURA_AGEN_SETTINGS, LEVELS } from '../src/lib/auragen.js';

dotenv.config();

const BOT_TOKEN = process.env.BOT_TOKEN || process.env.TELEGRAM_BOT_TOKEN;
const MINI_APP_URL =
  process.env.VITE_MINI_APP_URL ||
  process.env.APP_URL ||
  'https://t.me/AURA_AGENBOT/app';

export function initTelegramBot(): Bot | null {
  if (!BOT_TOKEN || BOT_TOKEN.trim() === '') {
    console.log('ℹ️ No BOT_TOKEN provided. Telegram Bot poller is idle.');
    return null;
  }

  try {
    const bot = new Bot(BOT_TOKEN.trim());

    // /start command with deep linking referral support
    bot.command('start', async (ctx) => {
      const payload = ctx.match; // e.g. "ref_12345678" or "12345678"
      const firstName = ctx.from?.first_name || 'Miner';

      let webAppLaunchUrl = MINI_APP_URL;
      if (payload) {
        webAppLaunchUrl += (webAppLaunchUrl.includes('?') ? '&' : '?') + `startapp=${encodeURIComponent(payload)}`;
      }

      const keyboard = new InlineKeyboard()
        .webApp('⚡ Launch AURA_AGEN App', webAppLaunchUrl)
        .row()
        .url('📢 Join Official Channel', AURA_AGEN_SETTINGS.telegram_channel)
        .url('💬 Community Chat', 'https://t.me/NEW_AURA_GEN');

      let referralNotice = '';
      if (payload) {
        referralNotice = `\n🎁 *Invited via Referral:* You entered with referral code \`${payload}\`. Both you and your sponsor will receive bonuses!\n`;
      }

      const welcomeMessage = `
💎 *Welcome to AURA_AGEN ($AGEN)* 💎

Hello *${firstName}*! You have entered the official high-yield decentralized mining ecosystem on TON Mainnet.

⚡ *Key Features:*
• *Automated Server Mining:* Earn up to 921.60 AGEN/hr across 12 tiers.
• *Referral Network Bounty:* Earn *50 AGEN* instantly for every referred miner.
• *Monetag Daily Ad Vault:* Earn 1 AGEN per completed session (up to 10 daily).
• *Social Tasks:* Claim 2 AGEN for subscribing to @NEW_AURA_GEN.
• *TON Treasury Upgrade:* Level up with direct TON deposit to treasury.

${referralNotice}
Click the button below to start mining inside Telegram!
`;

      await ctx.reply(welcomeMessage, {
        parse_mode: 'Markdown',
        reply_markup: keyboard,
      });
    });

    // /help command
    bot.command('help', async (ctx) => {
      await ctx.reply(
        `📖 *AURA_AGEN Commands:*
/start - Launch the mini app and initialize your miner
/levels - View the 12-tier progression matrix and rewards
/referral - Get your unique invite link
/help - Show this guide

Join our channel: ${AURA_AGEN_SETTINGS.telegram_channel}`,
        { parse_mode: 'Markdown' }
      );
    });

    // /levels command
    bot.command('levels', async (ctx) => {
      const levelLines = LEVELS.map(
        (l) => `*Level ${l.level} (${l.label})*: ${l.hourly_rate} AGEN/hr | ${l.ton_amount} TON Deposit`
      ).join('\n');

      await ctx.reply(
        `🏆 *AURA_AGEN 12-Tier Level Matrix*\n\n${levelLines}\n\n*Baseline:* 100 AGEN = 0.1 TON (1 AGEN = 0.001 TON)`,
        { parse_mode: 'Markdown' }
      );
    });

    // /referral command
    bot.command('referral', async (ctx) => {
      const userId = ctx.from?.id;
      const refLink = `https://t.me/${AURA_AGEN_SETTINGS.bot_username}?start=ref_${userId}`;
      await ctx.reply(
        `👥 *Invite Friends, Earn $AGEN!*\n\nShare your link:\n\`${refLink}\`\n\nReward: *50 AGEN* per invited friend!`,
        { parse_mode: 'Markdown' }
      );
    });

    bot.catch((err) => {
      console.error('Telegram bot error:', err);
    });

    // Start bot asynchronously without blocking server startup
    bot.start({
      onStart: (botInfo) => {
        console.log(`🤖 Telegram Bot @${botInfo.username} running successfully!`);
      },
    }).catch((err) => {
      console.warn('Bot polling could not start (likely invalid or restricted token):', err.message);
    });

    return bot;
  } catch (error) {
    console.error('Failed to initialize Grammy bot:', error);
    return null;
  }
}
