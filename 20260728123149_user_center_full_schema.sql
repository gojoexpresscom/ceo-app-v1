-- Preference + security columns on profiles
ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS nickname text,
  ADD COLUMN IF NOT EXISTS color_up text DEFAULT 'green',
  ADD COLUMN IF NOT EXISTS routing_mode text DEFAULT 'auto',
  ADD COLUMN IF NOT EXISTS deposit_to text DEFAULT 'funding',
  ADD COLUMN IF NOT EXISTS app_lock_enabled boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS withdrawal_lock_until timestamptz,
  ADD COLUMN IF NOT EXISTS secure_tx_approval boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS notification_push boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_trade boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_security boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS notification_marketing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS email_trade boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_security boolean DEFAULT true,
  ADD COLUMN IF NOT EXISTS email_marketing boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS totp_secret text,
  ADD COLUMN IF NOT EXISTS time_zone text DEFAULT 'UTC',
  ADD COLUMN IF NOT EXISTS passkey_count integer DEFAULT 0;

-- Active sessions / trusted devices
CREATE TABLE IF NOT EXISTS trusted_devices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  device_name text NOT NULL DEFAULT 'Web Browser',
  device_type text DEFAULT 'web',
  ip_address text DEFAULT '—',
  last_login timestamptz DEFAULT now(),
  is_current boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE trusted_devices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud_own_devices" ON trusted_devices FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Whitelist withdrawal addresses
CREATE TABLE IF NOT EXISTS withdrawal_addresses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  label text NOT NULL,
  coin text NOT NULL,
  network text NOT NULL,
  address text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE withdrawal_addresses ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud_own_withdrawal_addrs" ON withdrawal_addresses FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Subaccounts
CREATE TABLE IF NOT EXISTS subaccounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parent_user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  api_key text NOT NULL DEFAULT encode(gen_random_bytes(16), 'hex'),
  permissions text[] DEFAULT ARRAY['read'],
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE subaccounts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud_own_subaccounts" ON subaccounts FOR ALL TO authenticated
  USING (auth.uid() = parent_user_id) WITH CHECK (auth.uid() = parent_user_id);

-- User feedback / bug reports
CREATE TABLE IF NOT EXISTS user_feedback (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'FEATURE' CHECK (type IN ('BUG','FEATURE','COMPLAINT','PRAISE')),
  subject text NOT NULL,
  message text NOT NULL,
  status text DEFAULT 'OPEN',
  created_at timestamptz DEFAULT now()
);
ALTER TABLE user_feedback ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud_own_feedback" ON user_feedback FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
