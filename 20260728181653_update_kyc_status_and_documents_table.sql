/*
# Update KYC: Add REJECTED status, kyc_documents table, OCR support

## Overview
1. Updates the kyc_status CHECK constraint to include 'REJECTED' and 'PENDING_VERIFICATION'
2. Creates kyc_documents table if it doesn't exist
3. Adds OCR-related columns

## Modified Tables
- profiles: kyc_status CHECK constraint updated to include 'REJECTED', 'PENDING_VERIFICATION'

## New Tables
- kyc_documents (if not exists):
  - id, user_id, document_type, full_name, document_number, extra_data (jsonb), status, created_at
*/

-- Update the CHECK constraint on kyc_status to allow REJECTED and PENDING_VERIFICATION
ALTER TABLE profiles DROP CONSTRAINT IF EXISTS profiles_kyc_status_check;
ALTER TABLE profiles ADD CONSTRAINT profiles_kyc_status_check 
  CHECK (kyc_status = ANY (ARRAY['UNVERIFIED'::text, 'PENDING'::text, 'PENDING_VERIFICATION'::text, 'VERIFIED'::text, 'REJECTED'::text]));

-- Create kyc_documents table if not exists
CREATE TABLE IF NOT EXISTS kyc_documents (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  document_type text NOT NULL,
  full_name text NOT NULL,
  document_number text NOT NULL,
  extra_data jsonb,
  status text DEFAULT 'PENDING',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE kyc_documents ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_kyc_documents" ON kyc_documents;
CREATE POLICY "select_own_kyc_documents" ON kyc_documents FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_kyc_documents" ON kyc_documents;
CREATE POLICY "insert_own_kyc_documents" ON kyc_documents FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_kyc_documents" ON kyc_documents;
CREATE POLICY "update_own_kyc_documents" ON kyc_documents FOR UPDATE
  TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_kyc_documents_user_id ON kyc_documents(user_id);
