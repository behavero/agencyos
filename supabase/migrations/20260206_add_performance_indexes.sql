-- Performance indexes for analytics and dashboard queries
-- These cover the most frequently queried columns identified through code analysis

-- Transactions: agency + date range (used by analytics-engine, revenue-heartbeat, chart data)
CREATE INDEX IF NOT EXISTS idx_fanvue_transactions_agency_date
  ON fanvue_transactions(agency_id, transaction_date DESC);

-- Transactions: model + type + fan (used by getDerivedCounts, category breakdown, conversion rates)
CREATE INDEX IF NOT EXISTS idx_fanvue_transactions_model_type_fan
  ON fanvue_transactions(model_id, transaction_type, fan_id);

-- Transactions: agency + type + date (used by golden ratio, message/ppv counts)
CREATE INDEX IF NOT EXISTS idx_fanvue_transactions_agency_type_date
  ON fanvue_transactions(agency_id, transaction_type, transaction_date);

-- Tracking links: agency + revenue (used by getTopTrackingLinks sort/filter)
CREATE INDEX IF NOT EXISTS idx_tracking_links_agency_revenue
  ON tracking_links(agency_id, total_revenue DESC);

-- Subscriber history: model + date (used by getDerivedCounts, audience growth chart)
-- Note: idx_subscriber_history_model_date already exists from the initial migration
-- This composite is more specific for the queries we run
CREATE INDEX IF NOT EXISTS idx_subscriber_history_model_date_desc
  ON subscriber_history(model_id, date DESC);

-- Models: agency + uuid (used by refresh-all, agency sync)
CREATE INDEX IF NOT EXISTS idx_models_agency_uuid
  ON models(agency_id, fanvue_user_uuid);

-- Agency connections: status lookup (used by token refresh cron)
CREATE INDEX IF NOT EXISTS idx_agency_fanvue_connections_status
  ON agency_fanvue_connections(status, fanvue_token_expires_at);
