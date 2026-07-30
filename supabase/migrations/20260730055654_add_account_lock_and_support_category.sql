-- Add account lock columns for reported users under investigation
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_locked boolean DEFAULT false;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS lock_reason text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS locked_at timestamptz;

-- Add category column to support_tickets if it doesn't exist
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'support_tickets' AND column_name = 'category') THEN
    ALTER TABLE support_tickets ADD COLUMN category text DEFAULT 'support';
  END IF;
END $$;
