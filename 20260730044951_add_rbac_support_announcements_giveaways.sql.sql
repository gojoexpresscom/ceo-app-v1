/*
# CEO Exchange — RBAC, Support, Announcements, Giveaways, Warnings

This migration adds the full role-based access control and platform management schema.

## New Tables
1. `user_roles` — maps users to admin or owner role (admin@ceo.exchange.web, owner@gojoexpresscom)
2. `platform_announcements` — homepage announcements posted by admin/owner only
3. `support_tickets` — user-submitted reports/questions in any language
4. `support_ticket_replies` — admin/owner replies to tickets
5. `user_warnings` — warnings issued by owner (2 warnings → ban)
6. `giveaway_campaigns` — admin/owner-created giveaway campaigns
7. `giveaway_redemptions` — users claiming giveaway rewards or redeeming codes
8. `merchant_requests` — P2P merchant access requests sent via support inbox
9. `otp_codes` — 6-digit OTP codes sent via email for 2FA and login verification

## Modified Tables
- `profiles` — add `role`, `warning_count`, `is_banned`, `nickname` columns

## Security
- RLS enabled on all new tables
- Owner-scoped policies for user data
- Admin/owner-only policies for announcements, warnings, giveaways
- Public read for announcements
*/

-- ============ PROFILES EXTENSIONS ============
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS role text DEFAULT 'user' CHECK (role IN ('user','admin','owner'));
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS warning_count integer DEFAULT 0;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_banned boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS banned_at timestamptz;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS ban_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nickname text;

-- ============ PLATFORM ANNOUNCEMENTS ============
CREATE TABLE IF NOT EXISTS platform_announcements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL DEFAULT auth.uid(),
  author_email text NOT NULL,
  author_role text NOT NULL DEFAULT 'admin',
  title text NOT NULL,
  content text NOT NULL,
  type text NOT NULL DEFAULT 'info' CHECK (type IN ('info','warning','success','maintenance','promotion')),
  is_active boolean NOT NULL DEFAULT true,
  is_pinned boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE platform_announcements ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_announcements" ON platform_announcements;
CREATE POLICY "select_announcements" ON platform_announcements FOR SELECT
  TO anon, authenticated USING (is_active = true);

DROP POLICY IF EXISTS "insert_announcements" ON platform_announcements;
CREATE POLICY "insert_announcements" ON platform_announcements FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = author_id AND
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

DROP POLICY IF EXISTS "update_announcements" ON platform_announcements;
CREATE POLICY "update_announcements" ON platform_announcements FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

DROP POLICY IF EXISTS "delete_announcements" ON platform_announcements;
CREATE POLICY "delete_announcements" ON platform_announcements FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

-- ============ SUPPORT TICKETS ============
CREATE TABLE IF NOT EXISTS support_tickets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text NOT NULL,
  subject text NOT NULL,
  message text NOT NULL,
  category text NOT NULL DEFAULT 'general' CHECK (category IN ('general','report_user','report_trade','merchant_request','bug','feedback','p2p_dispute')),
  status text NOT NULL DEFAULT 'open' CHECK (status IN ('open','in_progress','resolved','closed')),
  priority text NOT NULL DEFAULT 'normal' CHECK (priority IN ('low','normal','high','urgent')),
  related_user_id uuid,
  related_trade_id text,
  language text DEFAULT 'en',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz
);

ALTER TABLE support_tickets ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_tickets" ON support_tickets;
CREATE POLICY "select_own_tickets" ON support_tickets FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

DROP POLICY IF EXISTS "insert_own_tickets" ON support_tickets;
CREATE POLICY "insert_own_tickets" ON support_tickets FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_tickets" ON support_tickets;
CREATE POLICY "update_own_tickets" ON support_tickets FOR UPDATE
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  ) WITH CHECK (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

DROP POLICY IF EXISTS "delete_own_tickets" ON support_tickets;
CREATE POLICY "delete_own_tickets" ON support_tickets FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- ============ SUPPORT TICKET REPLIES ============
CREATE TABLE IF NOT EXISTS support_ticket_replies (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES support_tickets(id) ON DELETE CASCADE,
  replier_id uuid NOT NULL DEFAULT auth.uid(),
  replier_email text NOT NULL,
  replier_role text NOT NULL DEFAULT 'user',
  message text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE support_ticket_replies ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_ticket_replies" ON support_ticket_replies;
CREATE POLICY "select_ticket_replies" ON support_ticket_replies FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = support_ticket_replies.ticket_id AND (st.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))))
  );

DROP POLICY IF EXISTS "insert_ticket_replies" ON support_ticket_replies;
CREATE POLICY "insert_ticket_replies" ON support_ticket_replies FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = replier_id AND
    EXISTS (SELECT 1 FROM support_tickets st WHERE st.id = support_ticket_replies.ticket_id AND (st.user_id = auth.uid() OR EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))))
  );

-- ============ USER WARNINGS ============
CREATE TABLE IF NOT EXISTS user_warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  warned_by uuid NOT NULL DEFAULT auth.uid(),
  warned_by_email text NOT NULL,
  reason text NOT NULL,
  warning_number integer NOT NULL DEFAULT 1,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE user_warnings ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_warnings_owner" ON user_warnings;
CREATE POLICY "select_warnings_owner" ON user_warnings FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'owner')
  );

DROP POLICY IF EXISTS "insert_warnings_owner" ON user_warnings;
CREATE POLICY "insert_warnings_owner" ON user_warnings FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role = 'owner')
  );

-- ============ GIVEAWAY CAMPAIGNS ============
CREATE TABLE IF NOT EXISTS giveaway_campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  creator_id uuid NOT NULL DEFAULT auth.uid(),
  creator_email text NOT NULL,
  title text NOT NULL,
  description text,
  reward_amount numeric NOT NULL DEFAULT 0,
  reward_currency text NOT NULL DEFAULT 'USDT',
  total_codes integer NOT NULL DEFAULT 1,
  codes_used integer NOT NULL DEFAULT 0,
  redeem_code text UNIQUE,
  is_active boolean NOT NULL DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE giveaway_campaigns ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_campaigns" ON giveaway_campaigns;
CREATE POLICY "select_campaigns" ON giveaway_campaigns FOR SELECT
  TO authenticated USING (is_active = true OR creator_id = auth.uid());

DROP POLICY IF EXISTS "insert_campaigns_admin" ON giveaway_campaigns;
CREATE POLICY "insert_campaigns_admin" ON giveaway_campaigns FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

DROP POLICY IF EXISTS "update_campaigns_admin" ON giveaway_campaigns;
CREATE POLICY "update_campaigns_admin" ON giveaway_campaigns FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

DROP POLICY IF EXISTS "delete_campaigns_admin" ON giveaway_campaigns;
CREATE POLICY "delete_campaigns_admin" ON giveaway_campaigns FOR DELETE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

-- ============ GIVEAWAY REDEMPTIONS ============
CREATE TABLE IF NOT EXISTS giveaway_redemptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid NOT NULL REFERENCES giveaway_campaigns(id) ON DELETE CASCADE,
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text NOT NULL,
  reward_amount numeric NOT NULL,
  reward_currency text NOT NULL DEFAULT 'USDT',
  redeem_code text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE giveaway_redemptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_redemptions" ON giveaway_redemptions;
CREATE POLICY "select_own_redemptions" ON giveaway_redemptions FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

DROP POLICY IF EXISTS "insert_own_redemptions" ON giveaway_redemptions;
CREATE POLICY "insert_own_redemptions" ON giveaway_redemptions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- ============ MERCHANT REQUESTS ============
CREATE TABLE IF NOT EXISTS merchant_requests (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid(),
  user_email text NOT NULL,
  request_type text NOT NULL CHECK (request_type IN ('buy_merchant','sell_merchant','both')),
  message text,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','approved','denied')),
  reviewed_by uuid,
  reviewed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE merchant_requests ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_merchant_req" ON merchant_requests;
CREATE POLICY "select_own_merchant_req" ON merchant_requests FOR SELECT
  TO authenticated USING (
    auth.uid() = user_id OR
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

DROP POLICY IF EXISTS "insert_own_merchant_req" ON merchant_requests;
CREATE POLICY "insert_own_merchant_req" ON merchant_requests FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_merchant_req_admin" ON merchant_requests;
CREATE POLICY "update_merchant_req_admin" ON merchant_requests FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  ) WITH CHECK (
    EXISTS (SELECT 1 FROM profiles WHERE profiles.user_id = auth.uid() AND profiles.role IN ('admin','owner'))
  );

-- ============ OTP CODES (email-based) ============
CREATE TABLE IF NOT EXISTS otp_codes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid,
  email text NOT NULL,
  code text NOT NULL,
  purpose text NOT NULL DEFAULT 'login' CHECK (purpose IN ('login','2fa_setup','2fa_verify','signup','recovery')),
  expires_at timestamptz NOT NULL,
  used boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE otp_codes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_otp" ON otp_codes;
CREATE POLICY "select_own_otp" ON otp_codes FOR SELECT
  TO authenticated USING (auth.uid() = user_id OR email = (auth.jwt() ->> 'email'));

DROP POLICY IF EXISTS "insert_own_otp" ON otp_codes;
CREATE POLICY "insert_own_otp" ON otp_codes FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "update_own_otp" ON otp_codes;
CREATE POLICY "update_own_otp" ON otp_codes FOR UPDATE
  TO anon, authenticated USING (true) WITH CHECK (true);

-- Index for fast OTP lookup
CREATE INDEX IF NOT EXISTS idx_otp_email_code ON otp_codes(email, code, used);
CREATE INDEX IF NOT EXISTS idx_otp_expires ON otp_codes(expires_at);

-- ============ PROFILES RLS POLICY UPDATES ============
-- Allow users to read any profile (for social features) but only update their own
DROP POLICY IF EXISTS "select_own_profiles" ON profiles;
CREATE POLICY "select_all_profiles" ON profiles FOR SELECT
  TO authenticated USING (true);

-- Keep existing insert/update policies (user can only modify own profile)
-- Add ban check: banned users cannot login
