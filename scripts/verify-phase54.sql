-- PHASE 54 VERIFICATION SCRIPT
-- Run this in Supabase SQL Editor to verify the implementation

-- ============================================
-- 1. CHECK TABLE STRUCTURE
-- ============================================
SELECT 
  'fanvue_transactions table exists' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'fanvue_transactions'
  ) THEN '✅ PASS' ELSE '❌ FAIL' END as status;

-- ============================================
-- 2. CHECK INDEXES
-- ============================================
SELECT 
  'Required indexes exist' as check_name,
  CASE WHEN COUNT(*) >= 6 THEN '✅ PASS' ELSE '❌ FAIL' END as status
FROM pg_indexes 
WHERE tablename = 'fanvue_transactions';

-- ============================================
-- 3. CHECK RPC FUNCTION
-- ============================================
SELECT 
  'get_revenue_by_date_range function exists' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_proc 
    WHERE proname = 'get_revenue_by_date_range'
  ) THEN '✅ PASS' ELSE '❌ FAIL' END as status;

-- ============================================
-- 4. CHECK TRANSACTION COUNT
-- ============================================
SELECT 
  'Transaction count' as metric,
  COUNT(*) as value,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Has data'
    ELSE '⚠️ No transactions - run sync'
  END as status
FROM fanvue_transactions;

-- ============================================
-- 5. CHECK DATE RANGE
-- ============================================
SELECT 
  'Date range' as metric,
  MIN(fanvue_created_at)::date as earliest,
  MAX(fanvue_created_at)::date as latest,
  CASE 
    WHEN MIN(fanvue_created_at) IS NOT NULL THEN '✅ Dates populated'
    ELSE '❌ No dates - check sync'
  END as status
FROM fanvue_transactions;

-- ============================================
-- 6. CHECK CATEGORY DISTRIBUTION
-- ============================================
SELECT 
  'Category distribution' as metric,
  category,
  COUNT(*) as transaction_count,
  SUM(amount)::numeric(10,2) as total_amount,
  '✅' as status
FROM fanvue_transactions
GROUP BY category
ORDER BY total_amount DESC;

-- ============================================
-- 7. TEST RPC FUNCTION
-- ============================================
-- Replace 'YOUR_AGENCY_ID' with actual agency ID
/*
SELECT 
  'RPC function test' as check_name,
  date,
  subscriptions,
  tips,
  messages,
  posts,
  total
FROM get_revenue_by_date_range(
  'YOUR_AGENCY_ID'::uuid,
  NULL,
  NOW() - INTERVAL '30 days',
  NOW()
)
ORDER BY date DESC
LIMIT 10;
*/

-- ============================================
-- 8. CHECK MODELS WITH TOKENS
-- ============================================
SELECT 
  'Models with Fanvue tokens' as metric,
  COUNT(*) as count,
  CASE 
    WHEN COUNT(*) > 0 THEN '✅ Ready to sync'
    ELSE '⚠️ No tokens - connect Fanvue'
  END as status
FROM models
WHERE fanvue_access_token IS NOT NULL;

-- ============================================
-- 9. CHECK RECENT SYNCS
-- ============================================
SELECT 
  'Recent syncs' as metric,
  COUNT(*) as transactions_synced,
  MAX(synced_at)::timestamp as last_sync,
  CASE 
    WHEN MAX(synced_at) > NOW() - INTERVAL '24 hours' THEN '✅ Recently synced'
    WHEN MAX(synced_at) IS NOT NULL THEN '⚠️ Sync outdated'
    ELSE '❌ Never synced'
  END as status
FROM fanvue_transactions;

-- ============================================
-- 10. SAMPLE TRANSACTIONS
-- ============================================
SELECT 
  'Sample transactions' as section,
  DATE(fanvue_created_at) as date,
  category,
  COUNT(*) as count,
  SUM(amount)::numeric(10,2) as total
FROM fanvue_transactions
WHERE fanvue_created_at >= NOW() - INTERVAL '7 days'
GROUP BY DATE(fanvue_created_at), category
ORDER BY date DESC, total DESC
LIMIT 20;

-- ============================================
-- SUMMARY
-- ============================================
SELECT 
  '=== PHASE 54 VERIFICATION SUMMARY ===' as summary,
  (SELECT COUNT(*) FROM fanvue_transactions) as total_transactions,
  (SELECT COUNT(DISTINCT category) FROM fanvue_transactions) as categories,
  (SELECT COUNT(DISTINCT model_id) FROM fanvue_transactions) as models_with_data,
  (SELECT SUM(amount)::numeric(10,2) FROM fanvue_transactions) as total_revenue,
  CASE 
    WHEN (SELECT COUNT(*) FROM fanvue_transactions) > 0 THEN '✅ READY'
    ELSE '⚠️ NEEDS SYNC'
  END as overall_status;
