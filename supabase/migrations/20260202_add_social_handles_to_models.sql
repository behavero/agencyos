-- Phase 51: Add Social Media Handle Fields to Models
-- Allows creators to link their social media accounts for tracking

-- Add social handle fields
ALTER TABLE models 
ADD COLUMN IF NOT EXISTS instagram_handle TEXT,
ADD COLUMN IF NOT EXISTS twitter_handle TEXT,
ADD COLUMN IF NOT EXISTS tiktok_handle TEXT,
ADD COLUMN IF NOT EXISTS agency_split_percentage NUMERIC DEFAULT 50.00 CHECK (agency_split_percentage >= 0 AND agency_split_percentage <= 100),
ADD COLUMN IF NOT EXISTS fanvue_username TEXT;

-- Create indexes for faster lookups
CREATE INDEX IF NOT EXISTS idx_models_instagram_handle ON models(instagram_handle);
CREATE INDEX IF NOT EXISTS idx_models_twitter_handle ON models(twitter_handle);
CREATE INDEX IF NOT EXISTS idx_models_tiktok_handle ON models(tiktok_handle);
CREATE INDEX IF NOT EXISTS idx_models_fanvue_username ON models(fanvue_username);

-- Add comments
COMMENT ON COLUMN models.instagram_handle IS 'Instagram handle (without @) for social tracking';
COMMENT ON COLUMN models.twitter_handle IS 'Twitter/X handle (without @) for social tracking';
COMMENT ON COLUMN models.tiktok_handle IS 'TikTok handle (without @) for social tracking';
COMMENT ON COLUMN models.agency_split_percentage IS 'Percentage of revenue that goes to agency (0-100)';
COMMENT ON COLUMN models.fanvue_username IS 'Fanvue username for profile linking';

-- Update existing models with default split if NULL
UPDATE models 
SET agency_split_percentage = 50.00 
WHERE agency_split_percentage IS NULL;
