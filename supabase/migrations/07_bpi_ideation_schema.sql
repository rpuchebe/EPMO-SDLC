-- =========================================================
-- Phase 0 – BPI Ideation Schema
-- =========================================================

-- 1. Tickets cache
CREATE TABLE IF NOT EXISTS public.bpi_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  jira_key TEXT NOT NULL UNIQUE,
  summary TEXT,
  status TEXT,
  status_category TEXT,          -- 'To Do', 'In Progress', 'Done'
  workstream TEXT,
  assignee_account_id TEXT,
  assignee_display_name TEXT,
  assignee_avatar_url TEXT,
  roi_score NUMERIC,
  created_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Status transition history (for time-in-status)
CREATE TABLE IF NOT EXISTS public.bpi_status_history (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  ticket_id UUID REFERENCES public.bpi_tickets(id) ON DELETE CASCADE,
  jira_key TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  transitioned_at TIMESTAMPTZ NOT NULL
);

-- 3. Pre-aggregated daily counts (for timeline chart)
CREATE TABLE IF NOT EXISTS public.bpi_daily_counts (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  count_date DATE NOT NULL,
  workstream TEXT,
  ticket_count INT DEFAULT 0,
  UNIQUE (count_date, workstream)
);

-- 4. Sync log
CREATE TABLE IF NOT EXISTS public.bpi_sync_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  synced_at TIMESTAMPTZ DEFAULT NOW(),
  tickets_synced INT DEFAULT 0,
  status TEXT DEFAULT 'success'
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_bpi_tickets_status ON public.bpi_tickets(status);
CREATE INDEX IF NOT EXISTS idx_bpi_tickets_workstream ON public.bpi_tickets(workstream);
CREATE INDEX IF NOT EXISTS idx_bpi_tickets_created ON public.bpi_tickets(created_at);
CREATE INDEX IF NOT EXISTS idx_bpi_status_history_ticket ON public.bpi_status_history(ticket_id);
CREATE INDEX IF NOT EXISTS idx_bpi_daily_counts_date ON public.bpi_daily_counts(count_date);

-- RLS
ALTER TABLE public.bpi_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpi_status_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpi_daily_counts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bpi_sync_log ENABLE ROW LEVEL SECURITY;

-- Authenticated read policies
CREATE POLICY "Allow authenticated read" ON public.bpi_tickets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.bpi_status_history FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.bpi_daily_counts FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.bpi_sync_log FOR SELECT USING (auth.uid() IS NOT NULL);

-- Service role full access (for sync API)
CREATE POLICY "Allow service role full access" ON public.bpi_tickets FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON public.bpi_status_history FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON public.bpi_daily_counts FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service role full access" ON public.bpi_sync_log FOR ALL USING (auth.role() = 'service_role');
