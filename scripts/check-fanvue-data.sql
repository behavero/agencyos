-- ========================================
-- PHASE 58: FANVUE DATA VERIFICATION
-- ========================================
-- Run this in Supabase SQL Editor to diagnose transaction data

-- 1. Check if we have ANY transactions
SELECT 
  COUNT(*) as total_transactions,
  COUNT(DISTINCT model_id) as unique_creators,
  SUM(amount_cents) as total_value_cents,
  ROUND(SUM(amount_cents)::numeric / 100, 2) as total_value_dollars,
  MIN(fanvue_created_at) as earliest_transaction,
  MAX(fanvue_created_at) as latest_transaction
FROM fanvue_transactions;

-- 2. Transactions by type
SELECT 
  transaction_type,
  COUNT(*) as count,
  ROUND(SUM(amount_cents)::numeric / 100, 2) as total_dollars
FROM fanvue_transactions
GROUP BY transaction_type
ORDER BY total_dollars DESC;

-- 3. Transactions by month
SELECT 
  TO_CHAR(fanvue_created_at, 'YYYY-MM') as month,
  COUNT(*) as count,
  ROUND(SUM(amount_cents)::numeric / 100, 2) as total_dollars
FROM fanvue_transactions
GROUP BY TO_CHAR(fanvue_created_at, 'YYYY-MM')
ORDER BY month DESC;

-- 4. Check model sync status
SELECT 
  m.id,
  m.name,
  m.fanvue_username,
  m.last_transaction_sync,
  m.fanvue_token_expires_at,
  CASE 
    WHEN m.fanvue_token_expires_at < NOW() THEN '❌ Expired'
    WHEN m.fanvue_token_expires_at < NOW() + INTERVAL '1 hour' THEN '⚠️  Expiring Soon'
    ELSE '✅ Valid'
  END as token_status,
  COUNT(ft.id) as transaction_count,
  ROUND(SUM(ft.amount_cents)::numeric / 100, 2) as total_earnings
FROM models m
LEFT JOIN fanvue_transactions ft ON ft.model_id = m.id
WHERE m.fanvue_user_uuid IS NOT NULL
GROUP BY m.id, m.name, m.fanvue_username, m.last_transaction_sync, m.fanvue_token_expires_at
ORDER BY transaction_count DESC;

-- 5. Recent transactions (last 10)
SELECT 
  m.name as creator_name,
  ft.transaction_type,
  ROUND(ft.amount_cents::numeric / 100, 2) as amount_dollars,
  ft.fanvue_created_at,
  ft.created_at as synced_at
FROM fanvue_transactions ft
JOIN models m ON m.id = ft.model_id
ORDER BY ft.fanvue_created_at DESC
LIMIT 10;

-- 6. Check for missing data (transactions outside sync window)
SELECT 
  m.name,
  m.last_transaction_sync,
  COUNT(ft.id) as transactions_before_cursor
FROM models m
LEFT JOIN fanvue_transactions ft ON ft.model_id = m.id 
  AND ft.fanvue_created_at < m.last_transaction_sync
WHERE m.fanvue_user_uuid IS NOT NULL
GROUP BY m.id, m.name, m.last_transaction_sync
HAVING COUNT(ft.id) > 0;

-- 7. Dashboard query test (what the frontend sees)
WITH daily_revenue AS (
  SELECT 
    DATE(fanvue_created_at) as date,
    SUM(amount_cents) as total_cents
  FROM fanvue_transactions
  WHERE fanvue_created_at >= NOW() - INTERVAL '30 days'
  GROUP BY DATE(fanvue_created_at)
)
SELECT 
  date,
  ROUND(total_cents::numeric / 100, 2) as revenue_dollars
FROM daily_revenue
ORDER BY date DESC;
