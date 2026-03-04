-- =========================================================
-- Add missing indexes for common filter columns
-- =========================================================

-- jira_issues: composite index for common dashboard filters
CREATE INDEX IF NOT EXISTS idx_jira_issues_workstream_type_status
    ON jira_issues(workstream, issue_type, status_category);

CREATE INDEX IF NOT EXISTS idx_jira_issues_assignee
    ON jira_issues(assignee_account_id);

CREATE INDEX IF NOT EXISTS idx_jira_issues_status_category
    ON jira_issues(status_category);

-- jira_sprint_issues: lookup by sprint
CREATE INDEX IF NOT EXISTS idx_jira_sprint_issues_sprint_id
    ON jira_sprint_issues(sprint_id);

CREATE INDEX IF NOT EXISTS idx_jira_sprint_issues_issue_id
    ON jira_sprint_issues(jira_issue_id);

-- phase4 snapshots: lookup by date + period
CREATE INDEX IF NOT EXISTS idx_p4_overview_snap_date
    ON phase4_overview_snapshot(snapshot_date, period);

CREATE INDEX IF NOT EXISTS idx_p4_contributors_snap_date
    ON phase4_contributors_snapshot(snapshot_date, period);

CREATE INDEX IF NOT EXISTS idx_p4_sprint_health_snap_date
    ON phase4_sprint_health_snapshot(snapshot_date);

-- jira_sprints: lookup by sprint_label
CREATE INDEX IF NOT EXISTS idx_jira_sprints_label
    ON jira_sprints(sprint_label);

CREATE INDEX IF NOT EXISTS idx_jira_sprints_workstream
    ON jira_sprints(workstream_code);
