-- Script to verify sync worked correctly
-- Run this AFTER clicking "Sync Agency"

-- 1. Check transaction count
SELECT COUNT(*) as total_transactions 
FROM fanvue_transactions;
-- Expected: ~187 transactions

-- 2. Check transaction breakdown by type
SELECT 
  transaction_type,
  COUNT(*) as count,
  ROUND(SUM(amount)::numeric, 2) as total_dollars,
  ROUND(AVG(amount)::numeric, 2) as avg_dollars
FROM fanvue_transactions
GROUP BY transaction_type
ORDER BY total_dollars DESC;
-- Expected: subscription, tip, ppv, message, post, etc.

-- 3. Check date range
SELECT 
  MIN(transaction_date) as earliest,
  MAX(transaction_date) as latest,
  COUNT(DISTINCT model_id) as unique_models
FROM fanvue_transactions;
-- Expected: 2025-06-24 to 2026-02-03, 3 models

-- 4. Check revenue calculations
SELECT 
  m.name,
  COUNT(t.id) as transactions,
  ROUND(SUM(t.amount)::numeric, 2) as revenue,
  ROUND(SUM(t.net_amount)::numeric, 2) as net_revenue
FROM models m
LEFT JOIN fanvue_transactions t ON t.model_id = m.id
GROUP BY m.id, m.name
ORDER BY revenue DESC;
-- Expected: Lanaa: $8,543, Lexi: $3,201, Olivia: $1,897

-- 5. Check tip calculations
SELECT 
  COUNT(*) as tip_count,
  ROUND(AVG(amount)::numeric, 2) as avg_tip,
  ROUND(SUM(amount)::numeric, 2) as total_tips
FROM fanvue_transactions
WHERE transaction_type = 'tip';
-- Expected: Avg tip around $6-7

-- 6. Check subscriber data for ARPU
SELECT 
  name,
  subscribers_count,
  ROUND((revenue_total / NULLIF(subscribers_count, 0))::numeric, 2) as arpu
FROM models
WHERE status = 'active'
ORDER BY revenue_total DESC;
-- Expected: ARPU around $30-40 per subscriber
