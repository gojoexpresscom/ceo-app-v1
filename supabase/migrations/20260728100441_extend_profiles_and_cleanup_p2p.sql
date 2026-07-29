/*
# CEO Exchange - Profile Extensions & P2P Marketplace Cleanup

1. Changes to `profiles` table
  - Add `nickname` (text) - user display name
  - Add `passcode` (text) - 6-digit PIN for mobile unlock
  - Add `p2p_merchant_status` (text) - merchant application state: NONE | PENDING | APPROVED | REJECTED
  - Add `p2p_merchant_applied_at` (timestamptz) - when application was submitted
  - Add `fund_password_set` (boolean) - whether fund password has been configured
  - Add `two_fa_enabled` (boolean) - 2FA status
  - Add `preferred_language` (text) - language preference
  - Add `preferred_currency` (text) - display currency (USD, ETB, etc.)

2. P2P Orders cleanup
  - Deactivate all seeded demo listings (set is_active = false)
  - Real listings must be created by approved merchants only

3. Notes
  - p2p_merchant_status defaults to 'NONE' (no application submitted)
  - Merchants require account age >= 30 days AND admin approval
*/

-- Add new columns to profiles
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'nickname') THEN
    ALTER TABLE profiles ADD COLUMN nickname text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'passcode') THEN
    ALTER TABLE profiles ADD COLUMN passcode text;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'p2p_merchant_status') THEN
    ALTER TABLE profiles ADD COLUMN p2p_merchant_status text NOT NULL DEFAULT 'NONE' CHECK (p2p_merchant_status IN ('NONE','PENDING','APPROVED','REJECTED'));
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'p2p_merchant_applied_at') THEN
    ALTER TABLE profiles ADD COLUMN p2p_merchant_applied_at timestamptz;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'fund_password_set') THEN
    ALTER TABLE profiles ADD COLUMN fund_password_set boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'two_fa_enabled') THEN
    ALTER TABLE profiles ADD COLUMN two_fa_enabled boolean NOT NULL DEFAULT false;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_language') THEN
    ALTER TABLE profiles ADD COLUMN preferred_language text NOT NULL DEFAULT 'English';
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'profiles' AND column_name = 'preferred_currency') THEN
    ALTER TABLE profiles ADD COLUMN preferred_currency text NOT NULL DEFAULT 'USD';
  END IF;
END $$;

-- Deactivate all demo/seeded P2P orders so the marketplace starts empty
-- Real orders must be placed by verified merchants
UPDATE p2p_orders SET is_active = false;

-- Add index for merchant lookups
CREATE INDEX IF NOT EXISTS idx_profiles_user_id ON profiles (user_id);
CREATE INDEX IF NOT EXISTS idx_p2p_orders_active ON p2p_orders (is_active, created_at);
CREATE INDEX IF NOT EXISTS idx_transactions_user_id ON transactions (user_id);
