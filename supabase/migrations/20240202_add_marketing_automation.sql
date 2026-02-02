-- Migration: Marketing Automation Engine
-- Phase 42: Campaign Manager for Mass DMs and Trigger-based Workflows

-- 1. Marketing Segments (Audience Targeting)
CREATE TABLE marketing_segments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  criteria JSONB NOT NULL DEFAULT '{}'::jsonb,
  -- Example criteria: {"total_spend_min": 500, "status": "active", "days_since_last_purchase_max": 30}
  estimated_count INT DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE marketing_segments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view segments" ON marketing_segments
  FOR SELECT USING (agency_id IN (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Agency owners/admins can manage segments" ON marketing_segments
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'grandmaster', 'paladin')
    )
  ) WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'grandmaster', 'paladin')
    )
  );

-- 2. Marketing Campaigns (Mass DM Campaigns)
CREATE TABLE marketing_campaigns (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  segment_id UUID REFERENCES public.marketing_segments(id) ON DELETE SET NULL,
  name TEXT NOT NULL,
  message_template TEXT NOT NULL,
  media_id UUID, -- Link to content_assets (Vault)
  price NUMERIC(10,2) DEFAULT 0.00, -- PPV price
  status TEXT DEFAULT 'draft' NOT NULL CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'paused', 'failed')),
  scheduled_for TIMESTAMP WITH TIME ZONE,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE,
  stats JSONB DEFAULT '{"sent": 0, "opened": 0, "revenue": 0, "failed": 0}'::jsonb NOT NULL,
  created_by UUID REFERENCES public.profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE marketing_campaigns ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view campaigns" ON marketing_campaigns
  FOR SELECT USING (agency_id IN (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Agency owners/admins/paladins can manage campaigns" ON marketing_campaigns
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'grandmaster', 'paladin')
    )
  ) WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'grandmaster', 'paladin')
    )
  );

-- 3. Marketing Automations (Trigger-based Workflows)
CREATE TABLE marketing_automations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  trigger_event TEXT NOT NULL CHECK (trigger_event IN ('new_sub', 'sub_expired', 'tip_received', 'first_message', 'no_activity_30d', 'ppv_unlocked')),
  trigger_conditions JSONB DEFAULT '{}'::jsonb, -- e.g., {"tip_amount_min": 50}
  delay_minutes INT DEFAULT 0 NOT NULL,
  action_type TEXT NOT NULL CHECK (action_type IN ('send_message', 'add_tag', 'remove_tag', 'update_custom_attr', 'set_vip_status')),
  action_data JSONB NOT NULL, -- e.g., {"message": "Welcome!", "media_id": "..."}
  active BOOLEAN DEFAULT true NOT NULL,
  times_triggered INT DEFAULT 0 NOT NULL,
  last_triggered_at TIMESTAMP WITH TIME ZONE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE marketing_automations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view automations" ON marketing_automations
  FOR SELECT USING (agency_id IN (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Agency owners/admins/paladins can manage automations" ON marketing_automations
  FOR ALL USING (
    agency_id IN (
      SELECT agency_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'grandmaster', 'paladin')
    )
  ) WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM profiles 
      WHERE id = auth.uid() 
      AND role IN ('owner', 'admin', 'grandmaster', 'paladin')
    )
  );

-- 4. Message Queue (The Throttler)
CREATE TABLE message_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES public.agencies(id) ON DELETE CASCADE NOT NULL,
  campaign_id UUID REFERENCES public.marketing_campaigns(id) ON DELETE CASCADE,
  automation_id UUID REFERENCES public.marketing_automations(id) ON DELETE CASCADE,
  model_id UUID REFERENCES public.models(id) ON DELETE CASCADE NOT NULL,
  fan_id TEXT NOT NULL, -- Fanvue fan UUID
  payload JSONB NOT NULL, -- {"message": "...", "media_id": "...", "price": 20}
  status TEXT DEFAULT 'pending' NOT NULL CHECK (status IN ('pending', 'processing', 'sent', 'failed', 'cancelled')),
  scheduled_for TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE,
  error_message TEXT,
  retry_count INT DEFAULT 0 NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

ALTER TABLE message_queue ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Agency members can view message queue" ON message_queue
  FOR SELECT USING (agency_id IN (SELECT agency_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "System can manage message queue" ON message_queue
  FOR ALL USING (true) WITH CHECK (true);

-- Indexes for performance
CREATE INDEX idx_message_queue_status_scheduled ON message_queue(status, scheduled_for) WHERE status = 'pending';
CREATE INDEX idx_message_queue_campaign ON message_queue(campaign_id);
CREATE INDEX idx_message_queue_automation ON message_queue(automation_id);
CREATE INDEX idx_campaigns_status ON marketing_campaigns(status, scheduled_for);
CREATE INDEX idx_automations_active ON marketing_automations(active) WHERE active = true;

-- Function to update campaign stats
CREATE OR REPLACE FUNCTION update_campaign_stats()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'sent' AND OLD.status != 'sent' THEN
    UPDATE marketing_campaigns
    SET stats = jsonb_set(
      stats,
      '{sent}',
      to_jsonb(COALESCE((stats->>'sent')::int, 0) + 1)
    )
    WHERE id = NEW.campaign_id;
  ELSIF NEW.status = 'failed' AND OLD.status != 'failed' THEN
    UPDATE marketing_campaigns
    SET stats = jsonb_set(
      stats,
      '{failed}',
      to_jsonb(COALESCE((stats->>'failed')::int, 0) + 1)
    )
    WHERE id = NEW.campaign_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_campaign_stats
AFTER UPDATE ON message_queue
FOR EACH ROW
WHEN (NEW.campaign_id IS NOT NULL AND OLD.status IS DISTINCT FROM NEW.status)
EXECUTE FUNCTION update_campaign_stats();

-- Seed default segments
INSERT INTO marketing_segments (agency_id, name, description, criteria) 
SELECT 
  id,
  'All Active Subscribers',
  'All currently subscribed fans',
  '{"status": "active"}'::jsonb
FROM agencies
ON CONFLICT DO NOTHING;

INSERT INTO marketing_segments (agency_id, name, description, criteria) 
SELECT 
  id,
  'Expired Subscribers',
  'Fans whose subscription has expired',
  '{"status": "expired"}'::jsonb
FROM agencies
ON CONFLICT DO NOTHING;

INSERT INTO marketing_segments (agency_id, name, description, criteria) 
SELECT 
  id,
  'High Spenders ($500+)',
  'Fans who have spent $500 or more',
  '{"total_spend_min": 500}'::jsonb
FROM agencies
ON CONFLICT DO NOTHING;

INSERT INTO marketing_segments (agency_id, name, description, criteria) 
SELECT 
  id,
  'Inactive (30+ days)',
  'Fans with no activity in the last 30 days',
  '{"days_since_last_activity_min": 30}'::jsonb
FROM agencies
ON CONFLICT DO NOTHING;
