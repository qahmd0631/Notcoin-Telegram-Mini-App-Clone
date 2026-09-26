CREATE TABLE IF NOT EXISTS app_settings (
    key TEXT PRIMARY KEY,
    value JSONB NOT NULL,
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT UNIQUE NOT NULL,
    username TEXT,
    first_name TEXT,
    wallet_address TEXT,
    points NUMERIC(18,4) NOT NULL DEFAULT 0,
    level INTEGER NOT NULL DEFAULT 1,
    referred_by BIGINT,
    referral_code TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS user_tasks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL,
    task_id TEXT NOT NULL,
    completed BOOLEAN NOT NULL DEFAULT FALSE,
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    progress INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (telegram_id, task_id)
);

CREATE TABLE IF NOT EXISTS referrals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    referrer_id BIGINT NOT NULL,
    referred_id BIGINT NOT NULL,
    reward_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
    claimed BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (referrer_id, referred_id)
);

CREATE TABLE IF NOT EXISTS ad_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL,
    ad_count INTEGER NOT NULL DEFAULT 0,
    rewarded BOOLEAN NOT NULL DEFAULT FALSE,
    reward_amount NUMERIC(18,4) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (telegram_id, created_at)
);

CREATE TABLE IF NOT EXISTS withdrawals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL,
    amount NUMERIC(18,4) NOT NULL CHECK (amount > 0),
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected', 'processed')),
    ton_tx_hash TEXT,
    ton_network TEXT NOT NULL DEFAULT 'mainnet',
    receiver_wallet TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    UNIQUE (telegram_id, ton_tx_hash)
);

CREATE TABLE IF NOT EXISTS user_wallet_links (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    telegram_id BIGINT NOT NULL UNIQUE,
    wallet_address TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS levels (
    level INTEGER PRIMARY KEY,
    agen_amount NUMERIC(18,4) NOT NULL,
    ton_amount NUMERIC(18,4) NOT NULL,
    hourly_rate NUMERIC(18,4) NOT NULL,
    label TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_telegram_id ON users (telegram_id);
CREATE INDEX IF NOT EXISTS idx_users_referred_by ON users (referred_by);
CREATE INDEX IF NOT EXISTS idx_user_tasks_telegram_id ON user_tasks (telegram_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referrer_id ON referrals (referrer_id);
CREATE INDEX IF NOT EXISTS idx_referrals_referred_id ON referrals (referred_id);
CREATE INDEX IF NOT EXISTS idx_ad_logs_telegram_id ON ad_logs (telegram_id);
CREATE INDEX IF NOT EXISTS idx_withdrawals_telegram_id ON withdrawals (telegram_id);

INSERT INTO app_settings (key, value) VALUES
    ('project_name', '"AURA_AGEN"'),
    ('token_symbol', '"AGEN"'),
    ('referral_reward', '50'),
    ('task_reward', '2'),
    ('ad_reward', '1'),
    ('daily_ad_limit', '10'),
    ('withdrawal_minimum', '1000'),
    ('withdrawals_enabled', 'false'),
    ('ton_network', '"mainnet"'),
    ('ton_receiver_wallet', '"UQA0N60XaN9c1l5DvOoQcnXWEX7YEFvNaETOnenlk3iSCPX5"'),
    ('telegram_channel', '"https://t.me/NEW_AURA_GEN"'),
    ('monetag_zone_id', '"11862041"')
ON CONFLICT (key) DO NOTHING;

INSERT INTO levels (level, agen_amount, ton_amount, hourly_rate, label) VALUES
    (1, 100, 0.1, 0.45, 'Genesis'),
    (2, 200, 0.2, 0.9, 'Scout'),
    (3, 400, 0.4, 1.8, 'Miner'),
    (4, 800, 0.8, 3.6, 'Crusher'),
    (5, 1600, 1.6, 7.2, 'Runner'),
    (6, 3200, 3.2, 14.4, 'Drill'),
    (7, 6400, 6.4, 28.8, 'Forge'),
    (8, 12800, 12.8, 57.6, 'Signal'),
    (9, 25600, 25.6, 115.2, 'Core'),
    (10, 51200, 51.2, 230.4, 'Pulse'),
    (11, 102400, 102.4, 460.8, 'Titan'),
    (12, 204800, 204.8, 921.6, 'Apex')
ON CONFLICT (level) DO NOTHING;

INSERT INTO user_tasks (telegram_id, task_id, completed, claimed, progress) VALUES
    (0, 'telegram_channel', true, true, 1)
ON CONFLICT (telegram_id, task_id) DO NOTHING;
