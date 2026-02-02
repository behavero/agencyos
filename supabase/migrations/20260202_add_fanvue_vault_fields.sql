-- Add Fanvue Vault tracking fields to content_assets
-- Phase 50B - Link content_assets to Fanvue Vault media

ALTER TABLE content_assets
ADD COLUMN IF NOT EXISTS fanvue_media_uuid TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS fanvue_folder TEXT;

-- Create index for faster lookups
CREATE INDEX IF NOT EXISTS idx_content_assets_fanvue_uuid ON content_assets(fanvue_media_uuid);
CREATE INDEX IF NOT EXISTS idx_content_assets_fanvue_folder ON content_assets(fanvue_folder);

COMMENT ON COLUMN content_assets.fanvue_media_uuid IS 'Unique ID from Fanvue Vault API';
COMMENT ON COLUMN content_assets.fanvue_folder IS 'Folder name in Fanvue Vault';
