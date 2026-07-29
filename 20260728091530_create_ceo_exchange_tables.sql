/*
# CEO Exchange - Initial Schema

1. New Tables
  - `profiles` - User accounts with balance, KYC status, VIP level
  - `p2p_orders` - P2P marketplace listings
  - `p2p_trades` - Active escrow trades with timer state
  - `transactions` - Withdrawal and deposit history
  - `gold_positions` - TradFi gold leveraged positions

2. Security
  - RLS enabled on all tables
  - Single-tenant (no auth), using anon + authenticated policies for full access

3. Notes
  - This is a demo exchange app; balances are simulated
  - All monetary values stored as numeric(20,8) for precision
*/

CREATE TABLE IF NOT EXISTS profiles (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email text UNIQUE NOT NULL,
  usdt_balance numeric(20,8) NOT NULL DEFAULT 250.00,
  btc_balance numeric(20,8) NOT NULL DEFAULT 0.00,
  eth_balance numeric(20,8) NOT NULL DEFAULT 0.00,
  kyc_status text NOT NULL DEFAULT 'UNVERIFIED' CHECK (kyc_status IN ('UNVERIFIED','PENDING','VERIFIED')),
  vip_level integer NOT NULL DEFAULT 0,
  uid text UNIQUE NOT NULL DEFAULT floor(random() * 900000000 + 100000000)::text,
  security_level text NOT NULL DEFAULT 'Medium',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
CREATE POLICY "anon_select_profiles" ON profiles FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
CREATE POLICY "anon_insert_profiles" ON profiles FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
CREATE POLICY "anon_update_profiles" ON profiles FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;
CREATE POLICY "anon_delete_profiles" ON profiles FOR DELETE TO anon, authenticated USING (true);

-- P2P Orders (merchant listings)
CREATE TABLE IF NOT EXISTS p2p_orders (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  merchant_name text NOT NULL,
  price_etb numeric(10,2) NOT NULL,
  min_limit numeric(12,2) NOT NULL,
  max_limit numeric(12,2) NOT NULL,
  completion_rate numeric(5,2) NOT NULL DEFAULT 100.0,
  available_usdt numeric(20,8) NOT NULL DEFAULT 1000.00,
  payment_methods text[] DEFAULT ARRAY['Telebirr','CBE'],
  is_active boolean NOT NULL DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE p2p_orders ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_p2p_orders" ON p2p_orders;
CREATE POLICY "anon_select_p2p_orders" ON p2p_orders FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_p2p_orders" ON p2p_orders;
CREATE POLICY "anon_insert_p2p_orders" ON p2p_orders FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_p2p_orders" ON p2p_orders;
CREATE POLICY "anon_update_p2p_orders" ON p2p_orders FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_p2p_orders" ON p2p_orders;
CREATE POLICY "anon_delete_p2p_orders" ON p2p_orders FOR DELETE TO anon, authenticated USING (true);

-- P2P Trades (escrow)
CREATE TABLE IF NOT EXISTS p2p_trades (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES p2p_orders(id),
  buyer_email text NOT NULL,
  usdt_amount numeric(20,8) NOT NULL,
  etb_amount numeric(12,2) NOT NULL,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PAID','CONFIRMED','CANCELLED','EXPIRED')),
  escrow_expires_at timestamptz,
  payment_proof_url text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE p2p_trades ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_p2p_trades" ON p2p_trades;
CREATE POLICY "anon_select_p2p_trades" ON p2p_trades FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_p2p_trades" ON p2p_trades;
CREATE POLICY "anon_insert_p2p_trades" ON p2p_trades FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_p2p_trades" ON p2p_trades;
CREATE POLICY "anon_update_p2p_trades" ON p2p_trades FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_p2p_trades" ON p2p_trades;
CREATE POLICY "anon_delete_p2p_trades" ON p2p_trades FOR DELETE TO anon, authenticated USING (true);

-- Transactions (withdrawals/deposits)
CREATE TABLE IF NOT EXISTS transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_email text NOT NULL,
  type text NOT NULL CHECK (type IN ('WITHDRAW','DEPOSIT','TRADE')),
  coin text NOT NULL,
  network text,
  amount numeric(20,8) NOT NULL,
  fee numeric(20,8) NOT NULL DEFAULT 0,
  destination text,
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING','PROCESSING','COMPLETED','FAILED')),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
CREATE POLICY "anon_select_transactions" ON transactions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
CREATE POLICY "anon_insert_transactions" ON transactions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
CREATE POLICY "anon_update_transactions" ON transactions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;
CREATE POLICY "anon_delete_transactions" ON transactions FOR DELETE TO anon, authenticated USING (true);

-- Gold positions
CREATE TABLE IF NOT EXISTS gold_positions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_email text NOT NULL,
  side text NOT NULL CHECK (side IN ('BUY','SELL')),
  leverage integer NOT NULL,
  entry_price numeric(12,2) NOT NULL,
  usdt_margin numeric(20,8) NOT NULL,
  status text NOT NULL DEFAULT 'OPEN' CHECK (status IN ('OPEN','CLOSED')),
  pnl numeric(20,8),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE gold_positions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "anon_select_gold_positions" ON gold_positions;
CREATE POLICY "anon_select_gold_positions" ON gold_positions FOR SELECT TO anon, authenticated USING (true);

DROP POLICY IF EXISTS "anon_insert_gold_positions" ON gold_positions;
CREATE POLICY "anon_insert_gold_positions" ON gold_positions FOR INSERT TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "anon_update_gold_positions" ON gold_positions;
CREATE POLICY "anon_update_gold_positions" ON gold_positions FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "anon_delete_gold_positions" ON gold_positions;
CREATE POLICY "anon_delete_gold_positions" ON gold_positions FOR DELETE TO anon, authenticated USING (true);

-- Seed P2P orders
INSERT INTO p2p_orders (merchant_name, price_etb, min_limit, max_limit, completion_rate, available_usdt, payment_methods)
VALUES
  ('Amanuel_Birhanu', 135.50, 1000, 50000, 99.8, 5000.00, ARRAY['Telebirr','CBE']),
  ('COINBroker_ET', 135.80, 500, 10000, 100.0, 2000.00, ARRAY['Telebirr','M-Pesa']),
  ('FastSwap_ETH', 136.00, 2000, 100000, 98.5, 10000.00, ARRAY['CBE','Telebirr','M-Pesa']),
  ('CryptoKing_ET', 135.20, 1000, 20000, 97.2, 3000.00, ARRAY['Telebirr'])
ON CONFLICT DO NOTHING;

-- Seed a demo profile
INSERT INTO profiles (email, usdt_balance, kyc_status, vip_level, security_level)
VALUES ('amanuel@ceo.com', 250.00, 'VERIFIED', 0, 'High')
ON CONFLICT (email) DO NOTHING;
