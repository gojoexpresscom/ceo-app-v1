-- Extend p2p_orders for multi-fiat + buy/sell + ad support
ALTER TABLE p2p_orders
  ADD COLUMN IF NOT EXISTS side text DEFAULT 'SELL' CHECK (side IN ('BUY','SELL')),
  ADD COLUMN IF NOT EXISTS fiat_currency text DEFAULT 'ETB',
  ADD COLUMN IF NOT EXISTS price_usd numeric DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS expires_at timestamptz DEFAULT (now() + interval '24 hours'),
  ADD COLUMN IF NOT EXISTS creator_id uuid REFERENCES auth.users(id) ON DELETE SET NULL;

-- P2P trades (escrow) — extend existing
ALTER TABLE p2p_trades
  ADD COLUMN IF NOT EXISTS seller_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS buyer_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS escrow_locked boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS buyer_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS seller_confirmed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS fiat_currency text DEFAULT 'ETB',
  ADD COLUMN IF NOT EXISTS fiat_amount numeric DEFAULT 0;

-- Earn staking subscriptions (125-day vault)
CREATE TABLE IF NOT EXISTS earn_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin text NOT NULL DEFAULT 'USDT',
  amount numeric NOT NULL,
  apy numeric NOT NULL DEFAULT 12.5,
  term_days integer NOT NULL DEFAULT 125,
  start_date timestamptz DEFAULT now(),
  end_date timestamptz DEFAULT (now() + interval '125 days'),
  status text DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','WITHDRAWN','MATURED')),
  last_yield_claim timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE earn_subscriptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud_own_earn" ON earn_subscriptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Referral codes
CREATE TABLE IF NOT EXISTS referrals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  referrer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  referral_code text UNIQUE NOT NULL,
  total_referrals integer DEFAULT 0,
  total_rewards numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE referrals ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud_own_referrals" ON referrals FOR ALL TO authenticated
  USING (auth.uid() = referrer_id) WITH CHECK (auth.uid() = referrer_id);

-- Internal transfers (Giveaway / P2P user transfer)
CREATE TABLE IF NOT EXISTS internal_transfers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sender_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  recipient_uid text NOT NULL,
  amount numeric NOT NULL,
  coin text DEFAULT 'USDT',
  status text DEFAULT 'COMPLETED' CHECK (status IN ('PENDING','COMPLETED','FAILED')),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE internal_transfers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud_own_transfers" ON internal_transfers FOR ALL TO authenticated
  USING (auth.uid() = sender_id) WITH CHECK (auth.uid() = sender_id);

-- Voucher / reward codes
CREATE TABLE IF NOT EXISTS vouchers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  reward_amount numeric NOT NULL,
  max_uses integer DEFAULT 100,
  uses integer DEFAULT 0,
  active boolean DEFAULT true,
  expires_at timestamptz DEFAULT (now() + interval '30 days'),
  created_at timestamptz DEFAULT now()
);
ALTER TABLE vouchers ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_vouchers" ON vouchers FOR SELECT TO authenticated USING (active = true);

-- Voucher redemptions
CREATE TABLE IF NOT EXISTS voucher_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  voucher_id uuid NOT NULL REFERENCES vouchers(id) ON DELETE CASCADE,
  code text NOT NULL,
  reward_amount numeric NOT NULL,
  redeemed_at timestamptz DEFAULT now(),
  UNIQUE(user_id, voucher_id)
);
ALTER TABLE voucher_redemptions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud_own_redemptions" ON voucher_redemptions FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
