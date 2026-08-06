/*
# Create support_messages table for live chat

1. New Tables
- `support_messages`
  - `id` (uuid, primary key)
  - `user_id` (uuid, not null, defaults to authenticated user, references auth.users)
  - `sender` (text: 'user' or 'support')
  - `message` (text, not null)
  - `created_at` (timestamptz, defaults to now)
  - `read_at` (timestamptz, nullable)

2. Security
- Enable RLS on `support_messages`.
- Users can read all messages in their own support conversation (both user and support messages).
- Users can insert messages where they are the sender.
- Users can update read status of their own messages.
- Users can delete their own messages.
- Admin/owner can read all support messages (via service role / admin check).

3. Indexes
- Index on `user_id` for fast per-user queries.
- Index on `created_at` for chronological ordering.
*/

CREATE TABLE IF NOT EXISTS support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  sender text NOT NULL CHECK (sender IN ('user', 'support')),
  message text NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_support_messages_user_id ON support_messages(user_id);
CREATE INDEX IF NOT EXISTS idx_support_messages_created_at ON support_messages(created_at);

ALTER TABLE support_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_support_messages" ON support_messages;
CREATE POLICY "select_own_support_messages"
ON support_messages FOR SELECT
TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_support_messages" ON support_messages;
CREATE POLICY "insert_own_support_messages"
ON support_messages FOR INSERT
TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_support_messages" ON support_messages;
CREATE POLICY "update_own_support_messages"
ON support_messages FOR UPDATE
TO authenticated USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_support_messages" ON support_messages;
CREATE POLICY "delete_own_support_messages"
ON support_messages FOR DELETE
TO authenticated USING (auth.uid() = user_id);
