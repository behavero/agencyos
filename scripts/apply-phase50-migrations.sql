-- Phase 50 & 50B Migration Script
-- Run this in Supabase SQL Editor to apply all Phase 50 changes

-- ==================================================
-- MIGRATION 1: Vault Performance (Phase 50)
-- ==================================================

-- Create vault_performance table
CREATE TABLE IF NOT EXISTS vault_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Performance metrics
  times_sent INT DEFAULT 0,
  times_unlocked INT DEFAULT 0,
  total_revenue NUMERIC DEFAULT 0,
  conversion_rate FLOAT GENERATED ALWAYS AS (
    CASE WHEN times_sent > 0 THEN (times_unlocked::FLOAT / times_sent::FLOAT) * 100 ELSE 0 END
  ) STORED,
  
  -- Revenue breakdown
  revenue_from_ppv NUMERIC DEFAULT 0,
  revenue_from_tips NUMERIC DEFAULT 0,
  
  -- Performance tracking
  first_sent_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  last_sold_at TIMESTAMPTZ,
  
  -- Engagement metrics
  avg_tip_amount NUMERIC DEFAULT 0,
  unique_buyers INT DEFAULT 0,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  UNIQUE(asset_id)
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_vault_performance_asset ON vault_performance(asset_id);
CREATE INDEX IF NOT EXISTS idx_vault_performance_agency ON vault_performance(agency_id);
CREATE INDEX IF NOT EXISTS idx_vault_performance_revenue ON vault_performance(total_revenue DESC);
CREATE INDEX IF NOT EXISTS idx_vault_performance_conversion ON vault_performance(conversion_rate DESC);
CREATE INDEX IF NOT EXISTS idx_vault_performance_last_sold ON vault_performance(last_sold_at DESC NULLS LAST);

-- Enable RLS
ALTER TABLE vault_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
DROP POLICY IF EXISTS "Users can view performance for their agency" ON vault_performance;
CREATE POLICY "Users can view performance for their agency"
  ON vault_performance FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

DROP POLICY IF EXISTS "System can insert/update performance" ON vault_performance;
CREATE POLICY "System can insert/update performance"
  ON vault_performance FOR ALL
  USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create function to update asset performance
CREATE OR REPLACE FUNCTION update_asset_performance(
  p_asset_id UUID,
  p_revenue_delta NUMERIC DEFAULT 0,
  p_unlock_delta INT DEFAULT 0,
  p_send_delta INT DEFAULT 0,
  p_tip_delta NUMERIC DEFAULT 0
)
RETURNS void AS $$
DECLARE
  v_agency_id UUID;
BEGIN
  SELECT agency_id INTO v_agency_id
  FROM content_assets
  WHERE id = p_asset_id;
  
  INSERT INTO vault_performance (
    asset_id,
    agency_id,
    times_sent,
    times_unlocked,
    total_revenue,
    revenue_from_ppv,
    revenue_from_tips,
    first_sent_at,
    last_sent_at,
    last_sold_at
  ) VALUES (
    p_asset_id,
    v_agency_id,
    GREATEST(p_send_delta, 0),
    GREATEST(p_unlock_delta, 0),
    GREATEST(p_revenue_delta, 0),
    GREATEST(p_revenue_delta - p_tip_delta, 0),
    GREATEST(p_tip_delta, 0),
    CASE WHEN p_send_delta > 0 THEN NOW() ELSE NULL END,
    CASE WHEN p_send_delta > 0 THEN NOW() ELSE NULL END,
    CASE WHEN p_unlock_delta > 0 THEN NOW() ELSE NULL END
  )
  ON CONFLICT (asset_id) DO UPDATE SET
    times_sent = vault_performance.times_sent + p_send_delta,
    times_unlocked = vault_performance.times_unlocked + p_unlock_delta,
    total_revenue = vault_performance.total_revenue + p_revenue_delta,
    revenue_from_ppv = vault_performance.revenue_from_ppv + GREATEST(p_revenue_delta - p_tip_delta, 0),
    revenue_from_tips = vault_performance.revenue_from_tips + p_tip_delta,
    last_sent_at = CASE WHEN p_send_delta > 0 THEN NOW() ELSE vault_performance.last_sent_at END,
    last_sold_at = CASE WHEN p_unlock_delta > 0 THEN NOW() ELSE vault_performance.last_sold_at END,
    updated_at = NOW();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION update_asset_performance TO authenticated;

-- Create view for top performing assets
CREATE OR REPLACE VIEW top_performing_assets AS
SELECT 
  ca.id,
  ca.file_name,
  ca.file_url,
  ca.thumbnail_url,
  ca.content_type,
  ca.media_type,
  vp.times_sent,
  vp.times_unlocked,
  vp.total_revenue,
  vp.conversion_rate,
  vp.last_sold_at,
  vp.agency_id,
  CASE 
    WHEN vp.conversion_rate >= 50 THEN '🔥 Hot'
    WHEN vp.conversion_rate >= 20 THEN '✅ High'
    WHEN vp.conversion_rate >= 10 THEN '⚡ Medium'
    WHEN vp.conversion_rate >= 5 THEN '⚠️ Low'
    ELSE '❌ Cold'
  END as performance_rating
FROM content_assets ca
LEFT JOIN vault_performance vp ON ca.id = vp.asset_id
WHERE vp.times_sent > 0
ORDER BY vp.total_revenue DESC NULLS LAST;

GRANT SELECT ON top_performing_assets TO authenticated;

-- Create function to get best sellers
CREATE OR REPLACE FUNCTION get_best_sellers(
  p_agency_id UUID,
  p_days INT DEFAULT 7,
  p_limit INT DEFAULT 10
)
RETURNS TABLE (
  asset_id UUID,
  file_name TEXT,
  file_url TEXT,
  thumbnail_url TEXT,
  content_type TEXT,
  media_type TEXT,
  total_revenue NUMERIC,
  times_unlocked INT,
  conversion_rate FLOAT,
  performance_rating TEXT
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    tpa.id,
    tpa.file_name,
    tpa.file_url,
    tpa.thumbnail_url,
    tpa.content_type,
    tpa.media_type,
    tpa.total_revenue,
    tpa.times_unlocked,
    tpa.conversion_rate,
    tpa.performance_rating
  FROM top_performing_assets tpa
  WHERE 
    tpa.agency_id = p_agency_id
    AND (tpa.last_sold_at IS NULL OR tpa.last_sold_at >= NOW() - (p_days || ' days')::INTERVAL)
  ORDER BY tpa.total_revenue DESC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION get_best_sellers TO authenticated;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vault_performance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_update_vault_performance_timestamp ON vault_performance;
CREATE TRIGGER trigger_update_vault_performance_timestamp
  BEFORE UPDATE ON vault_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_vault_performance_timestamp();

-- ==================================================
-- MIGRATION 2: Fanvue Vault Fields (Phase 50B)
-- ==================================================

-- Add Fanvue Vault tracking fields to content_assets
ALTER TABLE content_assets
ADD COLUMN IF NOT EXISTS fanvue_media_uuid TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS fanvue_folder TEXT;

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_content_assets_fanvue_uuid ON content_assets(fanvue_media_uuid);
CREATE INDEX IF NOT EXISTS idx_content_assets_fanvue_folder ON content_assets(fanvue_folder);

-- ==================================================
-- VERIFICATION QUERIES
-- ==================================================

-- Check if vault_performance table exists
SELECT 
  'vault_performance table' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.tables 
    WHERE table_schema = 'public' 
    AND table_name = 'vault_performance'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if fanvue_vault_fields were added
SELECT 
  'fanvue_media_uuid column' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'content_assets' 
    AND column_name = 'fanvue_media_uuid'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status
UNION ALL
SELECT 
  'fanvue_folder column' as check_name,
  CASE WHEN EXISTS (
    SELECT FROM information_schema.columns 
    WHERE table_name = 'content_assets' 
    AND column_name = 'fanvue_folder'
  ) THEN '✅ EXISTS' ELSE '❌ MISSING' END as status;

-- Check if functions exist
SELECT 
  routine_name,
  '✅ EXISTS' as status
FROM information_schema.routines 
WHERE routine_schema = 'public' 
  AND routine_name IN ('update_asset_performance', 'get_best_sellers');

-- Final summary
SELECT 
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'vault_performance') as vault_performance_table,
  (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'content_assets' AND column_name = 'fanvue_media_uuid') as fanvue_uuid_field,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'update_asset_performance') as update_function,
  (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'get_best_sellers') as best_sellers_function,
  CASE 
    WHEN (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = 'vault_performance') = 1
      AND (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = 'content_assets' AND column_name = 'fanvue_media_uuid') = 1
      AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'update_asset_performance') = 1
      AND (SELECT COUNT(*) FROM information_schema.routines WHERE routine_name = 'get_best_sellers') = 1
    THEN '✅ ALL MIGRATIONS APPLIED SUCCESSFULLY'
    ELSE '❌ SOME MIGRATIONS FAILED - CHECK ERRORS ABOVE'
  END as overall_status;
