-- Phase 50 - The Content Brain (Asset ROI Tracking)
-- Track performance metrics for content assets

-- Create vault_performance table
CREATE TABLE vault_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  asset_id UUID NOT NULL REFERENCES content_assets(id) ON DELETE CASCADE,
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  
  -- Performance metrics
  times_sent INT DEFAULT 0, -- How many times sent in messages
  times_unlocked INT DEFAULT 0, -- How many times purchased
  total_revenue NUMERIC DEFAULT 0, -- Total revenue generated
  conversion_rate FLOAT GENERATED ALWAYS AS (
    CASE WHEN times_sent > 0 THEN (times_unlocked::FLOAT / times_sent::FLOAT) * 100 ELSE 0 END
  ) STORED, -- Auto-calculated conversion rate
  
  -- Revenue breakdown
  revenue_from_ppv NUMERIC DEFAULT 0, -- Pay-per-view unlocks
  revenue_from_tips NUMERIC DEFAULT 0, -- Tips on this content
  
  -- Performance tracking
  first_sent_at TIMESTAMPTZ,
  last_sent_at TIMESTAMPTZ,
  last_sold_at TIMESTAMPTZ,
  
  -- Engagement metrics
  avg_tip_amount NUMERIC DEFAULT 0,
  unique_buyers INT DEFAULT 0, -- Number of unique fans who unlocked
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure one performance record per asset
  UNIQUE(asset_id)
);

-- Create indexes for performance queries
CREATE INDEX idx_vault_performance_asset ON vault_performance(asset_id);
CREATE INDEX idx_vault_performance_agency ON vault_performance(agency_id);
CREATE INDEX idx_vault_performance_revenue ON vault_performance(total_revenue DESC);
CREATE INDEX idx_vault_performance_conversion ON vault_performance(conversion_rate DESC);
CREATE INDEX idx_vault_performance_last_sold ON vault_performance(last_sold_at DESC NULLS LAST);

-- Enable RLS
ALTER TABLE vault_performance ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view performance for their agency"
  ON vault_performance FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

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
  -- Get agency_id from asset
  SELECT agency_id INTO v_agency_id
  FROM content_assets
  WHERE id = p_asset_id;
  
  -- Upsert performance record
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

-- Grant execute permission
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

-- Grant access to view
GRANT SELECT ON top_performing_assets TO authenticated;

-- Create function to get best sellers for time period
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_best_sellers TO authenticated;

-- Add trigger to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_vault_performance_timestamp()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_vault_performance_timestamp
  BEFORE UPDATE ON vault_performance
  FOR EACH ROW
  EXECUTE FUNCTION update_vault_performance_timestamp();

COMMENT ON TABLE vault_performance IS 'Tracks performance metrics for content assets including revenue, conversion rates, and engagement';
COMMENT ON FUNCTION update_asset_performance IS 'Updates or creates performance record for a content asset';
COMMENT ON FUNCTION get_best_sellers IS 'Returns top performing assets for a given time period';
