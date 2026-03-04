/**
 * Server-side data fetching for Phase 4: Development & Testing.
 *
 * Data priority (highest → lowest):
 *  1. phase4_overview_snapshot (today)       – pre-computed KPIs, charts, PR metrics
 *  2. phase4_sprint_health_snapshot (today)  – per-sprint breakdown
 *  3. phase4_contributors_snapshot (today)   – per-person contributor metrics
 *  4. jira_issues                            – raw tickets (always fetched for modals)
 *
 * Snapshot fallback: if no snapshot row exists for today every metric falls
 * back to a value computed live from jira_issues so the UI never crashes.
 *
 * Header-filter behaviour:
 *  - jira_issues:                  filtered by workstream name
 *  - phase4_overview_snapshot:     global only (no per-workstream snapshot yet)
 *  - phase4_sprint_health_snapshot: global (workstream_code filter TODO)
 *  - phase4_contributors_snapshot:  global (workstream_code filter TODO)
 *
 * Trend windows (always computed from jira_issues):
 *  - WoW: current 7-day window vs prior 7-day window  (updated_at_jira / created_at_jira)
 *  - MoM: current 30-day window vs prior 30-day window (same proxy)
 */

import { createServiceClient } from '@/utils/supabase/service'

// ─── Constants ────────────────────────────────────────────────────────────────

/** Issue types included in most Overview metrics (dev work). */
export const DEV_TYPES = [
    'Bug', 'Business Task', 'Change', 'Clarification', 'Hot Fix', 'Story', 'Task',
] as const

const EXCLUDED_TYPES_LOWER = new Set([
    'qa-task', 'dev task', 'sub-task', 'subtask', 'sub task',
    'sub issue', 'sub issues',
])

const NAMED_CARD_TYPES_LOWER = new Set(['story', 'bug', 'hot fix', 'task', 'hotfix'])

const DEV_TYPES_LOWER = new Set(DEV_TYPES.map(t => t.toLowerCase()))

// ─── Public types ─────────────────────────────────────────────────────────────

export type StatusCategory = 'To Do' | 'In Progress' | 'Done' | 'Descoped'

export interface Phase4Issue {
    id: string
    key: string
    summary: string
    issueType: string
    statusName: string
    statusCategory: StatusCategory
    startDate: string | null
    dueDate: string | null
    workstream: string | null
    investmentCategory: string | null
    parentId: string | null
    /** When the issue was created in Jira (ISO string). */
    createdAt: string | null
    /**
     * When the issue was last updated in Jira (ISO string).
     * Used as proxy for resolved_at when statusCategory === 'Done'.
     */
    updatedAt: string | null
    /** Raw array of sprints this issue has been part of */
    sprintRaw: any | null
    assigneeAccountId: string | null
    assigneeDisplayName: string | null
    assigneeAvatarUrl: string | null
    storyPoints: number | null
    devPrCount: number | null
    devOpenPrCount: number | null
    devMergedPrCount: number | null
    devLastUpdated: string | null
}

export interface AggItem {
    label: string
    count: number
    pct: number
}

// ─── Overview KPI types ───────────────────────────────────────────────────────

export interface TypeCardKpi {
    /** % of work items that are this type (among DEV_TYPES) */
    pct: number
    total: number
    completedCount: number
    completedPct: number
    /** Avg age to complete (days), using updatedAt-createdAt for Done items */
    avgAgeDays: number | null
    /** WoW delta: done count this week minus done count last week */
    wowDelta: number
    wowPct: number
}

export interface OverviewKpis {
    // ── Completion Rate (A) ──────────────────────────────────────────────────
    completionRate: number           // 0-100 (DEV_TYPES scope)
    workItemsTotal: number
    workItemsDone: number
    completionWoWDelta: number       // throughput change: done count this week vs last
    completionWoWPct: number
    completionMoMDelta: number
    completionMoMPct: number

    // ── In Progress (B) ──────────────────────────────────────────────────────
    inProgressCount: number
    inProgressWoWDelta: number
    inProgressWoWPct: number
    /** Count of DEV issues currently in an active sprint (from snapshot). */
    inActiveSprintCount: number | null
    /** Average number of sprints to resolve a DEV issue (from snapshot). */
    avgSprintsToResolve: number | null
    /** Global average age to complete for DEV_TYPES (days). */
    avgAgeDays: number | null

    // ── Backlog (C) ──────────────────────────────────────────────────────────
    backlogCount: number
    backlogWoWDelta: number
    backlogWoWPct: number
    /** Issues with status_name not matching standard To Do/Open/Backlog patterns */
    notInStandardStatusCount: number
    avgBacklogAgeDays: number | null

    // ── Type cards (D–G) ─────────────────────────────────────────────────────
    stories: TypeCardKpi
    bugsHotfix: TypeCardKpi
    tasks: TypeCardKpi
    other: TypeCardKpi
}

export interface InvestmentMonth {
    monthKey: string       // "2026-01"
    monthLabel: string     // "Jan 2026"
    categories: Record<string, number>
    total: number
}

export interface OverviewStatusRow {
    status: string
    category: StatusCategory
    count: number
}

// ─── Sprint health types ──────────────────────────────────────────────────────

export interface SprintHealthRow {
    sprintLabel: string
    sprintYear: number | null
    sprintNumber: number | null
    sprintState: 'active' | 'closed'   // never 'future' — those are excluded
    issuesNewlyCommitted: number
    issuesCompleted: number
    issuesAdded: number
    issuesCarryover: number
    issuesCarryover2xPlus: number
    pointsNewlyCommitted: number
    pointsCompleted: number
    pointsAdded: number
    pointsCarryover: number
    pointsCarryover2xPlus: number
}

// ─── Contributor types ────────────────────────────────────────────────────────

export interface ContributorRow {
    accountId: string
    displayName: string | null
    avatarUrl: string | null
    role: string
    ticketsCount: number
    ticketsCompleted?: number
    storyPointsTotal: number
    /** Completion percentage, 0-100. */
    completionPct: number
    ticketsWithoutEstimation: number
    workstreamCode: string | null
    storyPointsCompleted?: number
}

// ─── PR metric types ──────────────────────────────────────────────────────────

export interface PrMetrics {
    /** % of tickets with at least one PR attached (0-100). */
    coveragePct: number
    openCount: number
    mergedCount: number
    avgPrsPerTicket: number
    avgCommitsPerTicket: number
    wowDelta: number
    wowPct: number
}

export interface SprintToSolve {
    avgSprints: number
    avgAgeDays: number
    wowDelta: number
    wowPct: number
}

// ─── Full DTO ─────────────────────────────────────────────────────────────────

export interface Phase4DTO {
    issues: Phase4Issue[]
    byType: AggItem[]
    byStatus: AggItem[]
    byInvestment: AggItem[]
    total: number
    totalDone: number
    totalInProgress: number
    totalToDo: number
    completionRate: number   // 0–100 (all issues — backwards compat)
    workstream: string
    team: string
    lastUpdated: string

    // ── Overview fields ───────────────────────────────────────────────────────
    overviewKpis: OverviewKpis
    investmentByMonth: InvestmentMonth[]
    /** DEV_TYPES items that are NOT Done, grouped by issueType (Row 2 donut) */
    notDoneByType: AggItem[]
    /** All distinct status names with category + count (Row 2 status breakdown) */
    allStatuses: OverviewStatusRow[]
    /** Ordered list of all investment categories present in dataset */
    investmentCategories: string[]

    // ── Snapshot-sourced fields ───────────────────────────────────────────────
    sprintHealth: SprintHealthRow[]
    sprintToSolve: SprintToSolve
    prMetrics: PrMetrics
    contributors: ContributorRow[]
}

// ─── Internal snapshot row shapes ─────────────────────────────────────────────

interface OverviewSnapshotRow {
    total_work_items: number | null
    completed_work_items: number | null
    completion_rate: number | null           // may be 0..1 or 0..100
    in_progress_count: number | null
    backlog_count: number | null
    in_active_sprint_count: number | null
    avg_sprints_to_resolve: number | null
    backlog_not_in_open_status_count: number | null
    backlog_avg_age_days: number | null
    stories_pct: number | null
    stories_completed_count: number | null
    stories_completed_pct: number | null
    stories_avg_age_to_complete_days: number | null
    bugs_hotfix_pct: number | null
    bugs_hotfix_completed_count: number | null
    bugs_hotfix_completed_pct: number | null
    bugs_hotfix_avg_age_to_complete_days: number | null
    tasks_pct: number | null
    tasks_completed_count: number | null
    tasks_completed_pct: number | null
    tasks_avg_age_to_complete_days: number | null
    other_pct: number | null
    other_completed_count: number | null
    other_completed_pct: number | null
    other_avg_age_to_complete_days: number | null
    not_completed_by_type: unknown
    status_breakdown_open: unknown
    investment_allocation_monthly: unknown
    pr_coverage_pct: number | null
    pr_open_count: number | null
    pr_merged_count: number | null
    avg_prs_per_ticket: number | null
    avg_commits_per_ticket: number | null
}

interface SprintHealthSnapshotRow {
    sprint_label: string
    sprint_year: number | null
    sprint_number: number | null
    issues_newly_committed: number | null
    issues_completed: number | null
    issues_added: number | null
    issues_carryover: number | null
    issues_carryover_2x_plus: number | null
    points_newly_committed: number | null
    points_completed: number | null
    points_added: number | null
    points_carryover: number | null
    points_carryover_2x_plus: number | null
}

interface ContributorsSnapshotRow {
    workstream_code: string | null
    account_id: string
    display_name: string | null
    avatar_url: string | null
    role: string | null
    tickets_count: number | null
    tickets_completed: number | null
    story_points_total: number | null
    story_points_completed: number | null
    completion_pct: number | null    // may be 0..1 or 0..100
    tickets_without_estimation: number | null
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const ISSUE_COLS = [
    'jira_issue_id',
    'jira_key',
    'summary',
    'issue_type',
    'status_name',
    'status_category',
    'start_date',
    'due_date',
    'workstream',
    'investment_category',
    'parent_jira_issue_id',
    'created_at_jira',
    'updated_at_jira',
    'sprint_raw',
    'assignee_account_id',
    'assignee_display_name',
    'assignee_avatar_url',
    'story_points',
    'dev_pr_count',
    'dev_open_pr_count',
    'dev_merged_pr_count',
    'dev_last_updated',
].join(', ')

type RawRow = {
    jira_issue_id: string
    jira_key: string | null
    summary: string | null
    issue_type: string | null
    status_name: string | null
    status_category: string | null
    start_date: string | null
    due_date: string | null
    workstream: string | null
    investment_category: string | null
    parent_jira_issue_id: string | null
    created_at_jira: string | null
    updated_at_jira: string | null
    sprint_raw: any | null
    assignee_account_id: string | null
    assignee_display_name: string | null
    assignee_avatar_url: string | null
    story_points: number | null
    dev_pr_count: number | null
    dev_open_pr_count: number | null
    dev_merged_pr_count: number | null
    dev_last_updated: string | null
}

function toStatusCategory(raw: string | null): StatusCategory {
    if (!raw) return 'To Do'
    const s = raw.toLowerCase().trim()

    // 1. Done / Complete
    if (s === 'done' || s === 'released to production') return 'Done'

    // 2. Descoped
    if (s === 'descoped') return 'Descoped'

    // 3. In Progress (In Deployment Process, In QA, In progress)
    if (
        s === 'passed qa' || s === 'production ready' || s === 'regression' ||
        s === 'sandbox' || s === 'sandbox ready' ||
        s === 'in qa' || s === 'need approval' ||
        s === 'code review' || s === 'in development' || s === 'in progress'
    ) {
        return 'In Progress'
    }

    // 4. To Do (Blocked, Open)
    if (s === 'blocked' || s === 'open' || s === 'to do' || s === 'reopened') return 'To Do'

    // STRICT Fallbacks for safety if new statuses appear (avoid greedy matches like "done" catching "not done")
    if (s.includes('done') || s.includes('closed') || s.includes('completed')) {
        // Prevent matching false positives if they exist
        return 'Done'
    }

    if (s.includes('progress') || s.includes('review') || s.includes('qa') || s.includes('test')) {
        return 'In Progress'
    }

    return 'To Do'
}

function toPct(n: number, total: number): number {
    return total > 0 ? Math.round((n / total) * 100) : 0
}

function daysDiff(a: string | null, b: string | null): number | null {
    if (!a || !b) return null
    const diff = Math.abs(new Date(b).getTime() - new Date(a).getTime())
    return Math.round(diff / (1000 * 60 * 60 * 24))
}

function avgDays(values: (number | null)[]): number | null {
    const nums = values.filter((v): v is number => v !== null)
    if (nums.length === 0) return null
    return parseFloat((nums.reduce((s, n) => s + n, 0) / nums.length).toFixed(1))
}

function daysAgoISO(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString()
}

function countInWindow(
    issues: Phase4Issue[],
    dateField: 'updatedAt' | 'createdAt',
    from: string,
    to: string,
): number {
    return issues.filter(i => {
        const d = i[dateField]
        return d !== null && d >= from && d < to
    }).length
}

function calcWow(current: number, prev: number): { delta: number; pct: number } {
    const delta = parseFloat((current - prev).toFixed(1))
    const pct = prev > 0 ? parseFloat(((delta / prev) * 100).toFixed(1)) : (current > 0 ? 100 : 0)
    return { delta, pct }
}

function toMonthKey(iso: string | null): string | null {
    if (!iso) return null
    return iso.slice(0, 7)
}

function formatMonthLabel(key: string): string {
    const [y, m] = key.split('-')
    const month = new Date(Number(y), Number(m) - 1).toLocaleString('en-US', { month: 'short' })
    return `${month} ${y}`
}

/**
 * Normalise a percentage that may be stored as a decimal (0..1) or integer (0..100).
 * Returns an integer in the 0-100 range. Returns 0 for null/NaN.
 */
function normalizePct(v: number | null | undefined): number {
    if (v == null || isNaN(v)) return 0
    const val = v <= 1 ? v * 100 : v
    return parseFloat(val.toFixed(1))
}

/** Round a nullable number to 1 decimal place. Returns null for null/undefined. */
function round1(v: number | null | undefined): number | null {
    if (v == null || isNaN(v)) return null
    return parseFloat(v.toFixed(1))
}

// ─── KPI builders (from jira_issues) ──────────────────────────────────────────

function buildTypeCardKpi(
    devIssues: Phase4Issue[],
    devTotal: number,
    typePredicate: (t: string) => boolean,
    w1Start: string,
    now: string,
    w2Start: string,
): TypeCardKpi {
    const typeIssues = devIssues.filter(i => typePredicate(i.issueType))
    const done = typeIssues.filter(i => i.statusCategory === 'Done' || i.statusCategory === 'Descoped')

    const thisWeekDone = done.filter(i => i.updatedAt !== null && i.updatedAt >= w1Start && i.updatedAt < now).length
    const prevWeekDone = done.filter(i => i.updatedAt !== null && i.updatedAt >= w2Start && i.updatedAt < w1Start).length
    const { delta, pct } = calcWow(thisWeekDone, prevWeekDone)

    return {
        pct: toPct(typeIssues.length, devTotal),
        total: typeIssues.length,
        completedCount: done.length,
        completedPct: toPct(done.length, typeIssues.length),
        avgAgeDays: avgDays(done.map(i => daysDiff(i.createdAt, i.updatedAt ?? i.dueDate))),
        wowDelta: delta,
        wowPct: pct,
    }
}

function computeOverviewKpis(issues: Phase4Issue[]): OverviewKpis {
    const now = new Date().toISOString()
    const w1Start = daysAgoISO(7)
    const w2Start = daysAgoISO(14)
    const m1Start = daysAgoISO(30)
    const m2Start = daysAgoISO(60)

    const devIssues = issues.filter(i => DEV_TYPES_LOWER.has(i.issueType.toLowerCase()))
    const devTotal = devIssues.length

    // 'Complete' means Done + Descoped according to user rules
    const doneDev = devIssues.filter(i => i.statusCategory === 'Done' || i.statusCategory === 'Descoped')
    const inProgressDev = devIssues.filter(i => i.statusCategory === 'In Progress')
    const todoDev = devIssues.filter(i => i.statusCategory === 'To Do')

    const completionRate = toPct(doneDev.length, devTotal)

    const { delta: completionWoWDelta, pct: completionWoWPct } = calcWow(
        countInWindow(doneDev, 'updatedAt', w1Start, now),
        countInWindow(doneDev, 'updatedAt', w2Start, w1Start),
    )
    const { delta: completionMoMDelta, pct: completionMoMPct } = calcWow(
        countInWindow(doneDev, 'updatedAt', m1Start, now),
        countInWindow(doneDev, 'updatedAt', m2Start, m1Start),
    )

    const { delta: ipWoWDelta, pct: ipWoWPct } = calcWow(
        countInWindow(inProgressDev, 'updatedAt', w1Start, now),
        countInWindow(inProgressDev, 'updatedAt', w2Start, w1Start),
    )

    const { delta: todoWoWDelta, pct: todoWoWPct } = calcWow(
        countInWindow(todoDev, 'createdAt', w1Start, now),
        countInWindow(todoDev, 'createdAt', w2Start, w1Start),
    )

    const notInStandardStatusCount = todoDev.filter(i => {
        const s = i.statusName.toLowerCase()
        return s !== 'to do' && s !== 'open' && s !== 'backlog' && s !== ''
    }).length

    const avgBacklogAgeDays = avgDays(todoDev.map(i => daysDiff(i.createdAt, now)))

    const stories = buildTypeCardKpi(devIssues, devTotal, t => t.toLowerCase() === 'story', w1Start, now, w2Start)
    const bugsHotfix = buildTypeCardKpi(devIssues, devTotal, t => {
        const tl = t.toLowerCase()
        return tl === 'bug' || tl === 'hot fix' || tl === 'hotfix'
    }, w1Start, now, w2Start)
    const tasks = buildTypeCardKpi(devIssues, devTotal, t => t.toLowerCase() === 'task', w1Start, now, w2Start)

    const otherIssues = devIssues.filter(i => !NAMED_CARD_TYPES_LOWER.has(i.issueType.toLowerCase()))
    const otherDenominator = devTotal
    const otherDone = otherIssues.filter(i => i.statusCategory === 'Done' || i.statusCategory === 'Descoped')
    const { delta: otherWoWDelta, pct: otherWoWPct } = calcWow(
        otherDone.filter(i => i.updatedAt !== null && i.updatedAt >= w1Start && i.updatedAt < now).length,
        otherDone.filter(i => i.updatedAt !== null && i.updatedAt >= w2Start && i.updatedAt < w1Start).length,
    )
    const other: TypeCardKpi = {
        pct: toPct(otherIssues.length, otherDenominator),
        total: otherIssues.length,
        completedCount: otherDone.length,
        completedPct: toPct(otherDone.length, otherIssues.length),
        avgAgeDays: avgDays(otherDone.map(i => daysDiff(i.createdAt, i.updatedAt ?? i.dueDate))),
        wowDelta: otherWoWDelta,
        wowPct: otherWoWPct,
    }

    const avgAgeDays = avgDays(doneDev.map(i => daysDiff(i.createdAt, i.updatedAt ?? i.dueDate)))

    return {
        completionRate,
        workItemsTotal: devTotal,
        workItemsDone: doneDev.length,
        completionWoWDelta,
        completionWoWPct,
        completionMoMDelta,
        completionMoMPct,
        inProgressCount: inProgressDev.length,
        inProgressWoWDelta: ipWoWDelta,
        inProgressWoWPct: ipWoWPct,
        inActiveSprintCount: null,     // overridden from snapshot when available
        avgSprintsToResolve: null,     // overridden from snapshot when available
        avgAgeDays,
        backlogCount: todoDev.length,
        backlogWoWDelta: todoWoWDelta,
        backlogWoWPct: todoWoWPct,
        notInStandardStatusCount,
        avgBacklogAgeDays,
        stories,
        bugsHotfix,
        tasks,
        other,
    }
}

function computeInvestmentByMonth(issues: Phase4Issue[]): InvestmentMonth[] {
    const map: Record<string, Record<string, number>> = {}

    for (const issue of issues.filter(i => DEV_TYPES_LOWER.has(i.issueType.toLowerCase()))) {
        let dateStr: string | null = null

        // If the ticket has sprints, use the last active or latest sprint to determine when it was worked on
        if (Array.isArray(issue.sprintRaw) && issue.sprintRaw.length > 0) {
            const activeSprint = issue.sprintRaw.find((s: any) => s.state === 'active')
            const sprint = activeSprint || issue.sprintRaw[issue.sprintRaw.length - 1]
            dateStr = sprint.endDate || sprint.startDate || null
        }

        // Fallback to traditional dates if no sprint is found or no dates available in sprint
        if (!dateStr) {
            if (issue.statusCategory === 'Done') {
                dateStr = issue.updatedAt ?? issue.dueDate
            } else if (issue.statusCategory === 'In Progress') {
                dateStr = issue.updatedAt ?? issue.createdAt
            } else {
                dateStr = issue.createdAt
            }
        }

        const monthKey = toMonthKey(dateStr)
        if (!monthKey) continue

        const cat = issue.investmentCategory || 'Unassigned'
        if (!map[monthKey]) map[monthKey] = {}
        map[monthKey][cat] = (map[monthKey][cat] ?? 0) + 1
    }

    return Object.entries(map)
        .sort(([a], [b]) => a.localeCompare(b))
        .slice(-12)
        .map(([monthKey, categories]) => ({
            monthKey,
            monthLabel: formatMonthLabel(monthKey),
            categories,
            total: Object.values(categories).reduce((s, n) => s + n, 0),
        }))
}

function computeNotDoneByType(issues: Phase4Issue[]): AggItem[] {
    const devIssues = issues.filter(i => DEV_TYPES_LOWER.has(i.issueType.toLowerCase()))
    const notDone = devIssues.filter(i => i.statusCategory !== 'Done' && i.statusCategory !== 'Descoped')
    const counts: Record<string, number> = {}
    for (const i of notDone) counts[i.issueType] = (counts[i.issueType] || 0) + 1
    return Object.entries(counts)
        .map(([label, count]) => ({ label, count, pct: toPct(count, notDone.length) }))
        .sort((a, b) => b.count - a.count)
}

function computeAllStatuses(issues: Phase4Issue[]): OverviewStatusRow[] {
    const map: Record<string, { category: StatusCategory; count: number }> = {}
    for (const i of issues) {
        if (!map[i.statusName]) map[i.statusName] = { category: i.statusCategory, count: 0 }
        map[i.statusName].count++
    }
    return Object.entries(map)
        .map(([status, { category, count }]) => ({ status, category, count }))
        .sort((a, b) => b.count - a.count)
}

// ─── Snapshot merge helpers ───────────────────────────────────────────────────

function mergeTypeCard(
    snap: OverviewSnapshotRow,
    prefix: 'stories' | 'bugs_hotfix' | 'tasks' | 'other',
    computed: TypeCardKpi,
): TypeCardKpi {
    // To ensure 100% correctness based on the current tickets, we prioritize COMPUTED counts/percentages.
    // Snapshots can be stale or use a different issue-type scope.
    const snapAvgAge = snap[`${prefix}_avg_age_to_complete_days`] as number | null

    return {
        ...computed,
        // We still allow avgAgeDays to fall back to snapshot if available, 
        // as server-side computation might handle complex logic (e.g. business hours).
        avgAgeDays: round1(snapAvgAge) ?? computed.avgAgeDays,
    }
}

function mergeOverviewSnapshot(snap: OverviewSnapshotRow, computed: OverviewKpis): OverviewKpis {
    return {
        // WoW/MoM always from jira_issues (not stored in snapshot)
        completionWoWDelta: computed.completionWoWDelta,
        completionWoWPct: computed.completionWoWPct,
        completionMoMDelta: computed.completionMoMDelta,
        completionMoMPct: computed.completionMoMPct,
        inProgressWoWDelta: computed.inProgressWoWDelta,
        inProgressWoWPct: computed.inProgressWoWPct,
        backlogWoWDelta: computed.backlogWoWDelta,
        backlogWoWPct: computed.backlogWoWPct,

        // Count-based fields: always use computed (DEV_TYPES-scoped).
        completionRate: computed.completionRate,
        workItemsTotal: computed.workItemsTotal,
        workItemsDone: computed.workItemsDone,
        inProgressCount: computed.inProgressCount,
        backlogCount: computed.backlogCount,
        notInStandardStatusCount: computed.notInStandardStatusCount,

        // Sprint/Age fields come from snapshot when available
        inActiveSprintCount: snap.in_active_sprint_count ?? 0,
        avgSprintsToResolve: round1(snap.avg_sprints_to_resolve) ?? 0,
        avgAgeDays: computed.avgAgeDays,
        avgBacklogAgeDays: round1(snap.backlog_avg_age_days) ?? computed.avgBacklogAgeDays,

        // Type cards: snapshot provides accuracy; WoW stays computed
        stories: mergeTypeCard(snap, 'stories', computed.stories),
        bugsHotfix: mergeTypeCard(snap, 'bugs_hotfix', computed.bugsHotfix),
        tasks: mergeTypeCard(snap, 'tasks', computed.tasks),
        other: mergeTypeCard(snap, 'other', computed.other),
    }
}

// ─── Snapshot JSON parsers ─────────────────────────────────────────────────────

function parseNotCompletedByType(raw: unknown, fallback: AggItem[]): AggItem[] {
    if (!raw) return fallback
    try {
        if (Array.isArray(raw)) {
            const result = (raw as Record<string, unknown>[]).map(item => ({
                label: String(item.label ?? item.issue_type ?? item.type ?? ''),
                count: Number(item.count ?? 0),
                pct: Number(item.pct ?? 0),
            })).filter(i => i.label)
            return result.length > 0 ? result : fallback
        }
        if (typeof raw === 'object' && raw !== null) {
            // Shape: { "Bug": 15, "Story": 20 }
            const total = Object.values(raw as Record<string, number>).reduce((s, n) => s + n, 0)
            return Object.entries(raw as Record<string, number>)
                .map(([label, count]) => ({ label, count, pct: toPct(count, total) }))
                .sort((a, b) => b.count - a.count)
        }
    } catch {
        /* fall through */
    }
    return fallback
}

function parseStatusBreakdown(raw: unknown, fallback: OverviewStatusRow[]): OverviewStatusRow[] {
    if (!raw) return fallback
    try {
        if (Array.isArray(raw)) {
            const result = (raw as Record<string, unknown>[]).map(item => ({
                status: String(item.status ?? item.status_name ?? ''),
                category: (item.category ?? item.status_category ?? 'To Do') as StatusCategory,
                count: Number(item.count ?? 0),
            })).filter(i => i.status)
            return result.length > 0 ? result : fallback
        }
        if (typeof raw === 'object' && raw !== null) {
            // Shape: { "In Progress": { category: "In Progress", count: 25 } }
            type Val = { category?: string; count?: number }
            return Object.entries(raw as Record<string, Val>)
                .map(([status, val]) => ({
                    status,
                    category: (val?.category ?? 'To Do') as StatusCategory,
                    count: val?.count ?? 0,
                }))
                .sort((a, b) => b.count - a.count)
        }
    } catch {
        /* fall through */
    }
    return fallback
}

function parseInvestmentByMonth(raw: unknown, fallback: InvestmentMonth[]): InvestmentMonth[] {
    if (!raw) return fallback
    try {
        if (Array.isArray(raw)) {
            const result = (raw as Record<string, unknown>[]).map(item => {
                const monthKey = String(item.month_key ?? item.monthKey ?? '')
                const categories = (item.categories ?? {}) as Record<string, number>
                return {
                    monthKey,
                    monthLabel: String(item.month_label ?? item.monthLabel ?? formatMonthLabel(monthKey)),
                    categories,
                    total: Object.values(categories).reduce((s, n) => s + Number(n), 0),
                }
            }).filter(m => m.monthKey)
            return result.length > 0 ? result : fallback
        }
        if (typeof raw === 'object' && raw !== null) {
            // Shape: { "2025-09": { "Revenue-Commit": 5, "Support": 12 }, ... }
            return Object.entries(raw as Record<string, Record<string, number>>)
                .sort(([a], [b]) => a.localeCompare(b))
                .slice(-12)
                .map(([monthKey, categories]) => ({
                    monthKey,
                    monthLabel: formatMonthLabel(monthKey),
                    categories,
                    total: Object.values(categories).reduce((s, n) => s + n, 0),
                }))
        }
    } catch {
        /* fall through */
    }
    return fallback
}

// ─── Snapshot-to-DTO mappers ──────────────────────────────────────────────────

/**
 * Fetch sprint health data by:
 * 1. Querying jira_sprints to determine which sprint_labels are active/closed (exclude future)
 * 2. Querying phase4_sprint_health_snapshot for the metrics
 * 3. Aggregating snapshot rows per sprint_label (since the snapshot can have multiple rows per label)
 * 4. Only returning the active sprint + 5 previous closed sprints
 *
 * Note: Sprint labels (e.g. "Sprint 4 - 2026") are shared across workstreams,
 * so we do NOT filter by workstream here. The chart always shows global sprint data.
 */
async function fetchSprintHealth(
    supabase: ReturnType<typeof createServiceClient>,
    today: string,
): Promise<SprintHealthRow[]> {
    // 1. Get sprint states from jira_sprints (all workstreams — sprint labels are shared)
    const { data: sprintRows, error: sprintErr } = await supabase
        .from('jira_sprints')
        .select('sprint_label, sprint_year, sprint_number, state')
        .not('sprint_label', 'is', null)
        .in('state', ['active', 'closed'])

    if (sprintErr || !sprintRows?.length) {
        console.warn('[phase4/sprint-health] jira_sprints query failed:', sprintErr?.message)
        return []
    }

    // Group by sprint_label → determine combined state (active if ANY sub-sprint is active)
    const labelMap = new Map<string, { year: number | null; num: number | null; state: 'active' | 'closed' }>()
    for (const r of sprintRows) {
        const label = r.sprint_label as string
        const existing = labelMap.get(label)
        const isActive = (r.state === 'active')
        if (!existing) {
            labelMap.set(label, {
                year: r.sprint_year as number | null,
                num: r.sprint_number as number | null,
                state: isActive ? 'active' : 'closed',
            })
        } else if (isActive) {
            existing.state = 'active'
        }
    }

    // Sort chronologically: year ASC, number ASC
    const allLabels = [...labelMap.entries()]
        .sort((a, b) => {
            const yearDiff = (a[1].year ?? 0) - (b[1].year ?? 0)
            if (yearDiff !== 0) return yearDiff
            return (a[1].num ?? 0) - (b[1].num ?? 0)
        })

    // Find last active sprint index, take that + 5 previous closed
    const activeIdx = allLabels.findIndex(([, meta]) => meta.state === 'active')
    let selectedLabels: typeof allLabels
    if (activeIdx >= 0) {
        // Take 5 closed before active + the active itself
        const startIdx = Math.max(0, activeIdx - 5)
        selectedLabels = allLabels.slice(startIdx, activeIdx + 1)
    } else {
        // No active sprint found — take last 6 closed
        selectedLabels = allLabels.slice(-6)
    }

    if (selectedLabels.length === 0) return []

    // 2. Fetch snapshot metrics for those labels
    const labelNames = selectedLabels.map(([l]) => l)
    const { data: snapRows, error: snapErr } = await supabase
        .from('phase4_sprint_health_snapshot')
        .select('*')
        .eq('snapshot_date', today)
        .eq('period', 'daily')
        .in('sprint_label', labelNames)
        .order('sprint_year', { ascending: true })
        .order('sprint_number', { ascending: true })

    if (snapErr) {
        console.warn('[phase4/sprint-health] snapshot query failed:', snapErr.message)
        return []
    }

    // 3. Aggregate snapshot rows by sprint_label (sum across workstreams / duplicates)
    const aggMap = new Map<string, SprintHealthSnapshotRow>()
    for (const r of (snapRows || []) as unknown as SprintHealthSnapshotRow[]) {
        const existing = aggMap.get(r.sprint_label)
        if (!existing) {
            aggMap.set(r.sprint_label, { ...r })
        } else {
            existing.issues_newly_committed = (existing.issues_newly_committed ?? 0) + (r.issues_newly_committed ?? 0)
            existing.issues_completed = (existing.issues_completed ?? 0) + (r.issues_completed ?? 0)
            existing.issues_added = (existing.issues_added ?? 0) + (r.issues_added ?? 0)
            existing.issues_carryover = (existing.issues_carryover ?? 0) + (r.issues_carryover ?? 0)
            existing.issues_carryover_2x_plus = (existing.issues_carryover_2x_plus ?? 0) + (r.issues_carryover_2x_plus ?? 0)
            existing.points_newly_committed = (existing.points_newly_committed ?? 0) + Number(r.points_newly_committed ?? 0)
            existing.points_completed = (existing.points_completed ?? 0) + Number(r.points_completed ?? 0)
            existing.points_added = (existing.points_added ?? 0) + Number(r.points_added ?? 0)
            existing.points_carryover = (existing.points_carryover ?? 0) + Number(r.points_carryover ?? 0)
            existing.points_carryover_2x_plus = (existing.points_carryover_2x_plus ?? 0) + Number(r.points_carryover_2x_plus ?? 0)
        }
    }

    // 4. Build output in chronological order
    return selectedLabels.map(([label, meta]) => {
        const snap = aggMap.get(label)
        return {
            sprintLabel: label,
            sprintYear: meta.year,
            sprintNumber: meta.num,
            sprintState: meta.state,
            issuesNewlyCommitted: snap?.issues_newly_committed ?? 0,
            issuesCompleted: snap?.issues_completed ?? 0,
            issuesAdded: snap?.issues_added ?? 0,
            issuesCarryover: snap?.issues_carryover ?? 0,
            issuesCarryover2xPlus: snap?.issues_carryover_2x_plus ?? 0,
            pointsNewlyCommitted: Number(snap?.points_newly_committed ?? 0),
            pointsCompleted: Number(snap?.points_completed ?? 0),
            pointsAdded: Number(snap?.points_added ?? 0),
            pointsCarryover: Number(snap?.points_carryover ?? 0),
            pointsCarryover2xPlus: Number(snap?.points_carryover_2x_plus ?? 0),
        }
    })
}

function mapContributors(rows: ContributorsSnapshotRow[]): ContributorRow[] {
    return rows.map(r => ({
        accountId: r.account_id,
        displayName: r.display_name,
        avatarUrl: r.avatar_url,
        role: r.role ?? 'Unknown',
        ticketsCount: r.tickets_count ?? 0,
        storyPointsTotal: r.story_points_total ?? 0,
        completionPct: normalizePct(r.completion_pct),
        ticketsWithoutEstimation: r.tickets_without_estimation ?? 0,
        workstreamCode: r.workstream_code,
    }))
}

function mapSprintToSolve(snap: OverviewSnapshotRow | null, prevSnap: OverviewSnapshotRow | null, liveAvgAge: number | null): SprintToSolve {
    const currentVal = snap?.avg_sprints_to_resolve ? Number(snap.avg_sprints_to_resolve) : 0
    const prevVal = prevSnap?.avg_sprints_to_resolve ? Number(prevSnap.avg_sprints_to_resolve) : 0
    const { delta, pct } = calcWow(currentVal, prevVal)

    return {
        avgSprints: round1(currentVal) ?? 0,
        avgAgeDays: round1(liveAvgAge) ?? 0,
        wowDelta: delta,
        wowPct: pct,
    }
}

function mapPrMetrics(snap: OverviewSnapshotRow | null, prevSnap: OverviewSnapshotRow | null): PrMetrics {
    const currentPct = normalizePct(snap?.pr_coverage_pct)
    const prevPct = normalizePct(prevSnap?.pr_coverage_pct)
    const { delta, pct } = calcWow(currentPct, prevPct)

    return {
        coveragePct: currentPct,
        openCount: snap?.pr_open_count ?? 0,
        mergedCount: snap?.pr_merged_count ?? 0,
        avgPrsPerTicket: round1(snap?.avg_prs_per_ticket) ?? 0,
        avgCommitsPerTicket: round1(snap?.avg_commits_per_ticket) ?? 0,
        wowDelta: delta,
        wowPct: pct,
    }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getPhase4Data(workstream?: string, _team?: string): Promise<Phase4DTO> {
    const supabase = createServiceClient()
    const today = new Date().toISOString().slice(0, 10)

    // ── Fetch Jira issues (with pagination to bypass 1000 rows limit) ─────────
    let allIssues: RawRow[] = []
    let from = 0
    const pageSize = 1000
    let hasMore = true

    while (hasMore) {
        let query = supabase
            .from('jira_issues')
            .select('*')
            .in('issue_type', [...DEV_TYPES])
            .order('jira_key')
            .range(from, from + pageSize - 1)

        if (workstream && workstream !== 'All Workstreams') {
            query = query.eq('workstream', workstream)
        }

        const { data, error } = await query
        if (error) throw new Error(`[phase4/issues] ${error.message}`)


        const rows = (data ?? []) as unknown as RawRow[]
        allIssues = [...allIssues, ...rows]

        if (rows.length < pageSize) {
            hasMore = false
        } else {
            from += pageSize
        }
    }

    const lastWeek = daysAgoISO(7).split('T')[0]

    // ── Fetch other sources in parallel ───────────────────────────────────────
    const [
        overviewSnapResult,
        prevOverviewSnapResult,
        sprintHealthResult,
        contributorsResult,
    ] = await Promise.all([
        // Overview snapshot is global (no per-workstream snapshot yet)
        supabase
            .from('phase4_overview_snapshot')
            .select('*')
            .eq('snapshot_date', today)
            .eq('period', 'daily')
            .maybeSingle(),
        supabase
            .from('phase4_overview_snapshot')
            .select('*')
            .eq('snapshot_date', lastWeek)
            .eq('period', 'daily')
            .maybeSingle(),
        // Sprint health — fetches from jira_sprints + snapshot (always global, sprints are shared)
        fetchSprintHealth(supabase, today),
        // Contributors — global or filtered by workstream_code
        (() => {
            let q = supabase
                .from('phase4_contributors_snapshot')
                .select('*')
                .eq('snapshot_date', today)
                .eq('period', 'daily')
            if (workstream && workstream !== 'All Workstreams') {
                q = q.eq('workstream_code', workstream)
            }
            return q.order('tickets_count', { ascending: false })
        })(),
    ])

    // ── Process issues ────────────────────────────────────────────────────────
    const issues: Phase4Issue[] = allIssues.map(r => ({
        id: r.jira_issue_id,
        key: r.jira_key ?? '',
        summary: r.summary ?? '',
        issueType: r.issue_type ?? 'Unknown',
        statusName: r.status_name ?? '',
        statusCategory: toStatusCategory(r.status_category ?? r.status_name),
        startDate: r.start_date ?? null,
        dueDate: r.due_date ?? null,
        workstream: r.workstream ?? null,
        investmentCategory: r.investment_category ?? null,
        parentId: r.parent_jira_issue_id ?? null,
        createdAt: r.created_at_jira ?? null,
        updatedAt: r.updated_at_jira ?? null,
        sprintRaw: r.sprint_raw ?? null,
        assigneeAccountId: r.assignee_account_id ?? null,
        assigneeDisplayName: r.assignee_display_name ?? null,
        assigneeAvatarUrl: r.assignee_avatar_url ?? null,
        storyPoints: r.story_points ?? null,
        devPrCount: r.dev_pr_count ?? 0,
        devOpenPrCount: r.dev_open_pr_count ?? 0,
        devMergedPrCount: r.dev_merged_pr_count ?? 0,
        devLastUpdated: r.dev_last_updated ?? null,
    }))

    const total = issues.length
    const totalDone = issues.filter(i => i.statusCategory === 'Done' || i.statusCategory === 'Descoped').length
    const totalInProgress = issues.filter(i => i.statusCategory === 'In Progress').length
    const totalToDo = issues.filter(i => i.statusCategory === 'To Do').length

    // byType is scoped to DEV_TYPES so it matches workItemsTotal / donut total
    const devIssues = issues.filter(i => DEV_TYPES_LOWER.has(i.issueType.toLowerCase()))
    const devTotal = devIssues.length
    const typeCounts: Record<string, number> = {}
    for (const i of devIssues) typeCounts[i.issueType] = (typeCounts[i.issueType] || 0) + 1
    const byType: AggItem[] = Object.entries(typeCounts)
        .map(([label, count]) => ({ label, count, pct: toPct(count, devTotal) }))
        .sort((a, b) => b.count - a.count)

    const byStatus: AggItem[] = [
        { label: 'Done', count: totalDone, pct: toPct(totalDone, total) },
        { label: 'In Progress', count: totalInProgress, pct: toPct(totalInProgress, total) },
        { label: 'To Do', count: totalToDo, pct: toPct(totalToDo, total) },
    ]

    const invCounts: Record<string, number> = {}
    for (const i of issues) {
        const cat = i.investmentCategory || 'Uncategorized'
        invCounts[cat] = (invCounts[cat] || 0) + 1
    }
    const byInvestment: AggItem[] = Object.entries(invCounts)
        .map(([label, count]) => ({ label, count, pct: toPct(count, total) }))
        .sort((a, b) => b.count - a.count)

    // ── Compute from issues (fallbacks + WoW/MoM trends) ─────────────────────
    const computedKpis = computeOverviewKpis(issues)
    const computedNotDoneByType = computeNotDoneByType(issues)
    const computedAllStatuses = computeAllStatuses(issues)
    const computedInvestmentByMonth = computeInvestmentByMonth(issues)

    // ── Merge/parse snapshot data (snapshot wins for accuracy; issues for WoW) ─
    if (overviewSnapResult.error) {
        console.warn('[phase4/overview-snapshot]', overviewSnapResult.error.message)
    }
    if (contributorsResult.error) {
        console.warn('[phase4/contributors-snapshot]', contributorsResult.error.message)
    }

    const overviewSnap = overviewSnapResult.data as OverviewSnapshotRow | null
    const prevOverviewSnap = prevOverviewSnapResult.data as OverviewSnapshotRow | null

    // Override: Use purely COMPUTED kpis. Snapshots are often stale and don't match the live frontend groupings.
    const overviewKpis = {
        ...computedKpis,
        inActiveSprintCount: overviewSnap?.in_active_sprint_count ?? 0,
        avgSprintsToResolve: round1(overviewSnap?.avg_sprints_to_resolve) ?? 0,
    }

    // Override: Use computationally derived data instead of stale JSON from snapshots
    const notDoneByType = computedNotDoneByType
    const allStatuses = computedAllStatuses

    const investmentByMonth = parseInvestmentByMonth(
        overviewSnap?.investment_allocation_monthly,
        computedInvestmentByMonth,
    )

    // ── LIVE computation for Row 5 (ensures workstream accuracy) ─────────────
    const nowISO = new Date().toISOString()
    const weekAgoISO = daysAgoISO(7)

    // A) Sprint to Solve (Live)
    const solvedIssues = devIssues.filter(i => i.statusCategory === 'Done' || i.statusCategory === 'Descoped')
    const solvedWithSprints = solvedIssues.filter(i => Array.isArray(i.sprintRaw) && i.sprintRaw.length > 0)
    const liveAvgSprints = solvedWithSprints.length > 0
        ? solvedWithSprints.reduce((acc, i) => acc + (i.sprintRaw.length), 0) / solvedWithSprints.length
        : (overviewSnap?.avg_sprints_to_resolve ? Number(overviewSnap.avg_sprints_to_resolve) : 0)

    const sprintToSolve: SprintToSolve = {
        avgSprints: round1(liveAvgSprints) ?? 0,
        avgAgeDays: round1(computedKpis.avgAgeDays) ?? 0,
        wowDelta: mapSprintToSolve(overviewSnap, prevOverviewSnap, 0).wowDelta,
        wowPct: mapSprintToSolve(overviewSnap, prevOverviewSnap, 0).wowPct,
    }

    // B) PR Metrics (Live)
    const issuesWithPrs = devIssues.filter(i => (i.devPrCount ?? 0) > 0).length
    const livePrCoveragePct = devTotal > 0 ? (issuesWithPrs / devTotal) * 100 : 0
    const liveOpenPrCount = devIssues.reduce((sum, i) => sum + (i.devOpenPrCount ?? 0), 0)
    const liveMergedPrCount = solvedIssues.reduce((sum, i) => sum + (i.devMergedPrCount ?? 0), 0)

    const prMetrics: PrMetrics = {
        coveragePct: normalizePct(livePrCoveragePct),
        openCount: liveOpenPrCount,
        mergedCount: liveMergedPrCount,
        avgPrsPerTicket: round1(overviewSnap?.avg_prs_per_ticket) ?? 0,
        avgCommitsPerTicket: round1(overviewSnap?.avg_commits_per_ticket) ?? 0,
        wowDelta: mapPrMetrics(overviewSnap, prevOverviewSnap).wowDelta,
        wowPct: mapPrMetrics(overviewSnap, prevOverviewSnap).wowPct,
    }

    const sprintHealth = sprintHealthResult // already SprintHealthRow[] from fetchSprintHealth

    // Process contributors from snapshot
    const rawContributorRows = (contributorsResult.data ?? []) as unknown as ContributorsSnapshotRow[]

    // Aggregation Map: ensure each person appears only once by summing their metrics 
    // across different sprints or groupings in the snapshot.
    const aggMap = new Map<string, ContributorRow>()

    rawContributorRows.forEach(r => {
        // If a workstream filter is active, only aggregate rows for that workstream
        if (workstream && workstream !== 'All Workstreams' && r.workstream_code !== workstream) {
            return
        }

        const key = r.account_id
        if (!aggMap.has(key)) {
            aggMap.set(key, {
                accountId: r.account_id,
                displayName: r.display_name,
                avatarUrl: r.avatar_url,
                role: r.role || 'Dev',
                ticketsCount: 0,
                ticketsCompleted: 0,
                storyPointsTotal: 0,
                storyPointsCompleted: 0,
                ticketsWithoutEstimation: 0,
                completionPct: 0,
                workstreamCode: r.workstream_code,
            })
        }

        const acc = aggMap.get(key)!
        acc.ticketsCount += (r.tickets_count || 0)
        acc.ticketsCompleted! += (r.tickets_completed || 0)
        acc.storyPointsTotal += (r.story_points_total || 0)
        acc.storyPointsCompleted! += (r.story_points_completed || 0)
        acc.ticketsWithoutEstimation += (r.tickets_without_estimation || 0)

        // Prefer rows that actually have name/avatar data
        if (!acc.displayName || acc.displayName === 'Unknown') acc.displayName = r.display_name
        if (!acc.avatarUrl) acc.avatarUrl = r.avatar_url
    })

    // Compute final percentage and enrich missing names from live issues
    let contributors: ContributorRow[] = Array.from(aggMap.values())

    const nameMap = new Map<string, { name: string, avatar: string | null }>()
    issues.forEach(i => {
        if (i.assigneeAccountId && i.assigneeDisplayName && i.assigneeDisplayName !== 'Unknown') {
            nameMap.set(i.assigneeAccountId, {
                name: i.assigneeDisplayName,
                avatar: i.assigneeAvatarUrl
            })
        }
    })

    contributors = contributors.map(c => {
        // Final % calculation based on TICKETS as requested
        const tTotal = c.ticketsCount || 0
        const tDone = c.ticketsCompleted || 0
        const completionPct = tTotal > 0 ? Math.round((tDone / tTotal) * 100) : 0

        // Enrichment
        let displayName = c.displayName
        let avatarUrl = c.avatarUrl

        if (!displayName || displayName === 'Unknown') {
            const match = nameMap.get(c.accountId)
            if (match) {
                displayName = match.name
                avatarUrl = match.avatar || avatarUrl
            }
        }

        return {
            ...c,
            displayName,
            avatarUrl,
            completionPct
        }
    }).sort((a, b) => b.ticketsCount - a.ticketsCount)

    const investmentCategories = [
        ...new Set(issues.map(i => i.investmentCategory || 'Unassigned')),
    ]

    console.log(
        `[phase4] issues=${total} done=${totalDone} wip=${totalInProgress} todo=${totalToDo}` +
        ` | snap=${overviewSnap ? 'ok' : 'missing'}` +
        ` | sprintHealth=${sprintHealth.length} contributors=${contributors.length}`,
    )

    return {
        issues,
        byType,
        byStatus,
        byInvestment,
        total,
        totalDone,
        totalInProgress,
        totalToDo,
        completionRate: toPct(totalDone, total),
        workstream: workstream ?? 'All Workstreams',
        team: _team ?? 'All Teams',
        lastUpdated: new Date().toISOString(),
        overviewKpis,
        investmentByMonth,
        notDoneByType,
        allStatuses,
        investmentCategories,
        sprintHealth,
        sprintToSolve,
        prMetrics,
        contributors,
    }
}
