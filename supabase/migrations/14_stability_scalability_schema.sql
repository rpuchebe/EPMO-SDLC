-- Create stability_deliverable_updates table
CREATE TABLE IF NOT EXISTS public.stability_deliverable_updates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    initiative_jira_issue_id TEXT NOT NULL,
    initiative_key TEXT NOT NULL,
    reported_progress_pct INTEGER CHECK (reported_progress_pct >= 0 AND reported_progress_pct <= 100),
    note TEXT,
    week_of DATE NOT NULL,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for stability_deliverable_updates
CREATE INDEX IF NOT EXISTS idx_stability_deliverable_jira_week ON public.stability_deliverable_updates (initiative_jira_issue_id, week_of DESC);
CREATE INDEX IF NOT EXISTS idx_stability_deliverable_week ON public.stability_deliverable_updates (week_of DESC);

-- Create stability_weekly_update table
CREATE TABLE IF NOT EXISTS public.stability_weekly_update (
    week_of DATE PRIMARY KEY,
    headline_progress_pct INTEGER CHECK (headline_progress_pct >= 0 AND headline_progress_pct <= 100),
    highlights TEXT,
    progress TEXT,
    risks TEXT,
    next_steps TEXT,
    created_by TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for stability_weekly_update
CREATE INDEX IF NOT EXISTS idx_stability_weekly_week ON public.stability_weekly_update (week_of DESC);

-- Enable RLS
ALTER TABLE public.stability_deliverable_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stability_weekly_update ENABLE ROW LEVEL SECURITY;

-- Policies for stability_deliverable_updates
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read access' AND tablename = 'stability_deliverable_updates') THEN
        CREATE POLICY "Allow authenticated read access" ON public.stability_deliverable_updates FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can perform all actions' AND tablename = 'stability_deliverable_updates') THEN
        CREATE POLICY "Admins can perform all actions" ON public.stability_deliverable_updates FOR ALL TO authenticated 
        USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));
    END IF;
END $$;

-- Policies for stability_weekly_update
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Allow authenticated read access' AND tablename = 'stability_weekly_update') THEN
        CREATE POLICY "Allow authenticated read access" ON public.stability_weekly_update FOR SELECT TO authenticated USING (true);
    END IF;

    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can perform all actions' AND tablename = 'stability_weekly_update') THEN
        CREATE POLICY "Admins can perform all actions" ON public.stability_weekly_update FOR ALL TO authenticated 
        USING (EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'Admin'));
    END IF;
END $$;

-- Add labels column to jira_issues if missing
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'jira_issues' AND column_name = 'labels') THEN
        ALTER TABLE public.jira_issues ADD COLUMN labels TEXT[];
    END IF;
END $$;
