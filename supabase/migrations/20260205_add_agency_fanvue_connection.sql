-- Migration: Add agency_fanvue_connections table
-- This separates agency-level Fanvue connections from model connections
-- Agency admins connect their own Fanvue account (not a model's)

-- Create the enum for connection status
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'agency_fanvue_status') THEN
    CREATE TYPE agency_fanvue_status AS ENUM ('active', 'expired', 'revoked');
  END IF;
END $$;

-- Create the agency_fanvue_connections table
CREATE TABLE IF NOT EXISTS agency_fanvue_connections (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  admin_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  
  -- Fanvue OAuth tokens (encrypted at application level)
  fanvue_access_token TEXT NOT NULL,
  fanvue_refresh_token TEXT NOT NULL,
  fanvue_token_expires_at TIMESTAMPTZ NOT NULL,
  fanvue_user_id TEXT NOT NULL,
  
  -- Connection metadata
  connected_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  status agency_fanvue_status DEFAULT 'active',
  
  -- Track last sync operation
  last_synced_at TIMESTAMPTZ,
  last_sync_error TEXT,
  
  -- Constraints
  CONSTRAINT unique_agency_connection UNIQUE (agency_id)
);

-- Create index for faster lookups
CREATE INDEX idx_agency_fanvue_connections_agency_id ON agency_fanvue_connections(agency_id);
CREATE INDEX idx_agency_fanvue_connections_admin_user_id ON agency_fanvue_connections(admin_user_id);
CREATE INDEX idx_agency_fanvue_connections_status ON agency_fanvue_connections(status);

-- Create trigger to update updated_at
CREATE OR REPLACE FUNCTION update_agency_fanvue_connection_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_agency_fanvue_connection_updated_at ON agency_fanvue_connections;
CREATE TRIGGER trigger_agency_fanvue_connection_updated_at
  BEFORE UPDATE ON agency_fanvue_connections
  FOR EACH ROW
  EXECUTE FUNCTION update_agency_fanvue_connection_updated_at();

-- Add RLS policies
ALTER TABLE agency_fanvue_connections ENABLE ROW LEVEL SECURITY;

-- Agency admins can view their agency's connection
CREATE POLICY agency_admins_view_connection ON agency_fanvue_connections
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = agency_fanvue_connections.agency_id
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Only the connection owner or system can update
CREATE POLICY connection_owner_update ON agency_fanvue_connections
  FOR UPDATE
  USING (
    admin_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = agency_fanvue_connections.agency_id
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Only system can insert (via service role)
CREATE POLICY system_insert ON agency_fanvue_connections
  FOR INSERT
  WITH CHECK (true); -- Service role bypasses RLS

-- Only system/owner can delete
CREATE POLICY owner_delete ON agency_fanvue_connections
  FOR DELETE
  USING (
    admin_user_id = auth.uid() OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = agency_fanvue_connections.agency_id
      AND profiles.role IN ('admin', 'owner')
    )
  );

-- Add helpful comment
COMMENT ON TABLE agency_fanvue_connections IS 
  'Stores Fanvue OAuth tokens for agency-level operations. This is separate from model connections.';
