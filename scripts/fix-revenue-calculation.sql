-- Emergency Revenue Fix Script
-- Recalculates revenue_total for all models from fanvue_transactions

-- Step 1: Check current revenue_total vs actual transactions
SELECT 
  m.id,
  m.name,
  m.revenue_total as "Current DB Revenue",
  COALESCE(SUM(ft.amount), 0) as "Calculated from Transactions",
  m.revenue_total - COALESCE(SUM(ft.amount), 0) as "Discrepancy"
FROM models m
LEFT JOIN fanvue_transactions ft ON ft.model_id = m.id
WHERE m.fanvue_access_token IS NOT NULL
GROUP BY m.id, m.name, m.revenue_total
ORDER BY "Discrepancy" DESC;

-- Step 2: Update revenue_total for all models based on actual transactions
-- UNCOMMENT TO EXECUTE:
-- UPDATE models m
-- SET 
--   revenue_total = COALESCE((
--     SELECT SUM(amount) 
--     FROM fanvue_transactions 
--     WHERE model_id = m.id
--   ), 0),
--   updated_at = NOW()
-- WHERE m.fanvue_access_token IS NOT NULL
-- RETURNING id, name, revenue_total;
