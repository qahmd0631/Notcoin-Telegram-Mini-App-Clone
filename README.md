# AURA_AGEN

A Telegram Mini App for AURA_AGEN mining, levels, referrals, tasks, TON wallet integration, and Vercel deployment.

## 1. Installing dependencies

```bash
npm install
```

## 2. Supabase setup

1. Create a new Supabase project.
2. Open the SQL editor and run the migration in `supabase/migrations/001_initial_schema.sql`.
3. Keep the project URL and anon key for the app.
4. Set the service role key only for server-side/admin flows.

## 3. Database migration

```bash
# In Supabase SQL editor
\i supabase/migrations/001_initial_schema.sql
```

## 4. Environment variables

Create a `.env` file from `.env.example` and fill in values:

```bash
cp .env.example .env
```

Required variables:

- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `BOT_TOKEN`
- `VITE_BOT_TOKEN`
- `VITE_TON_NETWORK`
- `VITE_TON_RECEIVER_WALLET`
- `VITE_TELEGRAM_CHANNEL`
- `VITE_MONETAG_ZONE_ID`
- `VITE_MINI_APP_URL`

## 5. Telegram bot configuration

1. Create a Telegram bot with BotFather.
2. Set the bot username to `@AURA_AGENBOT`.
3. Save the token in `BOT_TOKEN` and `VITE_BOT_TOKEN`.
4. Add the Mini App URL in the bot configuration or admin panel.

## 6. Mini App configuration

1. Deploy the frontend to Vercel.
2. Set the deployed Vercel domain as the Mini App URL.
3. Ensure the app is launched from Telegram to receive `initData`.
4. Use `startapp=main` or `?start=<referrer_id>` referral launch links.

## 7. TON Connect configuration

1. Keep the receiver wallet as:
   `UQA0N60XaN9c1l5DvOoQcnXWEX7YEFvNaETOnenlk3iSCPX5`
2. Update `public/tonconnect-manifest.json` to match the deployed domain.
3. Use the TON Connect button in the wallet section.

## 8. Monetag configuration

1. Add your Monetag zone ID in `VITE_MONETAG_ZONE_ID`.
2. Keep the ad reward logic aligned with the configured daily limit.
3. Use the channel and ad rules with the default values listed in the product rules.

## 9. Vercel deployment

1. Push the repo to GitHub.
2. Import the repository in Vercel.
3. Use the default Vite configuration and environment variables.
4. Deploy the app.

Example build commands:

```bash
npm install
npm run build
```

## 10. Admin setup

Set Telegram admin IDs in your server-side auth logic and verify they are allowed to access admin flows.

## 11. Testing

```bash
npm test
```

## 12. Enabling withdrawals later

1. Update `withdrawals_enabled` to `true` in the app settings data.
2. Verify the receiver wallet is correct.
3. Keep the minimum threshold at 1000 AGEN.
4. Confirm TON transaction validation before processing a payout.

## Product rules enforced

- Referral reward = 50 AGEN
- Telegram task = 2 AGEN
- Ad reward = 1 AGEN
- Daily ads = 10
- Minimum withdrawal = 1000 AGEN
- Withdrawal default = OFF
- TON network = MAINNET
- Receiver wallet = `UQA0N60XaN9c1l5DvOoQcnXWEX7YEFvNaETOnenlk3iSCPX5`

## Architecture

GitHub → Vercel → Telegram Mini App + API → Supabase PostgreSQL → TON Mainnet → Telegram Bot

