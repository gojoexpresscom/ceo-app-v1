-- Owner fee collection & revenue routing
CREATE TABLE IF NOT EXISTS owner_fees (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  fee_type text NOT NULL CHECK (fee_type IN ('CONVERT','WITHDRAWAL','TRADE','PENALTY')),
  amount numeric NOT NULL DEFAULT 0,
  coin text DEFAULT 'USDT',
  reference_id text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE owner_fees ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_fees" ON owner_fees FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "insert_own_fees" ON owner_fees FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Community feed posts (Binance Square style)
CREATE TABLE IF NOT EXISTS community_posts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  author_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL DEFAULT '',
  image_url text,
  video_url text,
  is_repost boolean DEFAULT false,
  original_post_id uuid REFERENCES community_posts(id) ON DELETE SET NULL,
  is_flagged boolean DEFAULT false,
  is_removed boolean DEFAULT false,
  ban_actioned boolean DEFAULT false,
  like_count integer DEFAULT 0,
  comment_count integer DEFAULT 0,
  repost_count integer DEFAULT 0,
  save_count integer DEFAULT 0,
  share_count integer DEFAULT 0,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE community_posts ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_posts" ON community_posts FOR SELECT TO authenticated USING (is_removed = false);
CREATE POLICY "insert_own_post" ON community_posts FOR INSERT TO authenticated WITH CHECK (auth.uid() = author_id);
CREATE POLICY "update_own_post" ON community_posts FOR UPDATE TO authenticated USING (auth.uid() = author_id);
CREATE POLICY "delete_own_post" ON community_posts FOR DELETE TO authenticated USING (auth.uid() = author_id);

-- Post interactions (likes, comments, saves, reposts)
CREATE TABLE IF NOT EXISTS post_interactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type text NOT NULL CHECK (type IN ('LIKE','COMMENT','REPOST','SAVE','SHARE')),
  comment_text text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id, type)
);
ALTER TABLE post_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_interactions" ON post_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "insert_own_interaction" ON post_interactions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "delete_own_interaction" ON post_interactions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- Content moderation log
CREATE TABLE IF NOT EXISTS content_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reporter_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  reason text NOT NULL,
  auto_flagged boolean DEFAULT false,
  action_taken text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE content_reports ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_own_reports" ON content_reports FOR SELECT TO authenticated USING (auth.uid() = reporter_id);
CREATE POLICY "insert_own_report" ON content_reports FOR INSERT TO authenticated WITH CHECK (auth.uid() = reporter_id);

-- Banned users tracking
CREATE TABLE IF NOT EXISTS banned_users (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  penalty_amount numeric DEFAULT 0,
  banned_at timestamptz DEFAULT now()
);
ALTER TABLE banned_users ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read_banned" ON banned_users FOR SELECT TO authenticated USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_community_posts_created ON community_posts(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_post_interactions_post ON post_interactions(post_id);
CREATE INDEX IF NOT EXISTS idx_owner_fees_created ON owner_fees(created_at DESC);
