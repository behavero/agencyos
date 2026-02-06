-- Add columns needed for Fanvue vault sync to content_assets
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS fanvue_media_uuid UUID;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Unique index for upsert deduplication (only on non-null values)
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_assets_fanvue_uuid
  ON content_assets(fanvue_media_uuid)
  WHERE fanvue_media_uuid IS NOT NULL;
