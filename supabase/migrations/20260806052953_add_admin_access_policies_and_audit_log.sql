/*
# Add admin access policies and audit log table

## Overview
1. Adds admin/owner SELECT policies to tables that were previously owner-scoped only,
   so admin users can view all KYC submissions, transactions, support messages, and tickets.
2. Adds admin/owner UPDATE policies to user_verifications (for approve/reject) and
   support_tickets/support_messages (for reply/close).
3. Adds admin/owner UPDATE policy to profiles so admins can ban/unban users and update roles.
4. Creates `admin_logs` table for audit trail of all admin actions.
5. Adds admin/owner SELECT policy to community_posts and user_warnings so admin can review.

## Tables Modified
- user_verifications: +admin SELECT, +admin UPDATE
- transactions: +admin SELECT
- support_messages: +admin SELECT, +admin INSERT (for admin replies)
- support_tickets: +admin SELECT (already has admin via EXISTS, but adding explicit)
- profiles: +admin UPDATE (for ban/unban/role changes)
- community_posts: +admin SELECT (already has read_posts but only non-removed)
- user_warnings: already has admin SELECT via EXISTS

## New Tables
- admin_logs:
  - id (uuid PK)
  - admin_id (uuid, FK to auth.users)
  - admin_email (text)
  - action (text) — e.g. 'ban_user', 'approve_kyc', 'post_announcement'
  - target_type (text) — e.g. 'user', 'kyc', 'ticket'
  - target_id (text, nullable)
  - details (text, nullable)
  - created_at (timestamptz)

## Security
- admin_logs: admin/owner can read all, any authenticated can insert their own
- All admin policies use EXISTS check against profiles table for role = 'admin' or 'owner'
*/

-- Helper: admin or owner check
-- We use EXISTS subquery against profiles where role IN ('admin','owner')

-- ============ user_verifications: admin SELECT ============
DROP POLICY IF EXISTS "select_all_verifications_admin" ON user_verifications;
CREATE POLICY "select_all_verifications_admin"
ON user_verifications FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
  OR auth.uid() = user_id
);

-- ============ user_verifications: admin UPDATE ============
DROP POLICY IF EXISTS "update_verifications_admin" ON user_verifications;
CREATE POLICY "update_verifications_admin"
ON user_verifications FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
  OR auth.uid() = user_id
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
  OR auth.uid() = user_id
);

-- ============ transactions: admin SELECT ============
DROP POLICY IF EXISTS "select_all_transactions_admin" ON transactions;
CREATE POLICY "select_all_transactions_admin"
ON transactions FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
  OR auth.uid() = user_id
);

-- ============ support_messages: admin SELECT + INSERT ============
DROP POLICY IF EXISTS "select_all_support_messages_admin" ON support_messages;
CREATE POLICY "select_all_support_messages_admin"
ON support_messages FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
  OR auth.uid() = user_id
);

DROP POLICY IF EXISTS "insert_support_messages_admin" ON support_messages;
CREATE POLICY "insert_support_messages_admin"
ON support_messages FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
  OR auth.uid() = user_id
);

-- ============ profiles: admin UPDATE ============
DROP POLICY IF EXISTS "update_profiles_admin" ON profiles;
CREATE POLICY "update_profiles_admin"
ON profiles FOR UPDATE
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
  OR auth.uid() = user_id
)
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
  OR auth.uid() = user_id
);

-- ============ community_posts: admin SELECT all (including removed) ============
DROP POLICY IF EXISTS "select_all_posts_admin" ON community_posts;
CREATE POLICY "select_all_posts_admin"
ON community_posts FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
  OR is_removed = false
);

-- ============ admin_logs table ============
CREATE TABLE IF NOT EXISTS admin_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  admin_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  admin_email text NOT NULL,
  action text NOT NULL,
  target_type text,
  target_id text,
  details text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE admin_logs ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_admin_logs" ON admin_logs;
CREATE POLICY "select_admin_logs"
ON admin_logs FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
);

DROP POLICY IF EXISTS "insert_admin_logs" ON admin_logs;
CREATE POLICY "insert_admin_logs"
ON admin_logs FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM profiles p
    WHERE p.user_id = auth.uid() AND p.role IN ('admin', 'owner')
  )
);

CREATE INDEX IF NOT EXISTS idx_admin_logs_created_at ON admin_logs(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_admin_logs_action ON admin_logs(action);
