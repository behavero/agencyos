-- Phase 49 - Analytics Engine Repair
-- Create granular Fanvue transactions table for accurate revenue tracking

-- Drop existing table if it exists (for development)
DROP TABLE IF EXISTS fanvue_transactions CASCADE;

-- Create fanvue_transactions table
CREATE TABLE fanvue_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  
  -- Fanvue API data
  fanvue_id TEXT NOT NULL, -- Unique transaction ID from Fanvue API
  fanvue_user_id TEXT, -- The fan who made the transaction
  
  -- Financial data
  amount NUMERIC NOT NULL DEFAULT 0, -- Gross amount
  net_amount NUMERIC NOT NULL DEFAULT 0, -- After platform fees
  currency TEXT DEFAULT 'USD',
  
  -- Transaction metadata
  category TEXT NOT NULL CHECK (category IN ('subscription', 'tip', 'message', 'post', 'referral', 'other')),
  description TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  fanvue_created_at TIMESTAMPTZ, -- Original timestamp from Fanvue
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Prevent duplicate syncs
  UNIQUE(fanvue_id, model_id)
);

-- Create indexes for fast queries
CREATE INDEX idx_fanvue_transactions_agency ON fanvue_transactions(agency_id);
CREATE INDEX idx_fanvue_transactions_model ON fanvue_transactions(model_id);
CREATE INDEX idx_fanvue_transactions_category ON fanvue_transactions(category);
CREATE INDEX idx_fanvue_transactions_created_at ON fanvue_transactions(created_at DESC);
CREATE INDEX idx_fanvue_transactions_fanvue_created_at ON fanvue_transactions(fanvue_created_at DESC);

-- Create composite index for common query patterns
CREATE INDEX idx_fanvue_transactions_agency_date ON fanvue_transactions(agency_id, created_at DESC);
CREATE INDEX idx_fanvue_transactions_model_date ON fanvue_transactions(model_id, created_at DESC);

-- Enable RLS
ALTER TABLE fanvue_transactions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Users can view transactions for their agency"
  ON fanvue_transactions FOR SELECT
  USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "System can insert transactions"
  ON fanvue_transactions FOR INSERT
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Create a view for daily aggregated revenue
CREATE OR REPLACE VIEW daily_revenue_summary AS
SELECT 
  agency_id,
  model_id,
  DATE(fanvue_created_at) as date,
  category,
  COUNT(*) as transaction_count,
  SUM(amount) as total_amount,
  SUM(net_amount) as total_net_amount,
  AVG(amount) as avg_amount
FROM fanvue_transactions
WHERE fanvue_created_at IS NOT NULL
GROUP BY agency_id, model_id, DATE(fanvue_created_at), category;

-- Grant access to the view
GRANT SELECT ON daily_revenue_summary TO authenticated;

-- Create a function to get revenue for a date range
CREATE OR REPLACE FUNCTION get_revenue_by_date_range(
  p_agency_id UUID,
  p_model_id UUID DEFAULT NULL,
  p_start_date TIMESTAMPTZ DEFAULT NOW() - INTERVAL '30 days',
  p_end_date TIMESTAMPTZ DEFAULT NOW()
)
RETURNS TABLE (
  date DATE,
  subscriptions NUMERIC,
  tips NUMERIC,
  messages NUMERIC,
  posts NUMERIC,
  total NUMERIC
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    DATE(fanvue_created_at) as date,
    COALESCE(SUM(CASE WHEN category = 'subscription' THEN amount ELSE 0 END), 0) as subscriptions,
    COALESCE(SUM(CASE WHEN category = 'tip' THEN amount ELSE 0 END), 0) as tips,
    COALESCE(SUM(CASE WHEN category = 'message' THEN amount ELSE 0 END), 0) as messages,
    COALESCE(SUM(CASE WHEN category = 'post' THEN amount ELSE 0 END), 0) as posts,
    COALESCE(SUM(amount), 0) as total
  FROM fanvue_transactions
  WHERE 
    agency_id = p_agency_id
    AND (p_model_id IS NULL OR model_id = p_model_id)
    AND fanvue_created_at >= p_start_date
    AND fanvue_created_at <= p_end_date
  GROUP BY DATE(fanvue_created_at)
  ORDER BY DATE(fanvue_created_at) ASC;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_revenue_by_date_range TO authenticated;

COMMENT ON TABLE fanvue_transactions IS 'Granular transaction data from Fanvue API for accurate revenue tracking and analytics';
COMMENT ON FUNCTION get_revenue_by_date_range IS 'Aggregates revenue by date for charts with automatic category breakdown';
