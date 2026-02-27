/**
 * Server-side data fetching for the Workstream Initiatives dashboard section.
 * Uses the Supabase service role key — never call this from client components.
 *
 * Priority:
 *  1. initiative_metrics_snapshot (today, period='daily') for aggregate counts/breakdowns.
 *  2. Falls back to live queries against jira_issues when no snapshot is available.
 *  3. Alert counts + max severity always come from initiative_health_latest.
 *  4. Trend badge compares today snapshot vs 7-day-ago snapshot.
 */

import { createServiceClient } from '@/utils/supabase/service'

// ─── Types ───────────────────────────────────────────────────────────────────

export type Severity = 'High' | 'Medium' | 'Low' | 'None'

export interface InitiativeRow {
    key: string
    summary: string
    /** status_category value: 'Done' | 'In Progress' | 'To Do' */
    status: string
    workstream: string
    investment_category: string | null
    children_count: number
    open_children_count: number
    created_at: string
    start_date: string | null
    due_date: string | null
}

export interface AlertSeverities {
    missingDates: Severity
    behindSchedule: Severity
    noChildIssues: Severity
    closedOpenChildren: Severity
    statusInconsistency: Severity
}

export interface AlertTrends {
    missingDates: { weekly: number | null; monthly: number | null }
    behindSchedule: { weekly: number | null; monthly: number | null }
    noChildIssues: { weekly: number | null; monthly: number | null }
    closedOpenChildren: { weekly: number | null; monthly: number | null }
    statusInconsistency: { weekly: number | null; monthly: number | null }
}

export interface InitiativesDashboardData {
    raw: InitiativeRow[]
    alertSeverities: AlertSeverities
    alertTrends: AlertTrends
    /** Percentage change in Unassigned count vs 7 days ago. null when snapshot is missing. */
    trendUnassigned: number | null
    lastUpdated: string
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1, None: 0 }

function maxSeverity(values: (string | null | undefined)[]): Severity {
    let best: Severity = 'None'
    let bestRank = 0
    for (const v of values) {
        const rank = SEVERITY_RANK[v ?? 'None'] ?? 0
        if (rank > bestRank) {
            bestRank = rank
            best = (v ?? 'None') as Severity
        }
    }
    return best
}

function todayISO(): string {
    return new Date().toISOString().split('T')[0]
}

function daysAgoISO(days: number): string {
    const d = new Date()
    d.setDate(d.getDate() - days)
    return d.toISOString().split('T')[0]
}

// ─── Main function ────────────────────────────────────────────────────────────

export async function getInitiativesDashboardData(
    workstream?: string
): Promise<InitiativesDashboardData> {
    const supabase = createServiceClient()
    const today = todayISO()
    const sevenDaysAgo = daysAgoISO(7)
    const thirtyDaysAgo = daysAgoISO(30)

    // ── 1. Fire all queries in parallel ──────────────────────────────────────

    // 1a. Raw initiatives from jira_issues
    let issuesQuery = supabase
        .from('jira_issues')
        .select(
            'jira_issue_id, jira_key, summary, status_category, workstream, investment_category, start_date, due_date, created_at_jira'
        )
        .eq('issue_type', 'Workstream Initiative')

    if (workstream && workstream !== 'All Workstreams') {
        issuesQuery = issuesQuery.eq('workstream', workstream)
    }

    const [
        issuesResult,
        rollupsResult,
        healthResult,
        todaySnapshotResult,
        prevSnapshotResult,
        monthlySnapshotResult,
    ] = await Promise.all([
        issuesQuery,

        // 1b. Children counts per initiative
        supabase
            .from('initiative_rollups_latest')
            .select('initiative_jira_issue_id, children_total, children_open'),

        // 1c. Health flags + severities per initiative (include computed_at for lastUpdated)
        supabase
            .from('initiative_health_latest')
            .select(
                'initiative_jira_issue_id, missing_critical_dates_flag, behind_schedule_flag, no_child_issues_flag, closed_open_children_flag, status_inconsistency_flag, severity_missing_dates, severity_behind_schedule, severity_no_child, severity_closed_open_children, severity_status_inconsistency, computed_at'
            ),

        // 1d. Today's aggregate snapshot
        supabase
            .from('initiative_metrics_snapshot')
            .select('by_investment_category, missing_critical_dates_count, behind_schedule_count, no_child_issues_count, closed_open_children_count, status_inconsistency_count, generated_at')
            .eq('snapshot_date', today)
            .eq('period', 'daily')
            .maybeSingle(),

        // 1e. 7-day-ago snapshot for trend
        supabase
            .from('initiative_metrics_snapshot')
            .select('by_investment_category, missing_critical_dates_count, behind_schedule_count, no_child_issues_count, closed_open_children_count, status_inconsistency_count')
            .eq('snapshot_date', sevenDaysAgo)
            .eq('period', 'daily')
            .maybeSingle(),

        // 1f. 30-day-ago snapshot for monthly trend
        supabase
            .from('initiative_metrics_snapshot')
            .select('missing_critical_dates_count, behind_schedule_count, no_child_issues_count, closed_open_children_count, status_inconsistency_count')
            .eq('snapshot_date', thirtyDaysAgo)
            .eq('period', 'daily')
            .maybeSingle(),
    ])

    // ── 2. Build rollup + health lookup maps ─────────────────────────────────

    const rollupMap = new Map(
        (rollupsResult.data ?? []).map((r) => [r.initiative_jira_issue_id, r])
    )

    const healthMap = new Map(
        (healthResult.data ?? []).map((h) => [h.initiative_jira_issue_id, h])
    )

    // ── 3. Assemble raw rows ──────────────────────────────────────────────────

    const issueIds = new Set<string>()
    const raw: InitiativeRow[] = (issuesResult.data ?? []).map((issue) => {
        issueIds.add(issue.jira_issue_id)
        const rollup = rollupMap.get(issue.jira_issue_id)
        return {
            key: issue.jira_key,
            summary: issue.summary,
            status: issue.status_category ?? 'To Do',
            workstream: issue.workstream ?? 'Unassigned',
            investment_category: issue.investment_category ?? null,
            children_count: rollup?.children_total ?? 0,
            open_children_count: rollup?.children_open ?? 0,
            created_at: issue.created_at_jira,
            start_date: issue.start_date ?? null,
            due_date: issue.due_date ?? null,
        }
    })

    // ── 4. Compute alert severities (max across impacted initiatives) ─────────

    // Only consider health rows for initiatives in the current (filtered) result set.
    const relevantHealth = (healthResult.data ?? []).filter((h) =>
        issueIds.has(h.initiative_jira_issue_id)
    )

    const alertSeverities: AlertSeverities = {
        missingDates: maxSeverity(
            relevantHealth
                .filter((h) => h.missing_critical_dates_flag)
                .map((h) => h.severity_missing_dates)
        ),
        behindSchedule: maxSeverity(
            relevantHealth
                .filter((h) => h.behind_schedule_flag)
                .map((h) => h.severity_behind_schedule)
        ),
        noChildIssues: maxSeverity(
            relevantHealth
                .filter((h) => h.no_child_issues_flag)
                .map((h) => h.severity_no_child)
        ),
        closedOpenChildren: maxSeverity(
            relevantHealth
                .filter((h) => h.closed_open_children_flag)
                .map((h) => h.severity_closed_open_children)
        ),
        statusInconsistency: maxSeverity(
            relevantHealth
                .filter((h) => h.status_inconsistency_flag)
                .map((h) => h.severity_status_inconsistency)
        ),
    }

    // ── 5. Compute Trends ────────────────────────────────────────────────────
    const todaySnapshot = todaySnapshotResult.data
    const weeklySnapshot = prevSnapshotResult.data
    const monthlySnapshot = monthlySnapshotResult.data

    let trendUnassigned: number | null = null
    if (weeklySnapshot) {
        const weeklyCat = (weeklySnapshot.by_investment_category ?? {}) as Record<string, number>
        const weeklyVal = weeklyCat['Unassigned'] ?? 0
        const todayVal = raw.filter(i => (i.investment_category || 'Unassigned') === 'Unassigned').length
        trendUnassigned = ((todayVal - weeklyVal) / Math.max(weeklyVal, 1)) * 100
    }

    const calcTrend = (curr: number, prev: number | undefined): number | null => {
        if (prev === undefined || prev === null) return null
        return ((curr - prev) / Math.max(prev, 1)) * 100
    }

    const alertTrends: AlertTrends = {
        missingDates: {
            weekly: todaySnapshot && weeklySnapshot ? calcTrend(todaySnapshot.missing_critical_dates_count, weeklySnapshot.missing_critical_dates_count) : null,
            monthly: todaySnapshot && monthlySnapshot ? calcTrend(todaySnapshot.missing_critical_dates_count, monthlySnapshot.missing_critical_dates_count) : null,
        },
        behindSchedule: {
            weekly: todaySnapshot && weeklySnapshot ? calcTrend(todaySnapshot.behind_schedule_count, weeklySnapshot.behind_schedule_count) : null,
            monthly: todaySnapshot && monthlySnapshot ? calcTrend(todaySnapshot.behind_schedule_count, monthlySnapshot.behind_schedule_count) : null,
        },
        noChildIssues: {
            weekly: todaySnapshot && weeklySnapshot ? calcTrend(todaySnapshot.no_child_issues_count, weeklySnapshot.no_child_issues_count) : null,
            monthly: todaySnapshot && monthlySnapshot ? calcTrend(todaySnapshot.no_child_issues_count, monthlySnapshot.no_child_issues_count) : null,
        },
        closedOpenChildren: {
            weekly: todaySnapshot && weeklySnapshot ? calcTrend(todaySnapshot.closed_open_children_count, weeklySnapshot.closed_open_children_count) : null,
            monthly: todaySnapshot && monthlySnapshot ? calcTrend(todaySnapshot.closed_open_children_count, monthlySnapshot.closed_open_children_count) : null,
        },
        statusInconsistency: {
            weekly: todaySnapshot && weeklySnapshot ? calcTrend(todaySnapshot.status_inconsistency_count, weeklySnapshot.status_inconsistency_count) : null,
            monthly: todaySnapshot && monthlySnapshot ? calcTrend(todaySnapshot.status_inconsistency_count, monthlySnapshot.status_inconsistency_count) : null,
        },
    }

    // ── 6. lastUpdated timestamp ──────────────────────────────────────────────

    const maxHealthComputedAt =
        relevantHealth
            .map((h) => h.computed_at)
            .filter(Boolean)
            .sort()
            .at(-1) ?? null

    const lastUpdated =
        todaySnapshot?.generated_at ?? maxHealthComputedAt ?? new Date().toISOString()

    console.log(
        `[initiatives] fetched ${raw.length} rows | alerts:`,
        alertSeverities,
        '| trend:',
        trendUnassigned,
        '| lastUpdated:',
        lastUpdated
    )

    return { raw, alertSeverities, alertTrends, trendUnassigned, lastUpdated }
}
