-- Extend profiles with new fields
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone_verified boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS profile_picture_url text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS telegram_handle text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS twitter_handle text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS whatsapp_number text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS country_code text DEFAULT '+1';

-- Email change OTP codes
CREATE TABLE IF NOT EXISTS email_change_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  new_email text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE email_change_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_email_codes" ON email_change_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_email_codes" ON email_change_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_email_codes" ON email_change_codes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_email_codes" ON email_change_codes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Phone OTP codes
CREATE TABLE IF NOT EXISTS phone_otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  code text NOT NULL,
  phone text NOT NULL,
  country_code text NOT NULL,
  expires_at timestamptz NOT NULL,
  used boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE phone_otp_codes ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_phone_codes" ON phone_otp_codes FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_phone_codes" ON phone_otp_codes FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_phone_codes" ON phone_otp_codes FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_phone_codes" ON phone_otp_codes FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- KYC documents store
CREATE TABLE IF NOT EXISTS kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL CHECK (document_type IN ('NATIONAL_ID', 'DRIVERS_LICENSE', 'PASSPORT')),
  full_name text,
  document_number text,
  nationality text,
  expiry_date text,
  extra_data jsonb DEFAULT '{}',
  status text NOT NULL DEFAULT 'PENDING' CHECK (status IN ('PENDING', 'APPROVED', 'REJECTED')),
  rejection_reason text,
  submitted_at timestamptz DEFAULT now(),
  reviewed_at timestamptz
);
ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;
CREATE POLICY "select_own_kyc" ON kyc_documents FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_kyc" ON kyc_documents FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "update_own_kyc" ON kyc_documents FOR UPDATE TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_kyc" ON kyc_documents FOR DELETE TO authenticated USING (auth.uid() = user_id);
