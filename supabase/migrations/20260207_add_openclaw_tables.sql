-- OpenClaw Neural Core — Database Tables
-- Migration: 20260207_add_openclaw_tables

-- ============================================================
-- 1. agency_api_keys — Encrypted LLM API key storage
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  provider TEXT NOT NULL,              -- 'openai' | 'anthropic' | 'groq'
  model_preference TEXT,               -- 'gpt-4o' | 'claude-sonnet-4-20250514' | etc.
  encrypted_key TEXT NOT NULL,         -- AES-256-GCM encrypted
  key_prefix TEXT NOT NULL,            -- First 8 chars for display: 'sk-proj-...'
  is_active BOOLEAN DEFAULT true,
  is_valid BOOLEAN DEFAULT true,       -- Set false if key fails validation
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT now(),
  last_used_at TIMESTAMPTZ,
  last_validated_at TIMESTAMPTZ,
  
  UNIQUE(agency_id, provider)
);

-- RLS: Only owner/admin of the agency
ALTER TABLE agency_api_keys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_api_keys_select" ON agency_api_keys
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "agency_api_keys_insert" ON agency_api_keys
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "agency_api_keys_update" ON agency_api_keys
  FOR UPDATE USING (
    agency_id IN (
      SELECT agency_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

CREATE POLICY "agency_api_keys_delete" ON agency_api_keys
  FOR DELETE USING (
    agency_id IN (
      SELECT agency_id FROM profiles
      WHERE id = auth.uid() AND role IN ('owner', 'admin')
    )
  );

-- ============================================================
-- 2. agency_digests — Pre-computed AI context summaries
-- ============================================================
CREATE TABLE IF NOT EXISTS agency_digests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL REFERENCES agencies(id) ON DELETE CASCADE,
  digest_type TEXT NOT NULL DEFAULT 'daily', -- 'daily', 'weekly', 'monthly'
  generated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  
  -- Pre-computed summary (structured JSON, ~800 tokens)
  summary JSONB NOT NULL,
  
  -- Token count estimate for LLM budgeting
  estimated_tokens INTEGER,
  
  UNIQUE(agency_id, digest_type)
);

ALTER TABLE agency_digests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "agency_digests_select" ON agency_digests
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

-- ============================================================
-- 3. openclaw_audit_log — AI usage tracking
-- ============================================================
CREATE TABLE IF NOT EXISTS openclaw_audit_log (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  agency_id UUID NOT NULL,
  user_id UUID NOT NULL,
  action TEXT NOT NULL,                -- 'tool_call', 'chat', 'generate_reply'
  tool_name TEXT,                      -- e.g., 'send_mass_message'
  provider TEXT,                       -- which LLM was used
  model_name TEXT,                     -- which model (gpt-4o, claude-sonnet, etc.)
  input_tokens INTEGER,
  output_tokens INTEGER,
  latency_ms INTEGER,
  success BOOLEAN DEFAULT true,
  error_message TEXT,
  metadata JSONB,                      -- additional context
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE openclaw_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "openclaw_audit_log_select" ON openclaw_audit_log
  FOR SELECT USING (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

CREATE POLICY "openclaw_audit_log_insert" ON openclaw_audit_log
  FOR INSERT WITH CHECK (
    agency_id IN (
      SELECT agency_id FROM profiles WHERE id = auth.uid()
    )
  );

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_agency_api_keys_agency ON agency_api_keys(agency_id);
CREATE INDEX IF NOT EXISTS idx_agency_digests_agency ON agency_digests(agency_id, digest_type);
CREATE INDEX IF NOT EXISTS idx_openclaw_audit_log_agency ON openclaw_audit_log(agency_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_openclaw_audit_log_action ON openclaw_audit_log(action, created_at DESC);
