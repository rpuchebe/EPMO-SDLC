# Improvements Backlog

Prioritized list of remaining improvements identified during the QA audit. Items are ordered by impact.

---

## 🔴 High Priority

### 1. Split Large File Components
The following files are over 500 lines and would benefit from decomposition:

| File | Lines | Recommendation |
|------|-------|----------------|
| `overview-tab.tsx` | 1,330 | Extract Row 1–5 sections into separate components |
| `phase4.ts` | 1,264 | Extract `computeOverviewKpis`, `mapPrMetrics`, `mapSprintToSolve` into dedicated modules |
| `roadmap-client.tsx` | 885 | Extract roadmap chart, timeline, and filters into sub-components |
| `phase1/route.ts` | 527 | Extract KPI builder and collaborator logic into `lib/server/phase1.ts` |
| `bwis-section.tsx` | 528 | Extract table rows, filter logic, modal into separate files |

### 2. Replace Ad-Hoc Font Sizes
~223 instances of `text-[Npx]` across the codebase. Replace with Tailwind scale classes:

| Current | Replacement |
|---------|-------------|
| `text-[10px]` (102×) | `text-[10px]` → keep (below Tailwind minimum) or use `text-2xs` custom utility |
| `text-[11px]` (73×) | Normalize to `text-xs` (12px) |
| `text-[12px]` (23×) | `text-xs` |
| `text-[14px]` (8×) | `text-sm` |
| `text-[28px]` (3×) | `text-3xl` or custom `text-display` |

### 3. `jira-sync` Route Security
The `jira-sync/route.ts` uses `NEXT_PUBLIC_SUPABASE_ANON_KEY` instead of `SUPABASE_SERVICE_ROLE_KEY`. This means the sync script only has anon-level permissions and relies on RLS policies. It should use the service role key.

### 4. Consistent Modal System
Several phases have their own modal implementations. Standardize all modals to use the shared `Dialog` component from `components/ui/dialog.tsx`.

---

## 🟡 Medium Priority

### 5. Full Responsive Audit
Dashboard layouts have not been tested at mobile (390px) and tablet (768px) widths. Common issues expected:
- Chart containers overflowing
- Tables needing horizontal scroll
- Card grids collapsing poorly
- Filter panels needing mobile drawers

### 6. Missing Data — Metrics with Approximations
| Metric | Status | Data Source |
|--------|--------|-------------|
| **Avg commits per ticket** | Uses global snapshot average | Per-ticket commit count not available in `jira_issues` |
| **WoW trend for Sprint to Solve** | Uses snapshot delta | No historical sprint-count-per-issue tracking |
| **Phase 5 — all data** | 100% mock | No real data source connected |
| **Phase 1 Incidents** | Partially mock | `incidents` API merges real + mock data |
| **Phase 2 Detail** | 100% mock | `phase2/detail/route.ts` returns hardcoded items |

### 7. Loading & Empty States
Not all dashboards have consistent loading indicators or empty state messages when data is unavailable. Standardize:
- Use `RefreshProgressBar` for loading
- Use a shared `EmptyState` component (to be created)

### 8. Memoization
Chart components re-render on every state change. Candidates for `React.memo` or `useMemo`:
- Recharts components in `overview-tab.tsx`
- Large table renders in `bwis-section.tsx`, `projects-section.tsx`
- Sparkline data in `DashboardCard`

---

## 🟢 Low Priority

### 9. Test Coverage
No unit or integration tests exist. Start with:
- API route smoke tests (authenticated + unauthenticated calls)
- `computeOverviewKpis` unit tests with fixture data
- `toStatusCategory` mapping coverage

### 10. Accessibility
- Keyboard navigation not tested across dashboards
- Focus ring styles missing on interactive cards
- Color contrast for some badge text combinations may not meet WCAG AA

### 11. Logging Strategy
No centralized logging. Currently `console.error` in API routes. Consider:
- Structured logging (JSON format)
- Error tracking service (Sentry, LogRocket)
- Request timing metrics

### 12. TypeScript Strictness
- Several `any` types in `phase4.ts` (sprintRaw, snapshot parsing)
- Missing DTO types for API responses
- `as unknown as T` casts in `safeQuery` helpers

### 13. Root Cleanup
Delete scratch files from project root (already in `.gitignore`):
`test-bwi.js`, `test-bwi2.js`, `test-bwi-prod.js`, `test-network.js`, `test-page.js`, `puppeteer_test.js`, `create-user.js`, `run-insert-user.js`, `run-migration.js`, `seed_update.sql`, `openings.txt`, `closings.txt`, `Decimals .png`
