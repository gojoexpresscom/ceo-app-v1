/*
# Fix new user balance to $0.00 + add messaging + P2P escrow upgrade
*/

-- 1. Fix new user balance default to $0.00
ALTER TABLE profiles ALTER COLUMN usdt_balance SET DEFAULT 0.00;

-- 2. Add kyc_full_name to profiles for P2P name matching
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_full_name text;

-- 3. Conversations table for inbox
CREATE TABLE IF NOT EXISTS conversations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  participant1 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  participant2 uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  last_message text,
  last_message_at timestamptz DEFAULT now(),
  created_at timestamptz DEFAULT now(),
  UNIQUE(participant1, participant2)
);
ALTER TABLE conversations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_conversations" ON conversations;
CREATE POLICY "select_own_conversations" ON conversations FOR SELECT
  TO authenticated USING (auth.uid() = participant1 OR auth.uid() = participant2);

DROP POLICY IF EXISTS "insert_own_conversations" ON conversations;
CREATE POLICY "insert_own_conversations" ON conversations FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = participant1 OR auth.uid() = participant2);

DROP POLICY IF EXISTS "update_own_conversations" ON conversations;
CREATE POLICY "update_own_conversations" ON conversations FOR UPDATE
  TO authenticated USING (auth.uid() = participant1 OR auth.uid() = participant2);

-- 4. Messages table
CREATE TABLE IF NOT EXISTS messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  content text NOT NULL,
  read_at timestamptz,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_messages" ON messages;
CREATE POLICY "select_own_messages" ON messages FOR SELECT
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant1 = auth.uid() OR c.participant2 = auth.uid()))
  );

DROP POLICY IF EXISTS "insert_own_messages" ON messages;
CREATE POLICY "insert_own_messages" ON messages FOR INSERT
  TO authenticated WITH CHECK (
    auth.uid() = sender_id AND
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant1 = auth.uid() OR c.participant2 = auth.uid()))
  );

DROP POLICY IF EXISTS "update_own_messages" ON messages;
CREATE POLICY "update_own_messages" ON messages FOR UPDATE
  TO authenticated USING (
    EXISTS (SELECT 1 FROM conversations c WHERE c.id = messages.conversation_id AND (c.participant1 = auth.uid() OR c.participant2 = auth.uid()))
  );

CREATE INDEX IF NOT EXISTS idx_messages_conversation ON messages(conversation_id, created_at);

-- 5. P2P Escrow table
CREATE TABLE IF NOT EXISTS p2p_escrow (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL,
  seller_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  buyer_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  crypto_asset text NOT NULL DEFAULT 'USDT',
  crypto_amount numeric NOT NULL,
  fiat_currency text NOT NULL,
  fiat_amount numeric NOT NULL,
  status text NOT NULL DEFAULT 'LOCKED',
  escrow_expires_at timestamptz NOT NULL,
  ai_risk_score numeric DEFAULT 0,
  ai_flags text[] DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  released_at timestamptz,
  CHECK (status IN ('LOCKED', 'RELEASED', 'CANCELLED', 'DISPUTED'))
);
ALTER TABLE p2p_escrow ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_escrow" ON p2p_escrow;
CREATE POLICY "select_own_escrow" ON p2p_escrow FOR SELECT
  TO authenticated USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

DROP POLICY IF EXISTS "insert_own_escrow" ON p2p_escrow;
CREATE POLICY "insert_own_escrow" ON p2p_escrow FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = seller_id OR auth.uid() = buyer_id);

DROP POLICY IF EXISTS "update_own_escrow" ON p2p_escrow;
CREATE POLICY "update_own_escrow" ON p2p_escrow FOR UPDATE
  TO authenticated USING (auth.uid() = seller_id OR auth.uid() = buyer_id);

-- 6. P2P Chat table
CREATE TABLE IF NOT EXISTS p2p_chat (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL,
  sender_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  message text NOT NULL,
  ai_flagged boolean DEFAULT false,
  ai_flag_reason text,
  attachment_url text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE p2p_chat ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_p2p_chat" ON p2p_chat;
CREATE POLICY "select_own_p2p_chat" ON p2p_chat FOR SELECT
  TO authenticated USING (auth.uid() = sender_id OR EXISTS (SELECT 1 FROM p2p_trades t WHERE t.id = p2p_chat.trade_id AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())));

DROP POLICY IF EXISTS "insert_own_p2p_chat" ON p2p_chat;
CREATE POLICY "insert_own_p2p_chat" ON p2p_chat FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = sender_id);

-- 7. P2P Disputes table
CREATE TABLE IF NOT EXISTS p2p_disputes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  trade_id uuid NOT NULL,
  raised_by uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  reason text NOT NULL,
  status text DEFAULT 'OPEN',
  ai_analysis text,
  resolution text,
  created_at timestamptz DEFAULT now(),
  resolved_at timestamptz,
  CHECK (status IN ('OPEN', 'UNDER_REVIEW', 'RESOLVED'))
);
ALTER TABLE p2p_disputes ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_disputes" ON p2p_disputes;
CREATE POLICY "select_own_disputes" ON p2p_disputes FOR SELECT
  TO authenticated USING (auth.uid() = raised_by OR EXISTS (SELECT 1 FROM p2p_trades t WHERE t.id = p2p_disputes.trade_id AND (t.seller_id = auth.uid() OR t.buyer_id = auth.uid())));

DROP POLICY IF EXISTS "insert_own_disputes" ON p2p_disputes;
CREATE POLICY "insert_own_disputes" ON p2p_disputes FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = raised_by);

-- 8. P2P Payment Methods table
CREATE TABLE IF NOT EXISTS p2p_payment_methods (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL DEFAULT auth.uid() REFERENCES auth.users(id) ON DELETE CASCADE,
  payment_type text NOT NULL,
  account_name text NOT NULL,
  account_number text,
  bank_name text,
  phone_number text,
  country_code text,
  is_verified boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE p2p_payment_methods ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_own_payment_methods" ON p2p_payment_methods;
CREATE POLICY "select_own_payment_methods" ON p2p_payment_methods FOR SELECT
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "insert_own_payment_methods" ON p2p_payment_methods;
CREATE POLICY "insert_own_payment_methods" ON p2p_payment_methods FOR INSERT
  TO authenticated WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "update_own_payment_methods" ON p2p_payment_methods;
CREATE POLICY "update_own_payment_methods" ON p2p_payment_methods FOR UPDATE
  TO authenticated USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "delete_own_payment_methods" ON p2p_payment_methods;
CREATE POLICY "delete_own_payment_methods" ON p2p_payment_methods FOR DELETE
  TO authenticated USING (auth.uid() = user_id);

-- 9. Add escrow columns to p2p_trades
ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS escrow_id uuid;
ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS payment_proof_url text;
ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS ai_risk_score numeric DEFAULT 0;
ALTER TABLE p2p_trades ADD COLUMN IF NOT EXISTS ai_flags text[] DEFAULT '{}';

-- 10. Add multi-crypto columns to p2p_orders
ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS crypto_asset text DEFAULT 'USDT';
ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS available_amount numeric DEFAULT 0;
ALTER TABLE p2p_orders ADD COLUMN IF NOT EXISTS total_amount numeric DEFAULT 0;
