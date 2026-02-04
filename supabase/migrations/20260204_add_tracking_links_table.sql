-- Migration: Create tracking_links table
-- Created: 2026-02-04
-- Purpose: Store tracking link data from Fanvue API

CREATE TABLE IF NOT EXISTS tracking_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  fanvue_uuid UUID NOT NULL,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  link_url TEXT NOT NULL,
  external_social_platform TEXT,
  clicks INTEGER DEFAULT 0,
  follows_count INTEGER DEFAULT 0,
  subs_count INTEGER DEFAULT 0,
  subs_revenue NUMERIC(10,2) DEFAULT 0,
  user_spend NUMERIC(10,2) DEFAULT 0,
  total_revenue NUMERIC(10,2) DEFAULT 0,
  link_created_at TIMESTAMP WITH TIME ZONE,
  last_synced_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  
  -- Unique constraint for upserts
  UNIQUE(fanvue_uuid, model_id)
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_tracking_links_model_id ON tracking_links(model_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_agency_id ON tracking_links(agency_id);
CREATE INDEX IF NOT EXISTS idx_tracking_links_fanvue_uuid ON tracking_links(fanvue_uuid);

-- Enable RLS
ALTER TABLE tracking_links ENABLE ROW LEVEL SECURITY;

-- RLS policies
CREATE POLICY "Users can view their agency tracking links"
  ON tracking_links FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );
