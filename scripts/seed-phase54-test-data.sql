-- PHASE 54 - SEED TEST DATA
-- Use this to populate sample transactions for testing the new analytics

-- ============================================
-- INSTRUCTIONS
-- ============================================
-- 1. Replace 'YOUR_AGENCY_ID' with your actual agency ID
-- 2. Replace 'YOUR_MODEL_ID' with your actual model ID
-- 3. Run this script in Supabase SQL Editor
-- 4. Refresh your dashboard to see the charts populate

-- ============================================
-- CONFIGURATION
-- ============================================
-- Set your IDs here:
DO $$
DECLARE
  v_agency_id UUID := 'YOUR_AGENCY_ID'; -- CHANGE THIS
  v_model_id UUID := 'YOUR_MODEL_ID';   -- CHANGE THIS
  v_day INTEGER;
  v_category TEXT;
  v_amount NUMERIC;
BEGIN
  -- Check if IDs are valid
  IF v_agency_id = 'YOUR_AGENCY_ID' THEN
    RAISE EXCEPTION 'Please set v_agency_id to your actual agency ID';
  END IF;
  
  IF v_model_id = 'YOUR_MODEL_ID' THEN
    RAISE EXCEPTION 'Please set v_model_id to your actual model ID';
  END IF;

  -- Generate 30 days of sample data
  FOR v_day IN 1..30 LOOP
    -- Generate transactions for each category
    FOREACH v_category IN ARRAY ARRAY['subscription', 'tip', 'message', 'post'] LOOP
      -- Random number of transactions per day per category (1-5)
      FOR i IN 1..(1 + floor(random() * 5))::int LOOP
        -- Random amount based on category
        v_amount := CASE v_category
          WHEN 'subscription' THEN 10 + (random() * 40)::numeric  -- $10-$50
          WHEN 'tip' THEN 5 + (random() * 95)::numeric            -- $5-$100
          WHEN 'message' THEN 3 + (random() * 27)::numeric        -- $3-$30
          WHEN 'post' THEN 5 + (random() * 45)::numeric           -- $5-$50
          ELSE 10
        END;

        -- Insert transaction
        INSERT INTO fanvue_transactions (
          agency_id,
          model_id,
          fanvue_id,
          fanvue_user_id,
          amount,
          net_amount,
          currency,
          category,
          description,
          fanvue_created_at,
          synced_at
        ) VALUES (
          v_agency_id,
          v_model_id,
          'test_' || v_day || '_' || v_category || '_' || i || '_' || floor(random() * 10000),
          'fan_' || floor(random() * 100),
          v_amount,
          v_amount * 0.8, -- 80% net (20% platform fee)
          'USD',
          v_category,
          'Test ' || v_category || ' transaction',
          NOW() - (v_day || ' days')::interval + (random() * 24 || ' hours')::interval,
          NOW()
        );
      END LOOP;
    END LOOP;
  END LOOP;

  RAISE NOTICE 'Successfully seeded test data for 30 days';
END $$;

-- ============================================
-- VERIFY SEEDED DATA
-- ============================================
SELECT 
  'Verification' as section,
  COUNT(*) as total_transactions,
  COUNT(DISTINCT category) as categories,
  SUM(amount)::numeric(10,2) as total_revenue,
  MIN(fanvue_created_at)::date as earliest_date,
  MAX(fanvue_created_at)::date as latest_date
FROM fanvue_transactions
WHERE fanvue_id LIKE 'test_%';

-- ============================================
-- VIEW DAILY BREAKDOWN
-- ============================================
SELECT 
  DATE(fanvue_created_at) as date,
  category,
  COUNT(*) as transactions,
  SUM(amount)::numeric(10,2) as total
FROM fanvue_transactions
WHERE fanvue_id LIKE 'test_%'
GROUP BY DATE(fanvue_created_at), category
ORDER BY date DESC, total DESC
LIMIT 30;

-- ============================================
-- CLEANUP (Run this to remove test data)
-- ============================================
-- DELETE FROM fanvue_transactions WHERE fanvue_id LIKE 'test_%';
