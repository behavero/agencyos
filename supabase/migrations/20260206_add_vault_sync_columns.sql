-- Add columns needed for Fanvue vault sync to content_assets
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS fanvue_media_uuid UUID;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS file_url TEXT;
ALTER TABLE content_assets ADD COLUMN IF NOT EXISTS media_type TEXT;

-- Unique index for upsert deduplication
-- Must NOT be a partial index (WHERE clause) — Supabase JS client can't use ON CONFLICT with partial indexes
-- NULL values don't conflict in PostgreSQL unique indexes, so this is safe
CREATE UNIQUE INDEX IF NOT EXISTS idx_content_assets_fanvue_uuid
  ON content_assets(fanvue_media_uuid);
