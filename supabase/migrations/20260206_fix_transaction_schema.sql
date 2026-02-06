-- Phase 1: Align fanvue_transactions schema with what the code actually writes
-- The original migration defined columns (fanvue_id, category, fanvue_created_at)
-- but the code writes to (fanvue_transaction_id, transaction_type, transaction_date).
-- This migration adds the missing columns and creates the critical UNIQUE INDEX.

-- Add columns that the code writes to but may not exist in the table
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS fanvue_transaction_id TEXT;
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS transaction_type TEXT;
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS transaction_date TIMESTAMPTZ;
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS fan_id TEXT;
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS fan_username TEXT;
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS fan_handle TEXT;
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS fan_display_name TEXT;
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS platform_fee NUMERIC DEFAULT 0;
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS source TEXT;
ALTER TABLE fanvue_transactions ADD COLUMN IF NOT EXISTS fanvue_user_uuid TEXT;

-- THE CRITICAL FIX: Create a unique index on fanvue_transaction_id
-- This is what makes upserts with onConflict: 'fanvue_transaction_id' actually work.
-- Without this, every upsert falls through to INSERT and creates duplicates.
CREATE UNIQUE INDEX IF NOT EXISTS idx_fanvue_transactions_unique_txid
  ON fanvue_transactions(fanvue_transaction_id)
  WHERE fanvue_transaction_id IS NOT NULL;

-- Performance index for the new columns
CREATE INDEX IF NOT EXISTS idx_fanvue_transactions_tx_date
  ON fanvue_transactions(transaction_date DESC)
  WHERE transaction_date IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_fanvue_transactions_tx_type
  ON fanvue_transactions(transaction_type)
  WHERE transaction_type IS NOT NULL;
