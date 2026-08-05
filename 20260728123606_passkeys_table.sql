-- Passkeys table for WebAuthn credential storage
CREATE TABLE IF NOT EXISTS passkeys (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  credential_id text NOT NULL,
  name text NOT NULL DEFAULT 'Device',
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, credential_id)
);
ALTER TABLE passkeys ENABLE ROW LEVEL SECURITY;
CREATE POLICY "crud_own_passkeys" ON passkeys FOR ALL TO authenticated
  USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
