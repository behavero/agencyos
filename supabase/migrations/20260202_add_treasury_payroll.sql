-- PHASE 38: THE TREASURY (HYBRID PAYROLL ENGINE)
-- Migration: Add payroll system tables

-- Table: payout_settings
-- Stores pay configuration for each staff member
CREATE TABLE IF NOT EXISTS payout_settings (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  
  -- Pay Configuration
  currency TEXT DEFAULT 'USD' CHECK (currency IN ('USD', 'EUR', 'GBP', 'RON')),
  pay_model TEXT DEFAULT 'hourly' CHECK (pay_model IN ('hourly', 'commission', 'hybrid')),
  hourly_rate NUMERIC(10, 2) DEFAULT 0.00,
  commission_percent NUMERIC(5, 4) DEFAULT 0.00, -- e.g., 0.1000 = 10%
  
  -- Payment Details
  payment_method TEXT, -- e.g., "Wise", "Bank Transfer", "PayPal"
  payment_details JSONB, -- e.g., {"email": "user@wise.com", "iban": "..."}
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  
  -- Constraint: One setting per profile
  UNIQUE(profile_id)
);

-- Table: payout_runs
-- Stores historical payroll run records
CREATE TABLE IF NOT EXISTS payout_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  
  -- Period
  period_start DATE NOT NULL,
  period_end DATE NOT NULL,
  
  -- Financials
  total_payout NUMERIC(12, 2) DEFAULT 0.00,
  currency TEXT DEFAULT 'USD',
  
  -- Status
  status TEXT DEFAULT 'draft' CHECK (status IN ('draft', 'finalized', 'paid')),
  
  -- Details (JSONB snapshot of calculations)
  details JSONB, -- { "payouts": [{ "profile_id": "...", "name": "Sarah", "hours": 40, "sales": 5000, "total": 650 }] }
  
  -- Metadata
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  finalized_at TIMESTAMP WITH TIME ZONE,
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Table: individual_payouts
-- Stores individual paycheck records per person per run
CREATE TABLE IF NOT EXISTS individual_payouts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  payout_run_id UUID REFERENCES payout_runs(id) ON DELETE CASCADE NOT NULL,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  
  -- Breakdown
  hours_worked NUMERIC(8, 2) DEFAULT 0.00,
  hourly_pay NUMERIC(10, 2) DEFAULT 0.00,
  sales_generated NUMERIC(12, 2) DEFAULT 0.00,
  commission_pay NUMERIC(10, 2) DEFAULT 0.00,
  bonus NUMERIC(10, 2) DEFAULT 0.00,
  deductions NUMERIC(10, 2) DEFAULT 0.00,
  
  -- Total
  total_payout NUMERIC(10, 2) NOT NULL,
  currency TEXT DEFAULT 'USD',
  
  -- Payment
  payment_method TEXT,
  payment_details JSONB,
  payment_reference TEXT, -- e.g., Transaction ID from Wise
  
  -- Status
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'paid', 'failed')),
  
  -- Metadata
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()),
  paid_at TIMESTAMP WITH TIME ZONE
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_payout_settings_profile ON payout_settings(profile_id);
CREATE INDEX IF NOT EXISTS idx_payout_settings_agency ON payout_settings(agency_id);
CREATE INDEX IF NOT EXISTS idx_payout_runs_agency ON payout_runs(agency_id);
CREATE INDEX IF NOT EXISTS idx_payout_runs_period ON payout_runs(period_start, period_end);
CREATE INDEX IF NOT EXISTS idx_individual_payouts_run ON individual_payouts(payout_run_id);
CREATE INDEX IF NOT EXISTS idx_individual_payouts_profile ON individual_payouts(profile_id);

-- RLS Policies
ALTER TABLE payout_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE payout_runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE individual_payouts ENABLE ROW LEVEL SECURITY;

-- Policy: Users can view their own payout settings
CREATE POLICY "Users can view own payout settings"
  ON payout_settings FOR SELECT
  USING (
    profile_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = payout_settings.agency_id
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Policy: Admins can manage payout settings
CREATE POLICY "Admins can manage payout settings"
  ON payout_settings FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = payout_settings.agency_id
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Policy: Admins can view/manage payout runs
CREATE POLICY "Admins can manage payout runs"
  ON payout_runs FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = payout_runs.agency_id
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Policy: Users can view their own payouts
CREATE POLICY "Users can view own payouts"
  ON individual_payouts FOR SELECT
  USING (
    profile_id = auth.uid()
    OR
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = individual_payouts.agency_id
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Policy: Admins can manage individual payouts
CREATE POLICY "Admins can manage individual payouts"
  ON individual_payouts FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.agency_id = individual_payouts.agency_id
      AND profiles.role IN ('owner', 'admin')
    )
  );

-- Function: Update updated_at timestamp
CREATE OR REPLACE FUNCTION update_payout_settings_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = timezone('utc'::text, now());
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_payout_settings_updated_at
  BEFORE UPDATE ON payout_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_payout_settings_updated_at();

-- Comments
COMMENT ON TABLE payout_settings IS 'Pay configuration for staff members (hourly, commission, hybrid)';
COMMENT ON TABLE payout_runs IS 'Historical payroll run records';
COMMENT ON TABLE individual_payouts IS 'Individual paycheck records per person per run';
