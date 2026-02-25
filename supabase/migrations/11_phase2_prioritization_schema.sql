-- =========================================================
-- Phase 2 - Prioritization Schema
-- =========================================================

-- 1. Phase 2 Sync Log
CREATE TABLE IF NOT EXISTS public.phase2_sync_log (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    synced_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    status TEXT
);

-- 2. Phase 2 Initiatives
CREATE TABLE IF NOT EXISTS public.phase2_initiatives (
    key TEXT PRIMARY KEY,
    summary TEXT,
    status TEXT,
    workstream TEXT,
    investment_category TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
        
    -- Computed Governance Fields
    children_count INT DEFAULT 0,
    open_children_count INT DEFAULT 0,
    completion_ratio NUMERIC DEFAULT 0.0,
    has_warning BOOLEAN DEFAULT false,
    warning_types TEXT[] DEFAULT '{}',
    wrong_status BOOLEAN DEFAULT false,
    wrong_status_reason TEXT
);

-- 3. Phase 2 Projects
CREATE TABLE IF NOT EXISTS public.phase2_projects (
    key TEXT PRIMARY KEY,
    summary TEXT,
    status TEXT,
    workstream TEXT,
    parent_initiative_key TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
        
    -- Computed Governance Fields
    children_count INT DEFAULT 0,
    open_children_count INT DEFAULT 0,
    completion_ratio NUMERIC DEFAULT 0.0,
    has_warning BOOLEAN DEFAULT false,
    warning_types TEXT[] DEFAULT '{}',
    wrong_status BOOLEAN DEFAULT false,
    wrong_status_reason TEXT
);

-- 4. Phase 2 Business Work Items (BWI)
CREATE TABLE IF NOT EXISTS public.phase2_bwi (
    key TEXT PRIMARY KEY,
    summary TEXT,
    issue_type TEXT, -- 'New Feature', 'Enhancement', 'Issue'
    status TEXT,
    workstream TEXT,
    parent_project_key TEXT,
    created_at TIMESTAMPTZ,
    updated_at TIMESTAMPTZ,
        
    -- Computed Governance Fields
    children_count INT DEFAULT 0,
    open_children_count INT DEFAULT 0,
    completion_ratio NUMERIC DEFAULT 0.0,
    has_warning BOOLEAN DEFAULT false,
    warning_types TEXT[] DEFAULT '{}',
    wrong_status BOOLEAN DEFAULT false,
    wrong_status_reason TEXT
);

-- 5. Phase 2 Hierarchy Map
CREATE TABLE IF NOT EXISTS public.phase2_hierarchy_map (
    child_key TEXT NOT NULL,
    parent_key TEXT NOT NULL,
    PRIMARY KEY (child_key, parent_key)
);


-- Indexes
CREATE INDEX IF NOT EXISTS idx_p2_init_status ON phase2_initiatives(status);
CREATE INDEX IF NOT EXISTS idx_p2_init_workstream ON phase2_initiatives(workstream);

CREATE INDEX IF NOT EXISTS idx_p2_proj_status ON phase2_projects(status);
CREATE INDEX IF NOT EXISTS idx_p2_proj_workstream ON phase2_projects(workstream);
CREATE INDEX IF NOT EXISTS idx_p2_proj_parent ON phase2_projects(parent_initiative_key);

CREATE INDEX IF NOT EXISTS idx_p2_bwi_status ON phase2_bwi(status);
CREATE INDEX IF NOT EXISTS idx_p2_bwi_type ON phase2_bwi(issue_type);
CREATE INDEX IF NOT EXISTS idx_p2_bwi_workstream ON phase2_bwi(workstream);
CREATE INDEX IF NOT EXISTS idx_p2_bwi_parent ON phase2_bwi(parent_project_key);

-- RLS Setup
ALTER TABLE phase2_sync_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase2_initiatives ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase2_projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase2_bwi ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase2_hierarchy_map ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read phase2_sync_log" ON phase2_sync_log FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read phase2_initiatives" ON phase2_initiatives FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read phase2_projects" ON phase2_projects FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read phase2_bwi" ON phase2_bwi FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read phase2_hierarchy_map" ON phase2_hierarchy_map FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "Allow service_role full access phase2_sync_log" ON phase2_sync_log FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access phase2_initiatives" ON phase2_initiatives FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access phase2_projects" ON phase2_projects FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access phase2_bwi" ON phase2_bwi FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access phase2_hierarchy_map" ON phase2_hierarchy_map FOR ALL USING (auth.role() = 'service_role');

-- Seed Mock Data (so UI is testable immediately)
INSERT INTO phase2_sync_log (synced_at, status) VALUES (NOW(), 'success');

-- Initiatives
INSERT INTO phase2_initiatives (key, summary, status, workstream, investment_category, children_count, open_children_count, warning_types, has_warning, wrong_status, created_at, updated_at) VALUES 
('INIT-1', 'Q1 Roadmap AI', 'In Progress', 'MAPS', 'Strategic', 5, 2, '{}', false, false, NOW() - INTERVAL '30 days', NOW()),
('INIT-2', 'Legacy Migration', 'Done', 'EG', 'Maintenance', 3, 1, '{"ClosedWithOpenChildren"}', true, false, NOW() - INTERVAL '45 days', NOW() - INTERVAL '2 days'),
('INIT-3', 'Cloud Optimization', 'Backlog', 'PCE', NULL, 0, 0, '{"MissingInvestmentCategory"}', true, false, NOW() - INTERVAL '10 days', NOW());

-- Projects
INSERT INTO phase2_projects (key, summary, status, workstream, parent_initiative_key, children_count, open_children_count, warning_types, has_warning, wrong_status, wrong_status_reason, created_at, updated_at) VALUES
('PROJ-1', 'AI Backend', 'In Progress', 'MAPS', 'INIT-1', 10, 5, '{}', false, false, NULL, NOW() - INTERVAL '20 days', NOW()),
('PROJ-2', 'AI Frontend', 'Done', 'MAPS', 'INIT-1', 4, 0, '{}', false, false, NULL, NOW() - INTERVAL '15 days', NOW() - INTERVAL '5 days'),
('PROJ-3', 'Old DB Upgrade', 'In Progress', 'EG', 'INIT-2', 0, 0, '{"NoChildren"}', true, false, NULL, NOW() - INTERVAL '40 days', NOW()),
('PROJ-4', 'Orphaned Project', 'Backlog', 'PCE', 'EPMO-1', 2, 2, '{"MissingParentInit"}', true, false, NULL, NOW() - INTERVAL '5 days', NOW());

-- BWIs
INSERT INTO phase2_bwi (key, summary, issue_type, status, workstream, parent_project_key, children_count, open_children_count, warning_types, has_warning, wrong_status, created_at, updated_at) VALUES
('BWI-1', 'Model Training Pipeline', 'New Feature', 'In Progress', 'MAPS', 'PROJ-1', 3, 2, '{}', false, false, NOW() - INTERVAL '15 days', NOW()),
('BWI-2', 'API Endpoint', 'Enhancement', 'Done', 'MAPS', 'PROJ-1', 2, 1, '{"ClosedWithOpenChildren"}', true, true, NOW() - INTERVAL '10 days', NOW()),
('BWI-3', 'UI Dashboard', 'New Feature', 'In Progress', 'MAPS', 'PROJ-2', 0, 0, '{}', false, false, NOW() - INTERVAL '10 days', NOW()),
('BWI-4', 'Fix Crash on Login', 'Issue', 'Backlog', 'EG', 'PROJ-3', 0, 0, '{}', false, false, NOW() - INTERVAL '5 days', NOW()),
('BWI-5', 'Orphaned BWI', 'New Feature', 'In Progress', 'PCE', 'EPMO-1', 0, 0, '{"MissingParentProject"}', true, false, NOW() - INTERVAL '2 days', NOW());
