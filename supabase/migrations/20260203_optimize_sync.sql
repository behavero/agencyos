-- Phase 55 - Real-Time Sync Optimization
-- Add refresh token support + cursor-based sync tracking

-- Step 1: Add refresh token and sync state columns to models table
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS fanvue_refresh_token TEXT,
ADD COLUMN IF NOT EXISTS fanvue_token_expires_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS last_transaction_sync TIMESTAMPTZ DEFAULT '2024-01-01 00:00:00+00',
ADD COLUMN IF NOT EXISTS last_messages_sync TIMESTAMPTZ DEFAULT '2024-01-01 00:00:00+00',
ADD COLUMN IF NOT EXISTS last_subscribers_sync TIMESTAMPTZ DEFAULT '2024-01-01 00:00:00+00';

-- Step 2: Create indexes for fast lookups
CREATE INDEX IF NOT EXISTS idx_models_last_transaction_sync ON models(last_transaction_sync);
CREATE INDEX IF NOT EXISTS idx_models_token_expires ON models(fanvue_token_expires_at) WHERE fanvue_token_expires_at IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_models_stale_sync ON models(agency_id, last_transaction_sync) WHERE status = 'active';

-- Step 3: Add comments for clarity
COMMENT ON COLUMN models.fanvue_refresh_token IS 'OAuth refresh token for automatic token renewal';
COMMENT ON COLUMN models.fanvue_token_expires_at IS 'When the current access token expires (UTC)';
COMMENT ON COLUMN models.last_transaction_sync IS 'Last time earnings/transactions were synced from Fanvue';
COMMENT ON COLUMN models.last_messages_sync IS 'Last time messages were synced from Fanvue';
COMMENT ON COLUMN models.last_subscribers_sync IS 'Last time subscribers were synced from Fanvue';

-- Step 4: Create a view for models needing sync
CREATE OR REPLACE VIEW models_needing_sync AS
SELECT 
  m.id,
  m.name,
  m.agency_id,
  m.fanvue_user_uuid,
  m.last_transaction_sync,
  EXTRACT(EPOCH FROM (NOW() - m.last_transaction_sync)) / 60 AS minutes_since_last_sync,
  CASE 
    WHEN m.fanvue_token_expires_at IS NULL THEN 'unknown'
    WHEN m.fanvue_token_expires_at < NOW() THEN 'expired'
    WHEN m.fanvue_token_expires_at < NOW() + INTERVAL '24 hours' THEN 'expiring_soon'
    ELSE 'valid'
  END AS token_status
FROM models m
WHERE 
  m.status = 'active'
  AND m.fanvue_access_token IS NOT NULL
  AND (
    -- Transactions not synced in last hour
    m.last_transaction_sync < NOW() - INTERVAL '1 hour'
    -- OR token needs refresh
    OR m.fanvue_token_expires_at < NOW() + INTERVAL '24 hours'
  )
ORDER BY m.last_transaction_sync ASC;

-- Grant access
GRANT SELECT ON models_needing_sync TO authenticated;

-- Step 5: Create function to mark sync complete
CREATE OR REPLACE FUNCTION mark_sync_complete(
  p_model_id UUID,
  p_sync_type TEXT DEFAULT 'transactions'
)
RETURNS VOID AS $$
BEGIN
  IF p_sync_type = 'transactions' THEN
    UPDATE models 
    SET 
      last_transaction_sync = NOW(),
      stats_updated_at = NOW()
    WHERE id = p_model_id;
  ELSIF p_sync_type = 'messages' THEN
    UPDATE models 
    SET last_messages_sync = NOW()
    WHERE id = p_model_id;
  ELSIF p_sync_type = 'subscribers' THEN
    UPDATE models 
    SET last_subscribers_sync = NOW()
    WHERE id = p_model_id;
  END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION mark_sync_complete TO authenticated;

-- Step 6: Create function to update token
CREATE OR REPLACE FUNCTION update_fanvue_token(
  p_model_id UUID,
  p_access_token TEXT,
  p_refresh_token TEXT DEFAULT NULL,
  p_expires_in INTEGER DEFAULT 3600
)
RETURNS VOID AS $$
BEGIN
  UPDATE models 
  SET 
    fanvue_access_token = p_access_token,
    fanvue_refresh_token = COALESCE(p_refresh_token, fanvue_refresh_token),
    fanvue_token_expires_at = NOW() + (p_expires_in || ' seconds')::INTERVAL,
    updated_at = NOW()
  WHERE id = p_model_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_fanvue_token TO authenticated;

COMMENT ON VIEW models_needing_sync IS 'Models that need data sync based on last sync time and token status';
COMMENT ON FUNCTION mark_sync_complete IS 'Mark a sync operation as complete for a model';
COMMENT ON FUNCTION update_fanvue_token IS 'Update Fanvue OAuth tokens for a model';
