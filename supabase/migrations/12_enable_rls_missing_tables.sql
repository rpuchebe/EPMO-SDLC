-- =========================================================
-- Enable RLS on tables that were missing it
-- =========================================================

-- Phase 4 tables
ALTER TABLE phase4_overview_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase4_sprint_health_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase4_contributors_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase4_drilldown_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE phase4_drilldown_results ENABLE ROW LEVEL SECURITY;

-- Sprint tables
ALTER TABLE jira_sprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE jira_sprint_issues ENABLE ROW LEVEL SECURITY;

-- Phase 2 snapshot/rollup tables
ALTER TABLE bwi_health_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE bwi_metrics_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE bwi_rollups_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_health_latest ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_metrics_snapshot ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_rollups_latest ENABLE ROW LEVEL SECURITY;

-- ── Read policies for authenticated users ──

CREATE POLICY "Allow authenticated read" ON phase4_overview_snapshot FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON phase4_sprint_health_snapshot FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON phase4_contributors_snapshot FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON phase4_drilldown_requests FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON phase4_drilldown_results FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON jira_sprints FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON jira_sprint_issues FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON bwi_health_latest FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON bwi_metrics_snapshot FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON bwi_rollups_latest FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON project_health_latest FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON project_metrics_snapshot FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON project_rollups_latest FOR SELECT USING (auth.uid() IS NOT NULL);

-- ── Full access for service_role (sync scripts) ──

CREATE POLICY "Allow service_role full access" ON phase4_overview_snapshot FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON phase4_sprint_health_snapshot FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON phase4_contributors_snapshot FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON phase4_drilldown_requests FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON phase4_drilldown_results FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON jira_sprints FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON jira_sprint_issues FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON bwi_health_latest FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON bwi_metrics_snapshot FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON bwi_rollups_latest FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON project_health_latest FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON project_metrics_snapshot FOR ALL USING (auth.role() = 'service_role');
CREATE POLICY "Allow service_role full access" ON project_rollups_latest FOR ALL USING (auth.role() = 'service_role');

-- ── Write policies for drilldown request/results (authenticated users can insert) ──

CREATE POLICY "Allow authenticated insert" ON phase4_drilldown_requests FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated insert" ON phase4_drilldown_results FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);
