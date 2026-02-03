-- Force Full Historical Sync
-- This resets the last_transaction_sync to 2020 to pull ALL historical data

-- View current sync status
SELECT 
  id,
  name,
  last_transaction_sync,
  (SELECT COUNT(*) FROM fanvue_transactions WHERE model_id = models.id) as transaction_count
FROM models
WHERE fanvue_user_uuid IS NOT NULL;

-- Reset last_transaction_sync to force full historical sync
UPDATE models
SET last_transaction_sync = '2020-01-01T00:00:00.000Z'
WHERE fanvue_user_uuid IS NOT NULL;

-- Verify reset
SELECT 
  id,
  name,
  last_transaction_sync,
  'Ready for full sync' as status
FROM models
WHERE fanvue_user_uuid IS NOT NULL;
