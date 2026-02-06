-- Add refreshing_since column for token refresh locking
-- Prevents race conditions when multiple processes try to refresh the same token
ALTER TABLE agency_fanvue_connections
  ADD COLUMN IF NOT EXISTS refreshing_since TIMESTAMPTZ DEFAULT NULL;
