-- Migration: Add Top Spenders and Subscriber History Tables
-- Phase A: Complete the Core Loop
-- Created: 2026-02-03

-- =====================================================
-- TABLE: creator_top_spenders
-- Purpose: Track VIP fans and their spending per creator
-- =====================================================
CREATE TABLE IF NOT EXISTS creator_top_spenders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  fan_uuid UUID NOT NULL,
  fan_handle TEXT NOT NULL,
  fan_display_name TEXT NOT NULL,
  fan_nickname TEXT,
  fan_avatar_url TEXT,
  gross_cents INTEGER NOT NULL DEFAULT 0,
  net_cents INTEGER NOT NULL DEFAULT 0,
  message_count INTEGER NOT NULL DEFAULT 0,
  is_top_spender BOOLEAN DEFAULT false,
  registered_at TIMESTAMPTZ,
  last_synced_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, fan_uuid)
);

-- Index for fast lookups
CREATE INDEX idx_top_spenders_model_id ON creator_top_spenders(model_id);
CREATE INDEX idx_top_spenders_net_cents ON creator_top_spenders(net_cents DESC);
CREATE INDEX idx_top_spenders_fan_uuid ON creator_top_spenders(fan_uuid);

-- =====================================================
-- TABLE: subscriber_history
-- Purpose: Daily subscriber metrics for trend analysis
-- =====================================================
CREATE TABLE IF NOT EXISTS subscriber_history (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  date DATE NOT NULL,
  subscribers_total INTEGER NOT NULL DEFAULT 0,
  new_subscribers INTEGER NOT NULL DEFAULT 0,
  cancelled_subscribers INTEGER NOT NULL DEFAULT 0,
  net_change INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(model_id, date)
);

-- Index for time-series queries
CREATE INDEX idx_subscriber_history_model_id ON subscriber_history(model_id);
CREATE INDEX idx_subscriber_history_date ON subscriber_history(date DESC);
CREATE INDEX idx_subscriber_history_model_date ON subscriber_history(model_id, date DESC);

-- =====================================================
-- VIEW: agency_top_spenders
-- Purpose: Aggregate top spenders across all creators in an agency
-- =====================================================
CREATE OR REPLACE VIEW agency_top_spenders AS
SELECT 
  m.agency_id,
  cts.fan_uuid,
  cts.fan_handle,
  cts.fan_display_name,
  cts.fan_nickname,
  cts.fan_avatar_url,
  SUM(cts.net_cents) as total_spent_cents,
  SUM(cts.message_count) as total_messages,
  COUNT(DISTINCT cts.model_id) as creator_count,
  ARRAY_AGG(DISTINCT m.name) as creator_names,
  MAX(cts.last_synced_at) as last_synced_at
FROM creator_top_spenders cts
JOIN models m ON cts.model_id = m.id
GROUP BY m.agency_id, cts.fan_uuid, cts.fan_handle, cts.fan_display_name, cts.fan_nickname, cts.fan_avatar_url
ORDER BY total_spent_cents DESC;

-- =====================================================
-- VIEW: agency_subscriber_trends
-- Purpose: Agency-wide subscriber trends over time
-- =====================================================
CREATE OR REPLACE VIEW agency_subscriber_trends AS
SELECT 
  m.agency_id,
  sh.date,
  SUM(sh.subscribers_total) as total_subscribers,
  SUM(sh.new_subscribers) as new_subscribers,
  SUM(sh.cancelled_subscribers) as cancelled_subscribers,
  SUM(sh.net_change) as net_change
FROM subscriber_history sh
JOIN models m ON sh.model_id = m.id
GROUP BY m.agency_id, sh.date
ORDER BY m.agency_id, sh.date DESC;

-- =====================================================
-- RPC: get_agency_vip_fans
-- Purpose: Get top spenders across entire agency
-- =====================================================
CREATE OR REPLACE FUNCTION get_agency_vip_fans(
  p_agency_id UUID,
  p_limit INTEGER DEFAULT 50
)
RETURNS TABLE (
  fan_uuid UUID,
  fan_handle TEXT,
  fan_display_name TEXT,
  fan_nickname TEXT,
  fan_avatar_url TEXT,
  total_spent_cents INTEGER,
  total_messages INTEGER,
  creator_count INTEGER,
  creator_names TEXT[]
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ats.fan_uuid,
    ats.fan_handle,
    ats.fan_display_name,
    ats.fan_nickname,
    ats.fan_avatar_url,
    ats.total_spent_cents::INTEGER,
    ats.total_messages::INTEGER,
    ats.creator_count::INTEGER,
    ats.creator_names
  FROM agency_top_spenders ats
  WHERE ats.agency_id = p_agency_id
  ORDER BY ats.total_spent_cents DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: get_creator_subscriber_trend
-- Purpose: Get subscriber history for a specific creator
-- =====================================================
CREATE OR REPLACE FUNCTION get_creator_subscriber_trend(
  p_model_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  subscribers_total INTEGER,
  new_subscribers INTEGER,
  cancelled_subscribers INTEGER,
  net_change INTEGER
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    sh.date,
    sh.subscribers_total,
    sh.new_subscribers,
    sh.cancelled_subscribers,
    sh.net_change
  FROM subscriber_history sh
  WHERE sh.model_id = p_model_id
    AND sh.date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY sh.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- RPC: get_agency_subscriber_trend
-- Purpose: Get aggregated subscriber history for entire agency
-- =====================================================
CREATE OR REPLACE FUNCTION get_agency_subscriber_trend(
  p_agency_id UUID,
  p_days INTEGER DEFAULT 30
)
RETURNS TABLE (
  date DATE,
  total_subscribers BIGINT,
  new_subscribers BIGINT,
  cancelled_subscribers BIGINT,
  net_change BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    ast.date,
    ast.total_subscribers,
    ast.new_subscribers,
    ast.cancelled_subscribers,
    ast.net_change
  FROM agency_subscriber_trends ast
  WHERE ast.agency_id = p_agency_id
    AND ast.date >= CURRENT_DATE - (p_days || ' days')::INTERVAL
  ORDER BY ast.date DESC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- =====================================================
-- Enable RLS (Row Level Security)
-- =====================================================
ALTER TABLE creator_top_spenders ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriber_history ENABLE ROW LEVEL SECURITY;

-- Policy: Users can only access their own agency's data
CREATE POLICY "Users can view their agency's top spenders"
  ON creator_top_spenders FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE agency_id IN (
        SELECT agency_id FROM users WHERE id = auth.uid()
      )
    )
  );

CREATE POLICY "Users can view their agency's subscriber history"
  ON subscriber_history FOR SELECT
  USING (
    model_id IN (
      SELECT id FROM models WHERE agency_id IN (
        SELECT agency_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Grant access to service role for sync operations
GRANT ALL ON creator_top_spenders TO service_role;
GRANT ALL ON subscriber_history TO service_role;

-- Add helpful comments
COMMENT ON TABLE creator_top_spenders IS 'Tracks VIP fans and their spending per creator for agency analytics';
COMMENT ON TABLE subscriber_history IS 'Daily subscriber metrics for trend analysis and retention tracking';
COMMENT ON VIEW agency_top_spenders IS 'Aggregates top spenders across all creators in an agency';
COMMENT ON VIEW agency_subscriber_trends IS 'Agency-wide subscriber trends over time';
