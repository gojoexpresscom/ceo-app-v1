/*
# CEO Exchange - Notifications & Alerts System

1. New Tables
  - `notifications` - Logs all user alerts (trades, deposits, security changes)
    - Includes anti_phishing_code for email authenticity
    - Tracks email send status

2. Notes
  - Notifications are user-scoped (auth.uid() = user_id)
  - All automated emails must include the user's anti-phishing code
  - Types: TRADE, DEPOSIT, WITHDRAWAL, SECURITY, SYSTEM
*/

CREATE TABLE IF NOT EXISTS notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('TRADE','DEPOSIT','WITHDRAWAL','SECURITY','SYSTEM')),
  subject text NOT NULL,
  message text NOT NULL,
  anti_phishing_code text,
  email_sent boolean NOT NULL DEFAULT false,
  read boolean NOT NULL DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_notifications" ON notifications;
CREATE POLICY "select_own_notifications" ON notifications FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_notifications" ON notifications;
CREATE POLICY "insert_own_notifications" ON notifications FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_notifications" ON notifications;
CREATE POLICY "update_own_notifications" ON notifications FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications (user_id, created_at DESC);
