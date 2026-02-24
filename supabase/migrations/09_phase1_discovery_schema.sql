-- =========================================================
-- Phase 1 - SEPMO Data Schema
-- =========================================================

-- 1. SEPMO Tickets Setup
CREATE TABLE IF NOT EXISTS public.sepmo_tickets (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    jira_key TEXT NOT NULL UNIQUE,
    summary TEXT,
    status TEXT,
    status_category TEXT,
    workstream TEXT,
    team TEXT,
    ticket_type TEXT, -- e.g. 'Discovery', 'Maintenance (RTB)'
    reporter_display_name TEXT,
    reporter_avatar_url TEXT,
    reporter_account_id TEXT,
    assignee_account_id TEXT,
    assignee_display_name TEXT,
    assignee_avatar_url TEXT,
    roi_score NUMERIC,
    status_durations JSONB,
    lead_time_seconds INT,
    linked_work_items JSONB,
    linked_work_item_count INT,
    linked_work_item_keys JSONB,
    created_at TIMESTAMPTZ NOT NULL,
    completed_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Rename bpi_sync_log to sync_log
ALTER TABLE IF EXISTS public.bpi_sync_log RENAME TO sync_log;

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_sepmo_tickets_status ON public.sepmo_tickets(status);
CREATE INDEX IF NOT EXISTS idx_sepmo_tickets_type ON public.sepmo_tickets(ticket_type);
CREATE INDEX IF NOT EXISTS idx_sepmo_tickets_workstream ON public.sepmo_tickets(workstream);
CREATE INDEX IF NOT EXISTS idx_sepmo_tickets_created ON public.sepmo_tickets(created_at);

-- RLS
ALTER TABLE public.sepmo_tickets ENABLE ROW LEVEL SECURITY;

-- Authenticated read policies
CREATE POLICY "Allow authenticated read" ON public.sepmo_tickets FOR SELECT USING (auth.uid() IS NOT NULL);

-- Service role full access (for sync API)
CREATE POLICY "Allow service role full access" ON public.sepmo_tickets FOR ALL USING (auth.role() = 'service_role');

-- Re-apply policies for sync_log to have cleanly scoped names:
DROP POLICY IF EXISTS "Allow authenticated read" ON public.sync_log;
DROP POLICY IF EXISTS "Allow service role full access" ON public.sync_log;
CREATE POLICY "Allow authenticated read" ON public.sync_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow service role full access" ON public.sync_log FOR ALL USING (auth.role() = 'service_role');

-- =========================================================
-- Phase 1 - Dummy Seed Data (SEPMO)
-- =========================================================

-- Seed Sync Log (Now using sync_log)
INSERT INTO public.sync_log (synced_at, tickets_synced, status) 
VALUES (NOW(), 35, 'success');

-- Seed Tickets
-- Statuses: 'Needs more information' (Waiting for triage), 'Discovery', 'Internal audit' (Definition Gate), 'Backlog', 'Done'
-- Types: 'Discovery', 'Maintenance (RTB)'

INSERT INTO public.sepmo_tickets (jira_key, summary, status, status_category, workstream, team, ticket_type, reporter_display_name, roi_score, linked_work_items, linked_work_item_count, created_at)
VALUES 
    -- Waiting for triage 
    ('BPI-101', 'Set up initial Discovery instance', 'Waiting for triage', 'To Do', 'MAPS', 'Platform', 'Discovery', 'John Doe', 75, null, 0, NOW() - INTERVAL '5 days'),
    ('BPI-102', 'Investigate new auth provider', 'Needs more info', 'To Do', 'EG', 'Identity', 'Discovery', 'Alice Smith', 80, null, 0, NOW() - INTERVAL '4 days'),
    ('BPI-103', 'Fix memory leak', 'Waiting for triage', 'To Do', 'PCE', 'Core', 'Maintenance (RTB)', 'Bob Jones', 45, null, 0, NOW() - INTERVAL '2 days'),
    
    -- In Discovery
    ('BPI-104', 'Evaluate cloud transition', 'Discovery', 'In Progress', 'MAPS', 'Infra', 'Discovery', 'John Doe', 92, null, 0, NOW() - INTERVAL '10 days'),
    ('BPI-105', 'Security posture review', 'In Progress', 'In Progress', 'EG', 'Security', 'Discovery', 'Alice Smith', 88, null, 0, NOW() - INTERVAL '12 days'),
    
    -- Definition Gate
    ('BPI-106', 'Database sharding plan', 'Definition Gate', 'In Progress', 'PCE', 'Data', 'Discovery', 'Bob Jones', 70, null, 0, NOW() - INTERVAL '15 days'),
    ('BPI-107', 'Compliance audit prep', 'Definition Gate', 'In Progress', 'MAPS', 'Compliance', 'Maintenance (RTB)', 'John Doe', 60, null, 0, NOW() - INTERVAL '7 days'),

    -- Completed Setup
    ('BPI-110', 'Done setup', 'Done', 'Done', 'MAPS', 'Infra', 'Discovery', 'Alice Smith', 95, null, 0, NOW() - INTERVAL '20 days'),

    -- Backlog items (Moved to Workstream Backlog)
    ('BPI-108', 'Payment GW Integration', 'Moved to Workstream Backlog', 'Done', 'EG', 'Payments', 'Discovery', 'Bob Jones', 85, '[{"key": "WMAPS-3297", "status": "Open", "issue_type": "Maintenance (RTB)"}]'::jsonb, 1, NOW() - INTERVAL '20 days'),
    ('BPI-109', 'Old API retirement', 'Moved to Workstream Backlog', 'Done', 'PCE', 'Platform', 'Maintenance (RTB)', 'John Doe', 50, '[{"key": "WMAPS-3298", "status": "Done", "issue_type": "Project"}]'::jsonb, 1, NOW() - INTERVAL '25 days');

