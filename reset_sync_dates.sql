-- Check current sync dates
SELECT 
  name,
  fanvue_username,
  last_transaction_sync,
  last_stats_sync
FROM models
WHERE agency_id IN (SELECT id FROM agencies LIMIT 1)
ORDER BY name;

-- Reset all sync dates to force full historical sync
UPDATE models
SET 
  last_transaction_sync = '2020-01-01T00:00:00Z',
  last_stats_sync = '2020-01-01T00:00:00Z'
WHERE agency_id IN (SELECT id FROM agencies LIMIT 1);

-- Verify reset
SELECT 
  name,
  fanvue_username,
  last_transaction_sync,
  last_stats_sync
FROM models
WHERE agency_id IN (SELECT id FROM agencies LIMIT 1)
ORDER BY name;
