# QA Changelog

Changes applied during the full QA audit (2026-03-04).

---

## 🔴 Security

### API Auth Guards
**All 10 API routes** now require an authenticated user session via `getUser()`. Unauthenticated requests receive a `401 Unauthorized` response.

| File | Change |
|------|--------|
| `src/utils/supabase/auth-guard.ts` | **[NEW]** Reusable `requireAuth()` utility |
| `src/app/api/phase0/route.ts` | Added `requireAuth()` guard |
| `src/app/api/phase1/route.ts` | Added `requireAuth()` guard |
| `src/app/api/phase2/route.ts` | Added `requireAuth()` guard |
| `src/app/api/phase2/detail/route.ts` | Added `requireAuth()` guard |
| `src/app/api/phase3/route.ts` | Added `requireAuth()` guard |
| `src/app/api/phase4/route.ts` | Added `requireAuth()` guard |
| `src/app/api/phase4/analyze/route.ts` | Added `requireAuth()` guard |
| `src/app/api/phase4/sprint-health-detail/route.ts` | Added `requireAuth()` guard |
| `src/app/api/phase5/route.ts` | Added `requireAuth()` guard |
| `src/app/api/incidents/route.ts` | Added `requireAuth()` guard |

> `jira-sync/route.ts` was skipped — it already has a `SYNC_SECRET` bearer token check.

### Database RLS
**12 tables** with missing Row Level Security policies were secured.

| File | Change |
|------|--------|
| `supabase/migrations/12_enable_rls_missing_tables.sql` | **[NEW]** Enables RLS + adds read-only policies for authenticated users and full-access for `service_role` on all 12 tables |

Tables affected: `phase4_overview_snapshot`, `phase4_sprint_health_snapshot`, `phase4_contributors_snapshot`, `phase4_drilldown_requests`, `phase4_drilldown_results`, `jira_sprints`, `jira_sprint_issues`, `bwi_health_latest`, `bwi_metrics_snapshot`, `bwi_rollups_latest`, `project_health_latest`, `project_metrics_snapshot`, `project_rollups_latest`.

---

## 🟡 Frontend

### Typography
| File | Change |
|------|--------|
| `src/app/layout.tsx` | Replaced `Geist`/`Geist_Mono` fonts with **Inter** from Google Fonts. Fixed metadata from "Create Next App" to "SDLC Central Hub". |
| `src/app/globals.css` | Removed `font-family: Arial` body override. Updated `--font-sans` to `var(--font-inter)`. Added semantic color tokens, chart palette CSS vars, and `.custom-scrollbar` utility. |

### Font Size Normalization (57 total replacements)
| Pattern | Replacement | Files affected |
|---------|-------------|----------------|
| `text-[14px]` | `text-sm` | 4 files (sidebar, dashboard-card, cto-dashboard) |
| `text-[12px]` | `text-xs` | 10 files (dashboard-card, alert-card, initiatives, projects, bwis, overview-tab, cto-dashboard, sidebar) |
| `text-[11px]` | `text-xs` | 26 files (phase1–5 tabs, modals, charts, login, home, shared components) |

### Data Accuracy (Phase 4 — Row 5)
| File | Change |
|------|--------|
| `src/lib/server/phase4.ts` | Added `dev_pr_count`, `dev_open_pr_count`, `dev_merged_pr_count`, `dev_last_updated` to ISSUE_COLS query. Added corresponding fields to `RawRow` type and `Phase4Issue` interface. Switched Sprint-to-Solve and PR Metrics computations from global snapshot to live workstream-aware calculations. |

---

## 🟢 Performance

### Database Indexes
| File | Change |
|------|--------|
| `supabase/migrations/13_add_missing_indexes.sql` | **[NEW]** Adds 11 indexes on high-traffic columns: `jira_issues(workstream, issue_type, status_category)`, `jira_issues(assignee_account_id)`, `jira_sprint_issues(sprint_id)`, `jira_sprint_issues(jira_issue_id)`, snapshot date columns, `jira_sprints(sprint_label, workstream_code)`. |

---

## Breaking Changes

- **None**. All changes are additive or corrective.
- The RLS migration must be applied to Supabase for data access to continue working. Run the SQL files via the Supabase dashboard or migration tool.
