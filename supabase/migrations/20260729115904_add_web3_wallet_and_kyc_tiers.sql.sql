-- Web3 Wallet transactions log (on-chain tx references)
CREATE TABLE IF NOT EXISTS web3_wallet_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  tx_hash text NOT NULL,
  chain_id text NOT NULL,
  token_symbol text NOT NULL,
  amount text NOT NULL,
  recipient_address text NOT NULL,
  tx_type text NOT NULL DEFAULT 'send' CHECK (tx_type IN ('send','receive','swap','approve')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','confirmed','failed')),
  explorer_url text,
  gas_used text,
  block_number bigint,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE web3_wallet_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_web3_txs" ON web3_wallet_transactions FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_web3_txs" ON web3_wallet_transactions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_web3_txs" ON web3_wallet_transactions FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_web3_txs" ON web3_wallet_transactions FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_web3_txs_user ON web3_wallet_transactions(user_id);
CREATE INDEX IF NOT EXISTS idx_web3_txs_hash ON web3_wallet_transactions(tx_hash);

-- DApp connection sessions (WalletConnect-style)
CREATE TABLE IF NOT EXISTS web3_dapp_connections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  wallet_address text NOT NULL,
  dapp_url text NOT NULL,
  dapp_name text NOT NULL,
  dapp_icon text,
  chain_id text NOT NULL,
  status text NOT NULL DEFAULT 'active' CHECK (status IN ('active','disconnected','rejected')),
  permissions jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_connected_at timestamptz
);

ALTER TABLE web3_dapp_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_dapp_conn" ON web3_dapp_connections FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_dapp_conn" ON web3_dapp_connections FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_dapp_conn" ON web3_dapp_connections FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_dapp_conn" ON web3_dapp_connections FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- Biometric credential registrations (WebAuthn)
CREATE TABLE IF NOT EXISTS webauthn_credentials (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  credential_id text NOT NULL UNIQUE,
  public_key text NOT NULL,
  counter integer NOT NULL DEFAULT 0,
  device_type text,
  transports jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  last_used_at timestamptz
);

ALTER TABLE webauthn_credentials ENABLE ROW LEVEL SECURITY;

CREATE POLICY "select_own_credentials" ON webauthn_credentials FOR SELECT
  TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_credentials" ON webauthn_credentials FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_credentials" ON webauthn_credentials FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_credentials" ON webauthn_credentials FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- KYC tier tracking (Level 1, 2, 3)
ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS tier_level integer DEFAULT 1;
ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS liveness_score numeric;
ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS liveness_passed boolean DEFAULT false;
ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS tier1_completed boolean DEFAULT false;
ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS tier2_completed boolean DEFAULT false;
ALTER TABLE user_verifications ADD COLUMN IF NOT EXISTS tier3_completed boolean DEFAULT false;
