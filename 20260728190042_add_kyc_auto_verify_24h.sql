-- Add kyc_submitted_at to track 24h auto-verify
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS kyc_submitted_at timestamptz;

-- Create a function to auto-verify KYC after 24 hours
CREATE OR REPLACE FUNCTION auto_verify_kyc()
RETURNS void AS $$
BEGIN
  UPDATE profiles
  SET kyc_status = 'VERIFIED',
      kyc_submitted_at = NULL
  WHERE kyc_status = 'PENDING_VERIFICATION'
    AND kyc_submitted_at IS NOT NULL
    AND kyc_submitted_at < NOW() - INTERVAL '24 hours';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute
GRANT EXECUTE ON FUNCTION auto_verify_kyc TO authenticated;

-- Schedule it with pg_cron if available (otherwise it runs on app load)
-- The app will also check and auto-verify on each load
