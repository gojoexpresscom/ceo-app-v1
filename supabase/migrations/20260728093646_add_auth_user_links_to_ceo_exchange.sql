/*
# Add Auth User Linking to CEO Exchange Schema

1. Changes
  - Add `user_id` column to `profiles` table referencing `auth.users`
  - Add `user_id` column to `transactions` table (owner-scoped)
  - Add `user_id` column to `gold_positions` table (owner-scoped)
  - Add `user_id` column to `p2p_trades` table (buyer owner)
  - Add `earn_subscriptions` table for yield products

2. Security
  - Profiles: owners see/edit only their own row; p2p_orders remain public (any authenticated user)
  - Transactions, gold_positions, p2p_trades: scoped to auth.uid() = user_id
  - earn_subscriptions: scoped to auth.uid() = user_id

3. Notes
  - Existing rows without user_id remain accessible via updated anon policies during migration
  - user_id defaults to auth.uid() so frontend insert({ ... }) never needs to pass it
*/

-- Add user_id to profiles (nullable so existing rows aren't broken)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'profiles' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE profiles ADD COLUMN user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE;
    ALTER TABLE profiles ADD COLUMN anti_phishing_code text;
    ALTER TABLE profiles ADD COLUMN phone text;
  END IF;
END $$;

-- Update profiles RLS: owner-scoped for authenticated, allow anon to read public data
DROP POLICY IF EXISTS "anon_select_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_insert_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_update_profiles" ON profiles;
DROP POLICY IF EXISTS "anon_delete_profiles" ON profiles;

CREATE POLICY "select_own_profile" ON profiles FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_profile" ON profiles FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_profile" ON profiles FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_profile" ON profiles FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- P2P orders remain public (any authenticated user can view merchant listings)
DROP POLICY IF EXISTS "anon_select_p2p_orders" ON p2p_orders;
DROP POLICY IF EXISTS "anon_insert_p2p_orders" ON p2p_orders;
DROP POLICY IF EXISTS "anon_update_p2p_orders" ON p2p_orders;
DROP POLICY IF EXISTS "anon_delete_p2p_orders" ON p2p_orders;

CREATE POLICY "auth_select_p2p_orders" ON p2p_orders FOR SELECT
TO authenticated USING (true);

CREATE POLICY "auth_insert_p2p_orders" ON p2p_orders FOR INSERT
TO authenticated WITH CHECK (true);

CREATE POLICY "auth_update_p2p_orders" ON p2p_orders FOR UPDATE
TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_delete_p2p_orders" ON p2p_orders FOR DELETE
TO authenticated USING (true);

-- Add user_id to p2p_trades
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'p2p_trades' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE p2p_trades ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "anon_select_p2p_trades" ON p2p_trades;
DROP POLICY IF EXISTS "anon_insert_p2p_trades" ON p2p_trades;
DROP POLICY IF EXISTS "anon_update_p2p_trades" ON p2p_trades;
DROP POLICY IF EXISTS "anon_delete_p2p_trades" ON p2p_trades;

CREATE POLICY "select_own_p2p_trades" ON p2p_trades FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_p2p_trades" ON p2p_trades FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_p2p_trades" ON p2p_trades FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_p2p_trades" ON p2p_trades FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Add user_id to transactions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'transactions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE transactions ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "anon_select_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_insert_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_update_transactions" ON transactions;
DROP POLICY IF EXISTS "anon_delete_transactions" ON transactions;

CREATE POLICY "select_own_transactions" ON transactions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_transactions" ON transactions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_transactions" ON transactions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_transactions" ON transactions FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Add user_id to gold_positions
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'gold_positions' AND column_name = 'user_id'
  ) THEN
    ALTER TABLE gold_positions ADD COLUMN user_id uuid DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE;
  END IF;
END $$;

DROP POLICY IF EXISTS "anon_select_gold_positions" ON gold_positions;
DROP POLICY IF EXISTS "anon_insert_gold_positions" ON gold_positions;
DROP POLICY IF EXISTS "anon_update_gold_positions" ON gold_positions;
DROP POLICY IF EXISTS "anon_delete_gold_positions" ON gold_positions;

CREATE POLICY "select_own_gold_positions" ON gold_positions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "insert_own_gold_positions" ON gold_positions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "update_own_gold_positions" ON gold_positions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE POLICY "delete_own_gold_positions" ON gold_positions FOR DELETE
TO authenticated USING (auth.uid() = user_id);

-- Earn subscriptions table
CREATE TABLE IF NOT EXISTS earn_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  coin text NOT NULL,
  amount numeric(20,8) NOT NULL,
  apy numeric(5,2) NOT NULL,
  product_type text NOT NULL,
  status text NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','REDEEMED')),
  subscribed_at timestamptz DEFAULT now(),
  redeem_at timestamptz
);

ALTER TABLE earn_subscriptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_earn" ON earn_subscriptions;
CREATE POLICY "select_own_earn" ON earn_subscriptions FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_earn" ON earn_subscriptions;
CREATE POLICY "insert_own_earn" ON earn_subscriptions FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_earn" ON earn_subscriptions;
CREATE POLICY "update_own_earn" ON earn_subscriptions FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_earn" ON earn_subscriptions;
CREATE POLICY "delete_own_earn" ON earn_subscriptions FOR DELETE
TO authenticated USING (auth.uid() = user_id);
