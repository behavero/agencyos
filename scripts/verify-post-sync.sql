-- RUN THIS AFTER CLICKING "SYNC AGENCY"
-- This will verify the transactions are correctly stored

-- 1. Total transactions count
SELECT 
  'Total Transactions' as metric,
  COUNT(*)::text as value
FROM fanvue_transactions

UNION ALL

-- 2. Transaction type breakdown
SELECT 
  'Breakdown by Type' as metric,
  json_agg(
    json_build_object(
      'type', transaction_type,
      'count', count,
      'total', total
    )
  )::text as value
FROM (
  SELECT 
    transaction_type,
    COUNT(*) as count,
    ROUND(SUM(amount)::numeric, 2) as total
  FROM fanvue_transactions
  GROUP BY transaction_type
  ORDER BY SUM(amount) DESC
) breakdown

UNION ALL

-- 3. Per-model revenue
SELECT 
  'Per-Model Revenue' as metric,
  json_agg(
    json_build_object(
      'model', name,
      'transactions', txn_count,
      'revenue', revenue
    )
  )::text as value
FROM (
  SELECT 
    m.name,
    COUNT(t.id) as txn_count,
    ROUND(SUM(t.amount)::numeric, 2) as revenue
  FROM models m
  LEFT JOIN fanvue_transactions t ON t.model_id = m.id
  WHERE m.agency_id IN (SELECT id FROM agencies LIMIT 1)
  GROUP BY m.id, m.name
  ORDER BY revenue DESC
) model_stats

UNION ALL

-- 4. Date range check
SELECT 
  'Date Range' as metric,
  CONCAT(
    'From: ', MIN(transaction_date)::date, 
    ' To: ', MAX(transaction_date)::date,
    ' (', COUNT(DISTINCT transaction_date::date), ' days)'
  ) as value
FROM fanvue_transactions

UNION ALL

-- 5. Unique fans
SELECT 
  'Unique Fans' as metric,
  COUNT(DISTINCT fan_id)::text as value
FROM fanvue_transactions
WHERE fan_id IS NOT NULL

UNION ALL

-- 6. Average calculations
SELECT 
  'KPI Metrics' as metric,
  json_build_object(
    'total_revenue', ROUND(SUM(amount)::numeric, 2),
    'net_revenue', ROUND(SUM(net_amount)::numeric, 2),
    'platform_fees', ROUND(SUM(platform_fee)::numeric, 2),
    'avg_transaction', ROUND(AVG(amount)::numeric, 2),
    'avg_tip', ROUND(AVG(CASE WHEN transaction_type = 'tip' THEN amount END)::numeric, 2)
  )::text as value
FROM fanvue_transactions;
