-- Add subscriber_history table for historical tracking of followers/subscribers
CREATE TABLE IF NOT EXISTS subscriber_history (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  model_id UUID NOT NULL REFERENCES models(id) ON DELETE CASCADE,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  subscribers_count INTEGER NOT NULL DEFAULT 0,
  followers_count INTEGER NOT NULL DEFAULT 0,
  total_audience INTEGER GENERATED ALWAYS AS (subscribers_count + followers_count) STORED,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(model_id, date) -- One snapshot per model per day
);

-- Add indexes for performance
CREATE INDEX idx_subscriber_history_agency ON subscriber_history(agency_id);
CREATE INDEX idx_subscriber_history_model ON subscriber_history(model_id);
CREATE INDEX idx_subscriber_history_date ON subscriber_history(date DESC);
CREATE INDEX idx_subscriber_history_model_date ON subscriber_history(model_id, date DESC);

-- Add RLS policies
ALTER TABLE subscriber_history ENABLE ROW LEVEL SECURITY;

-- Users can view their own agency's history
CREATE POLICY "Users can view own agency subscriber history"
  ON subscriber_history FOR SELECT
  TO authenticated
  USING (
    agency_id IN (
      SELECT agency_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- System can insert snapshots
CREATE POLICY "System can insert subscriber history"
  ON subscriber_history FOR INSERT
  TO authenticated
  WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM profiles
      WHERE id = auth.uid()
    )
  );

-- Add comment
COMMENT ON TABLE subscriber_history IS 'Daily snapshots of model subscriber and follower counts for historical trend analysis';
