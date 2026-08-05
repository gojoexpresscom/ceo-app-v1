/*
# Create user_verifications table for KYC identity verification

## Overview
1. Creates a new `user_verifications` table to store KYC submissions
2. Each row represents one verification submission by a user
3. Status flows: pending -> verified | rejected
4. RLS enabled with owner-scoped CRUD policies

## New Tables
- `user_verifications`:
  - id (uuid PK)
  - user_id (uuid, defaults to auth.uid(), FK to auth.users)
  - full_name (text) — legal name on the document
  - document_type (text) — 'passport' | 'national_id' | 'drivers_license'
  - document_number (text) — the ID/passport/license number
  - date_of_birth (date) — DOB from the document
  - front_photo_url (text) — storage URL for front photo
  - back_photo_url (text, nullable) — storage URL for back photo (null for passport)
  - status (text, default 'pending') — 'pending' | 'verified' | 'rejected'
  - rejection_reason (text, nullable)
  - created_at (timestamptz)
  - updated_at (timestamptz)

## Security
- RLS enabled on user_verifications
- 4 owner-scoped policies (SELECT, INSERT, UPDATE, DELETE) scoped to authenticated users
- user_id defaults to auth.uid() so inserts omitting user_id succeed

## Important Notes
1. The app will insert a row with status='pending' when a user submits KYC
2. The app reads the latest row for the user to determine current KYC status
3. A scheduled function or manual admin action sets status='verified' after review
4. P2P trading is gated on status='verified'
*/

CREATE TABLE IF NOT EXISTS user_verifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text NOT NULL,
  document_type text NOT NULL CHECK (document_type IN ('passport', 'national_id', 'drivers_license')),
  document_number text NOT NULL,
  date_of_birth date NOT NULL,
  front_photo_url text,
  back_photo_url text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'rejected')),
  rejection_reason text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE user_verifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_verifications" ON user_verifications;
CREATE POLICY "select_own_verifications" ON user_verifications FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_verifications" ON user_verifications;
CREATE POLICY "insert_own_verifications" ON user_verifications FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_verifications" ON user_verifications;
CREATE POLICY "update_own_verifications" ON user_verifications FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_verifications" ON user_verifications;
CREATE POLICY "delete_own_verifications" ON user_verifications FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_user_verifications_user_id ON user_verifications(user_id);
CREATE INDEX IF NOT EXISTS idx_user_verifications_status ON user_verifications(status);

-- Auto-update updated_at on row changes
CREATE OR REPLACE FUNCTION update_user_verifications_updated_at()
RETURNS trigger AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_user_verifications_updated_at ON user_verifications;
CREATE TRIGGER trg_user_verifications_updated_at
  BEFORE UPDATE ON user_verifications
  FOR EACH ROW EXECUTE FUNCTION update_user_verifications_updated_at();