-- PHASE 39: THE ACADEMY (ONBOARDING & INTELLIGENCE)
-- Migration: Add invite system, knowledge base, and script manager

-- Table: invitations
-- Stores magic link invites for new team members
CREATE TABLE IF NOT EXISTS invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  
  -- Invite Details
  email TEXT NOT NULL,
  role TEXT NOT NULL CHECK (role IN ('owner', 'admin', 'grandmaster', 'paladin', 'alchemist', 'ranger', 'rogue', 'chatter', 'smm', 'recruiter')),
  
  -- Magic Link
  token TEXT UNIQUE NOT NULL,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'expired', 'revoked')),
  
  -- Metadata
  invited_by UUID REFERENCES profiles(id),
  accepted_at TIMESTAMP WITH TIME ZONE,
  accepted_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Constraint: One pending invite per email per agency
  UNIQUE(agency_id, email, status)
);

-- Table: knowledge_base (The Playbook)
-- Internal wiki for SOPs, training materials, and documentation
CREATE TABLE IF NOT EXISTS knowledge_base (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  
  -- Content
  title TEXT NOT NULL,
  slug TEXT NOT NULL, -- URL-friendly version of title
  content TEXT, -- Markdown content
  excerpt TEXT, -- Short summary
  
  -- Organization
  category TEXT DEFAULT 'general' CHECK (category IN ('sop', 'training', 'sales', 'technical', 'general')),
  tags TEXT[], -- e.g., ['onboarding', 'chatting', 'fanvue']
  
  -- Visibility
  visible_to TEXT[] DEFAULT ARRAY['owner', 'admin', 'chatter', 'smm'], -- Roles that can view
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  view_count INT DEFAULT 0,
  
  -- Constraint: Unique slug per agency
  UNIQUE(agency_id, slug)
);

-- Table: chat_scripts (The Arsenal)
-- Reusable chat scripts with performance tracking
CREATE TABLE IF NOT EXISTS chat_scripts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  
  -- Script Content
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- The actual script text
  
  -- Organization
  category TEXT DEFAULT 'opener' CHECK (category IN ('opener', 'closer', 'upsell', 'objection', 'ppv', 'custom')),
  tags TEXT[], -- e.g., ['spicy', 'valentines', 'morning']
  
  -- Performance Tracking
  usage_count INT DEFAULT 0,
  conversion_rate NUMERIC(5, 4) DEFAULT 0, -- e.g., 0.1250 = 12.5%
  avg_revenue NUMERIC(10, 2) DEFAULT 0,
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  last_used_at TIMESTAMP WITH TIME ZONE,
  
  -- Status
  is_active BOOLEAN DEFAULT true,
  is_favorite BOOLEAN DEFAULT false
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_invitations_token ON invitations(token);
CREATE INDEX IF NOT EXISTS idx_invitations_email ON invitations(email);
CREATE INDEX IF NOT EXISTS idx_invitations_agency ON invitations(agency_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON invitations(status);

CREATE INDEX IF NOT EXISTS idx_knowledge_base_agency ON knowledge_base(agency_id);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_category ON knowledge_base(category);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_slug ON knowledge_base(slug);
CREATE INDEX IF NOT EXISTS idx_knowledge_base_search ON knowledge_base USING gin(to_tsvector('english', title || ' ' || content));

CREATE INDEX IF NOT EXISTS idx_chat_scripts_agency ON chat_scripts(agency_id);
CREATE INDEX IF NOT EXISTS idx_chat_scripts_category ON chat_scripts(category);
CREATE INDEX IF NOT EXISTS idx_chat_scripts_active ON chat_scripts(is_active);

-- RLS Policies
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE knowledge_base ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_scripts ENABLE ROW LEVEL SECURITY;

-- Policy: Admins can manage invitations
CREATE POLICY "Admins can manage invitations"
  ON invitations FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = invitations.agency_id
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Policy: Users can view knowledge base articles they have access to
CREATE POLICY "Users can view accessible knowledge base articles"
  ON knowledge_base FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = knowledge_base.agency_id
      AND profiles.role = ANY(knowledge_base.visible_to)
    )
  );

-- Policy: Admins can manage knowledge base
CREATE POLICY "Admins can manage knowledge base"
  ON knowledge_base FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = knowledge_base.agency_id
      AND profiles.role IN ('owner', 'admin', 'grandmaster')
    )
  );

-- Policy: Users can view scripts in their agency
CREATE POLICY "Users can view scripts"
  ON chat_scripts FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = chat_scripts.agency_id
    )
  );

-- Policy: Admins can manage scripts
CREATE POLICY "Admins can manage scripts"
  ON chat_scripts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = chat_scripts.agency_id
      AND profiles.role IN ('owner', 'admin', 'grandmaster', 'paladin')
    )
  );

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_knowledge_base_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_knowledge_base_updated_at
  BEFORE UPDATE ON knowledge_base
  FOR EACH ROW
  EXECUTE FUNCTION update_knowledge_base_updated_at();

CREATE OR REPLACE FUNCTION update_chat_scripts_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_chat_scripts_updated_at
  BEFORE UPDATE ON chat_scripts
  FOR EACH ROW
  EXECUTE FUNCTION update_chat_scripts_updated_at();

-- Function: Generate unique slug from title
CREATE OR REPLACE FUNCTION generate_slug(title TEXT, agency_id UUID)
RETURNS TEXT AS $$
DECLARE
  base_slug TEXT;
  final_slug TEXT;
  counter INT := 0;
BEGIN
  -- Convert title to slug (lowercase, replace spaces with hyphens, remove special chars)
  base_slug := lower(regexp_replace(title, '[^a-zA-Z0-9\s-]', '', 'g'));
  base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
  base_slug := regexp_replace(base_slug, '-+', '-', 'g');
  base_slug := trim(both '-' from base_slug);
  
  final_slug := base_slug;
  
  -- Check for uniqueness and append counter if needed
  WHILE EXISTS (SELECT 1 FROM knowledge_base WHERE slug = final_slug AND knowledge_base.agency_id = generate_slug.agency_id) LOOP
    counter := counter + 1;
    final_slug := base_slug || '-' || counter;
  END LOOP;
  
  RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Comments
COMMENT ON TABLE invitations IS 'Magic link invitations for new team members';
COMMENT ON TABLE knowledge_base IS 'Internal wiki/playbook for SOPs and training materials';
COMMENT ON TABLE chat_scripts IS 'Reusable chat scripts with performance tracking';
