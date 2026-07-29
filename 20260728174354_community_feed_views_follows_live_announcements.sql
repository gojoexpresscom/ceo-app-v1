/*
# Community Feed: Views, Follows, Live Sessions, Announcements, Warnings

## Overview
Extends the community feed to support real engagement tracking (views), user follows,
live streaming sessions, admin-only announcements, news posts with truth verification,
and a warnings system for policy violations.

## New Tables

1. `post_views` — tracks each unique view of a post by a user
   - `id` uuid PK
   - `post_id` uuid FK → community_posts(id) ON DELETE CASCADE
   - `user_id` uuid FK → auth.users(id) ON DELETE CASCADE
   - `viewed_at` timestamptz DEFAULT now()
   - UNIQUE(post_id, user_id) — one view per user per post

2. `user_follows` — follow relationships between users
   - `id` uuid PK
   - `follower_id` uuid FK → auth.users(id) ON DELETE CASCADE (the user who follows)
   - `following_id` uuid FK → auth.users(id) ON DELETE CASCADE (the user being followed)
   - `created_at` timestamptz DEFAULT now()
   - UNIQUE(follower_id, following_id) — no duplicate follows

3. `live_sessions` — live streaming sessions
   - `id` uuid PK
   - `host_id` uuid FK → auth.users(id) ON DELETE CASCADE
   - `title` text NOT NULL
   - `description` text
   - `status` text DEFAULT 'live' (live, ended)
   - `viewer_count` int DEFAULT 0
   - `created_at` timestamptz DEFAULT now()
   - `ended_at` timestamptz

4. `warnings` — user warnings for policy violations (e.g. fake news)
   - `id` uuid PK
   - `user_id` uuid FK → auth.users(id) ON DELETE CASCADE
   - `post_id` uuid FK → community_posts(id) ON DELETE CASCADE
   - `reason` text NOT NULL
   - `warning_level` int DEFAULT 1 (1=first, 2=second, 3=ban)
   - `created_at` timestamptz DEFAULT now()

## Modified Tables

- `community_posts` — add columns:
  - `post_type` text DEFAULT 'post' (post, article, video, announcement, news, live)
  - `is_announcement` boolean DEFAULT false
  - `is_news` boolean DEFAULT false
  - `view_count` int DEFAULT 0
  - `is_verified_news` boolean DEFAULT false (AI truth verification flag)
  - `is_removed` boolean DEFAULT false (already may exist, IF NOT EXISTS)

## Security

- RLS enabled on all new tables.
- Owner-scoped CRUD on post_views, user_follows, live_sessions, warnings.
- SELECT on user_follows and live_sessions is public to authenticated (so users can see follows and live sessions).
- INSERT on post_views is open to authenticated (view tracking).

## Important Notes

1. Post views are tracked per-user — view_count on the post is incremented once per user.
2. Announcements can only be posted by admin/owner (enforced in app, not DB).
3. News posts are subject to AI truth verification — if flagged as fake, the post is removed and the user gets a warning.
4. Three warnings = automatic ban (enforced in app).
5. The warnings table links to the offending post for audit trail.
*/

-- Add columns to community_posts (idempotent)
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS post_type text DEFAULT 'post';
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_announcement boolean DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_news boolean DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS view_count int DEFAULT 0;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_verified_news boolean DEFAULT false;
ALTER TABLE community_posts ADD COLUMN IF NOT EXISTS is_removed boolean DEFAULT false;

-- post_views table
CREATE TABLE IF NOT EXISTS post_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id uuid NOT NULL REFERENCES community_posts(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at timestamptz DEFAULT now(),
  UNIQUE(post_id, user_id)
);
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_post_views" ON post_views;
CREATE POLICY "select_own_post_views" ON post_views FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_post_views" ON post_views;
CREATE POLICY "insert_own_post_views" ON post_views FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_post_views" ON post_views;
CREATE POLICY "delete_own_post_views" ON post_views FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- user_follows table
CREATE TABLE IF NOT EXISTS user_follows (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  follower_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  following_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at timestamptz DEFAULT now(),
  UNIQUE(follower_id, following_id)
);
ALTER TABLE user_follows ENABLE ROW LEVEL SECURITY;

-- Anyone can see follow relationships (public social graph)
DROP POLICY IF EXISTS "select_user_follows" ON user_follows;
CREATE POLICY "select_user_follows" ON user_follows FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_follows" ON user_follows;
CREATE POLICY "insert_own_follows" ON user_follows FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = follower_id);

DROP POLICY IF EXISTS "delete_own_follows" ON user_follows;
CREATE POLICY "delete_own_follows" ON user_follows FOR DELETE
  TO authenticated USING (auth.uid() = follower_id);

-- live_sessions table
CREATE TABLE IF NOT EXISTS live_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  host_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  status text DEFAULT 'live',
  viewer_count int DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  ended_at timestamptz
);
ALTER TABLE live_sessions ENABLE ROW LEVEL SECURITY;

-- Live sessions are publicly viewable by authenticated users
DROP POLICY IF EXISTS "select_live_sessions" ON live_sessions;
CREATE POLICY "select_live_sessions" ON live_sessions FOR SELECT
  TO authenticated USING (true);

DROP POLICY IF EXISTS "insert_own_live_sessions" ON live_sessions;
CREATE POLICY "insert_own_live_sessions" ON live_sessions FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "update_own_live_sessions" ON live_sessions;
CREATE POLICY "update_own_live_sessions" ON live_sessions FOR UPDATE
  TO authenticated USING (auth.uid() = host_id) WITH CHECK (auth.uid() = host_id);

DROP POLICY IF EXISTS "delete_own_live_sessions" ON live_sessions;
CREATE POLICY "delete_own_live_sessions" ON live_sessions FOR DELETE
  TO authenticated USING (auth.uid() = host_id);

-- warnings table
CREATE TABLE IF NOT EXISTS warnings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  post_id uuid REFERENCES community_posts(id) ON DELETE CASCADE,
  reason text NOT NULL,
  warning_level int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE warnings ENABLE ROW LEVEL SECURITY;

-- Users can see their own warnings
DROP POLICY IF EXISTS "select_own_warnings" ON warnings;
CREATE POLICY "select_own_warnings" ON warnings FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_warnings" ON warnings;
CREATE POLICY "insert_own_warnings" ON warnings FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_follower_id ON user_follows(follower_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_following_id ON user_follows(following_id);
CREATE INDEX IF NOT EXISTS idx_live_sessions_status ON live_sessions(status);
CREATE INDEX IF NOT EXISTS idx_warnings_user_id ON warnings(user_id);
CREATE INDEX IF NOT EXISTS idx_community_posts_post_type ON community_posts(post_type);
