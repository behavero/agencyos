-- Migration: Add content_tasks table for Calendar functionality
-- Date: 2026-02-02

-- Create content_tasks table
CREATE TABLE IF NOT EXISTS content_tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  
  -- Content Details
  title TEXT NOT NULL,
  caption TEXT,
  media_url TEXT,
  notes TEXT,
  
  -- Platform & Type
  platform TEXT NOT NULL CHECK (platform IN ('instagram', 'fanvue', 'tiktok', 'youtube', 'x', 'twitter')),
  content_type TEXT NOT NULL CHECK (content_type IN ('reel', 'story', 'post', 'carousel', 'video', 'ppv', 'live')),
  
  -- Status
  status TEXT DEFAULT 'idea' CHECK (status IN ('idea', 'draft', 'scheduled', 'posted', 'missed', 'cancelled')),
  priority TEXT DEFAULT 'normal' CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
  
  -- Scheduling
  scheduled_at TIMESTAMP WITH TIME ZONE,
  posted_at TIMESTAMP WITH TIME ZONE,
  
  -- Assignments
  model_id UUID REFERENCES models(id) ON DELETE SET NULL,
  assignee_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  
  -- Linked Assets
  vault_asset_id UUID REFERENCES content_assets(id) ON DELETE SET NULL,
  
  -- Tags
  tags TEXT[],
  
  -- Metadata
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_content_tasks_agency ON content_tasks(agency_id);
CREATE INDEX IF NOT EXISTS idx_content_tasks_status ON content_tasks(status);
CREATE INDEX IF NOT EXISTS idx_content_tasks_platform ON content_tasks(platform);
CREATE INDEX IF NOT EXISTS idx_content_tasks_scheduled ON content_tasks(scheduled_at);
CREATE INDEX IF NOT EXISTS idx_content_tasks_model ON content_tasks(model_id);
CREATE INDEX IF NOT EXISTS idx_content_tasks_assignee ON content_tasks(assignee_id);

-- RLS Policies
ALTER TABLE content_tasks ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view tasks in their agency
CREATE POLICY "Users can view tasks in their agency"
  ON content_tasks FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = content_tasks.agency_id
    )
  );

-- Policy: Users can create tasks in their agency
CREATE POLICY "Users can create tasks in their agency"
  ON content_tasks FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = content_tasks.agency_id
    )
  );

-- Policy: Users can update tasks in their agency
CREATE POLICY "Users can update tasks in their agency"
  ON content_tasks FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = content_tasks.agency_id
    )
  );

-- Policy: Admins can delete tasks
CREATE POLICY "Admins can delete tasks"
  ON content_tasks FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = content_tasks.agency_id
      AND profiles.role IN ('owner', 'admin', 'grandmaster')
    )
  );

-- Trigger: Update updated_at on change
CREATE OR REPLACE FUNCTION update_content_tasks_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_content_tasks_updated_at
  BEFORE UPDATE ON content_tasks
  FOR EACH ROW
  EXECUTE FUNCTION update_content_tasks_updated_at();

-- Comments
COMMENT ON TABLE content_tasks IS 'Content calendar and task management for social media posts';
COMMENT ON COLUMN content_tasks.platform IS 'Social media platform where content will be posted';
COMMENT ON COLUMN content_tasks.content_type IS 'Type of content (reel, story, post, etc.)';
COMMENT ON COLUMN content_tasks.status IS 'Current status of the content task';
COMMENT ON COLUMN content_tasks.priority IS 'Priority level for task completion';
