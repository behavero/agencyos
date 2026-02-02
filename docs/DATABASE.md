# Database Documentation

## Overview

OnyxOS uses Supabase (PostgreSQL) with Row Level Security (RLS) for multi-tenant data isolation.

---

## Tables Reference

### Core

| Table      | Description                        | RLS |
| ---------- | ---------------------------------- | --- |
| `agencies` | Top-level organization             | ✅  |
| `profiles` | User accounts linked to auth.users | ✅  |
| `models`   | Content creator profiles           | ✅  |

### Financial

| Table               | Description             | RLS |
| ------------------- | ----------------------- | --- |
| `expenses`          | Agency expense records  | ✅  |
| `revenue_snapshots` | Daily revenue captures  | ✅  |
| `payout_settings`   | Staff pay configuration | ✅  |
| `payout_runs`       | Payroll batch runs      | ✅  |

### Operations

| Table               | Description                         | RLS |
| ------------------- | ----------------------------------- | --- |
| `shifts`            | Scheduled work shifts               | ✅  |
| `timesheets`        | Clock in/out records                | ✅  |
| `model_assignments` | Which users can access which models | ✅  |

### Content

| Table            | Description            | RLS |
| ---------------- | ---------------------- | --- |
| `content_tasks`  | Content calendar items | ✅  |
| `content_assets` | Vault media files      | ✅  |
| `bio_pages`      | Link-in-bio pages      | ✅  |
| `bio_blocks`     | Bio page components    | ✅  |

### Gamification

| Table    | Description             | RLS |
| -------- | ----------------------- | --- |
| `quests` | Task/achievement system | ✅  |

### Academy

| Table            | Description            | RLS |
| ---------------- | ---------------------- | --- |
| `invitations`    | Magic link invites     | ✅  |
| `knowledge_base` | Wiki/Playbook articles | ✅  |
| `chat_scripts`   | Sales script templates | ✅  |

### Social & Tracking

| Table                | Description                | RLS |
| -------------------- | -------------------------- | --- |
| `social_connections` | OAuth tokens for platforms | ✅  |
| `social_stats`       | Fetched social metrics     | ✅  |
| `watched_accounts`   | Ghost tracker targets      | ✅  |
| `tracking_events`    | Link click analytics       | ✅  |

---

## Common Patterns

### Multi-Tenancy

Every table includes `agency_id`:

```sql
CREATE TABLE example (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  agency_id UUID REFERENCES agencies(id) ON DELETE CASCADE NOT NULL,
  -- ... other fields
);
```

### Row Level Security

Standard RLS pattern:

```sql
ALTER TABLE example ENABLE ROW LEVEL SECURITY;

-- Select: Users can only see their agency's data
CREATE POLICY "Agency members can view" ON example
  FOR SELECT
  USING (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));

-- Insert/Update/Delete: Restrict by role
CREATE POLICY "Owners can manage" ON example
  FOR ALL
  USING (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()))
  WITH CHECK (agency_id = (SELECT agency_id FROM profiles WHERE id = auth.uid()));
```

### Timestamps

Include created/updated timestamps:

```sql
created_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL,
updated_at TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
```

---

## Migrations

### Naming Convention

```
YYYYMMDD_description.sql
```

Example: `20260202_add_academy_system.sql`

### Location

```
supabase/migrations/
```

### Applying Migrations

**Local:**

```bash
supabase db push
```

**Production:**

```bash
supabase db push --linked
```

---

## Indexes

Recommended indexes for common queries:

```sql
-- Fast lookup by agency
CREATE INDEX idx_profiles_agency ON profiles(agency_id);
CREATE INDEX idx_models_agency ON models(agency_id);

-- Fast lookup by user
CREATE INDEX idx_shifts_employee ON shifts(employee_id);
CREATE INDEX idx_timesheets_employee ON timesheets(employee_id);

-- Content calendar queries
CREATE INDEX idx_content_tasks_scheduled ON content_tasks(scheduled_at);
CREATE INDEX idx_content_tasks_status ON content_tasks(status);
```

---

## Backups

Supabase handles automatic backups. For manual exports:

```bash
supabase db dump > backup_$(date +%Y%m%d).sql
```
