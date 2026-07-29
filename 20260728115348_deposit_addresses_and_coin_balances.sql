-- Deposit addresses: one real address per user/coin/network
CREATE TABLE IF NOT EXISTS deposit_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin text NOT NULL,
  network text NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, coin, network)
);
ALTER TABLE deposit_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_deposit_addresses" ON deposit_addresses FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_deposit_addresses" ON deposit_addresses FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_deposit_addresses" ON deposit_addresses FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_deposit_addresses" ON deposit_addresses FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Per-coin balances (beyond BTC/ETH/USDT already in profiles)
CREATE TABLE IF NOT EXISTS user_coin_balances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  coin text NOT NULL,
  amount numeric NOT NULL DEFAULT 0 CHECK (amount >= 0),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, coin)
);
ALTER TABLE user_coin_balances ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_balances" ON user_coin_balances FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_balances" ON user_coin_balances FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_balances" ON user_coin_balances FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_balances" ON user_coin_balances FOR DELETE TO authenticated USING (auth.uid() = user_id);
