/**
 * Server-side data fetching for the Projects dashboard section.
 * Uses the Supabase service role key — never call from client components.
 *
 * Primary source: project_metrics_snapshot (today, period='daily').
 * Severity: computed as MAX severity across project_health_latest rows
 *           where the corresponding flag is true.
 */

import { createServiceClient } from '@/utils/supabase/service'
import type { Severity } from './initiatives'

// ─── Color palettes ───────────────────────────────────────────────────────────

const WS_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#f43f5e', '#06b6d4', '#84cc16', '#a855f7',
]

const DIST_COLORS = [
    '#6366f1', '#8b5cf6', '#f59e0b', '#10b981',
    '#f43f5e', '#3b82f6', '#06b6d4', '#84cc16',
]

// Matches the same palette used by the Workstream Initiatives section
const INV_CAT_COLORS: Record<string, string> = {
    'Strategic Innovation': '#10b981',
    'Scale & Reliability': '#3b82f6',
    'Revenue-Commit': '#8b5cf6',
    'Sales Activation': '#f59e0b',
    'Support': '#f43f5e',
    'Unassigned': '#94a3b8',
}

// ─── Raw DB row types (typed explicitly since database.types.ts is empty) ─────

interface SnapRow {
    total_projects: number | null
    progress_completed: number | null
    progress_in_progress: number | null
    progress_pending: number | null
    by_workstream: unknown
    by_investment_category: unknown
    child_issue_type_distribution: unknown
    missing_parents_count: number | null
    missing_children_count: number | null
    missing_critical_dates_count: number | null
    behind_schedule_count: number | null
    closed_open_children_count: number | null
    status_inconsistency_count: number | null
    generated_at: string | null
}

interface HealthRow {
    project_jira_issue_id: string
    missing_critical_dates_flag: boolean | null
    behind_schedule_flag: boolean | null
    closed_open_children_flag: boolean | null
    status_inconsistency_flag: boolean | null
    status_inconsistency_reason: any | null  // Added
    no_child_issues_flag: boolean | null      // Added
    severity_missing_dates: string | null
    severity_behind_schedule: string | null
    severity_closed_open_children: string | null
    severity_status_inconsistency: string | null
    computed_at: string | null
}

// ─── Public row type (for modal drilldown) ────────────────────────────────────

export interface ProjectRow {
    key: string
    summary: string
    status: string
    workstream: string | null
    assignee: string | null
    investment_category: string | null
    parent_issue_key: string | null
    // Governance flags
    missing_critical_dates_flag: boolean
    behind_schedule_flag: boolean
    closed_open_children_flag: boolean
    status_inconsistency_flag: boolean
    no_child_issues_flag: boolean
    missing_parent_flag: boolean
    severity_missing_dates: string | null
    severity_behind_schedule: string | null
    severity_closed_open_children: string | null
    severity_status_inconsistency: string | null
    status_inconsistency_reason: any | null
    // Progress and dates
    children_total: number
    children_done: number
    start_date: string | null
    due_date: string | null
}

// ─── Public DTO ───────────────────────────────────────────────────────────────

export interface ProjectsDashboardData {
    totalProjects: number
    progress: { completed: number; inProgress: number; pending: number }
    /** WorkstreamBarChart format: { name, count, color } */
    byWorkstream: Array<{ name: string; count: number; color: string }>
    /** InvestmentCategoryDonut format: { name, value, color } */
    byInvestmentCategory: Array<{ name: string; value: number; color: string }>
    /** InvestmentCategoryDonut format: { name, value, color } — child issue types */
    childDistribution: Array<{ name: string; value: number; color: string }>
    cards: { missingParents: number; missingChildren: number }
    alerts: {
        missingCriticalDates: { count: number; severity: Severity }
        behindSchedule: { count: number; severity: Severity }
        closedOpenChildren: { count: number; severity: Severity }
        statusInconsistency: { count: number; severity: Severity }
    }
    alertTrends: {
        missingCriticalDates: { weekly: number | null; monthly: number | null }
        behindSchedule: { weekly: number | null; monthly: number | null }
        closedOpenChildren: { weekly: number | null; monthly: number | null }
        statusInconsistency: { weekly: number | null; monthly: number | null }
    }
    /** Weekly % change in Unassigned investment category count */
    trendUnassigned: number | null
    cardTrends: {
        missingParents: { weekly: number | null; monthly: number | null }
        missingChildren: { weekly: number | null; monthly: number | null }
    }
    /** Raw project rows for modal drilldown */
    raw: ProjectRow[]
    lastUpdated: string
    /** false when no snapshot row exists for today */
    hasData: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const SEVERITY_RANK: Record<string, number> = { High: 3, Medium: 2, Low: 1, None: 0 }

function maxSeverity(values: (string | null | undefined)[]): Severity {
    let best: Severity = 'None'
    let bestRank = 0
    for (const v of values) {
        const rank = SEVERITY_RANK[v ?? 'None'] ?? 0
        if (rank > bestRank) { bestRank = rank; best = (v ?? 'None') as Severity }
    }
    return best
}

function isCompleted(status: string | null): boolean {
    if (!status) return false
    const s = status.toLowerCase()
    return s.includes('done') || s === 'completed' || s === 'closed'
}

function todayISO(): string {
    return new Date().toISOString().split('T')[0]
}

function daysAgoISO(n: number): string {
    const d = new Date()
    d.setDate(d.getDate() - n)
    return d.toISOString().split('T')[0]
}

function calcTrend(current: number, previous: number | null): number | null {
    if (previous === null || previous === 0) return null
    return ((current - previous) / previous) * 100
}

/** JSONB { key: count } → WorkstreamBarChart format */
function toWorkstreamArray(
    obj: Record<string, number> | null | undefined
): Array<{ name: string; count: number; color: string }> {
    if (!obj) return []
    return Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .map(([name, count], i) => ({ name, count, color: WS_COLORS[i % WS_COLORS.length] }))
}

/** JSONB { key: count } → InvestmentCategoryDonut format */
function toValueArray(
    obj: Record<string, number> | null | undefined,
    colorMap: Record<string, string>,
    fallbackColors: string[]
): Array<{ name: string; value: number; color: string }> {
    if (!obj) return []
    return Object.entries(obj)
        .sort((a, b) => b[1] - a[1])
        .map(([name, value], i) => ({
            name,
            value,
            color: colorMap[name] ?? fallbackColors[i % fallbackColors.length],
        }))
}

// ─── Zero-state fallback ──────────────────────────────────────────────────────

function zeroState(lastUpdated: string): ProjectsDashboardData {
    const noAlert = { count: 0, severity: 'None' as Severity }
    const noTrend = { weekly: null, monthly: null }
    return {
        totalProjects: 0,
        progress: { completed: 0, inProgress: 0, pending: 0 },
        byWorkstream: [],
        byInvestmentCategory: [],
        childDistribution: [],
        cards: { missingParents: 0, missingChildren: 0 },
        alerts: {
            missingCriticalDates: noAlert,
            behindSchedule: noAlert,
            closedOpenChildren: noAlert,
            statusInconsistency: noAlert,
        },
        alertTrends: {
            missingCriticalDates: noTrend,
            behindSchedule: noTrend,
            closedOpenChildren: noTrend,
            statusInconsistency: noTrend,
        },
        trendUnassigned: null,
        cardTrends: {
            missingParents: noTrend,
            missingChildren: noTrend,
        },
        raw: [],
        lastUpdated,
        hasData: false,
    }
}

// ─── Main function ─────────────────────────────────────────────────────────────

export async function getProjectsDashboardData(
    workstream?: string
): Promise<ProjectsDashboardData> {
    const supabase = createServiceClient()
    const today = todayISO()
    const sevenDaysAgo = daysAgoISO(7)
    const thirtyDaysAgo = daysAgoISO(30)

    // Historical snapshot columns needed for all trend computations
    const historicalCols = [
        'missing_critical_dates_count',
        'behind_schedule_count',
        'closed_open_children_count',
        'status_inconsistency_count',
        'missing_parents_count',
        'missing_children_count',
        'by_investment_category',
    ].join(', ')

    // Phase 1 (parallel): today's snapshot + historical snapshots + health rows + rollups
    const [rawSnap, rawWeeklySnap, rawMonthlySnap, rawHealth, rawRollups] = await Promise.all([
        supabase
            .from('project_metrics_snapshot')
            .select('*')
            .eq('snapshot_date', today)
            .eq('period', 'daily')
            .maybeSingle(),
        supabase
            .from('project_metrics_snapshot')
            .select(historicalCols)
            .eq('snapshot_date', sevenDaysAgo)
            .eq('period', 'daily')
            .maybeSingle(),
        supabase
            .from('project_metrics_snapshot')
            .select(historicalCols)
            .eq('snapshot_date', thirtyDaysAgo)
            .eq('period', 'daily')
            .maybeSingle(),
        supabase
            .from('project_health_latest')
            .select('*'),
        supabase
            .from('project_rollups_latest')
            .select('project_jira_issue_id, children_total, children_done, children_open'),
    ])

    const snap = rawSnap.data as SnapRow | null
    const weeklySnap = (rawWeeklySnap.data || {}) as Partial<SnapRow>
    const monthlySnap = (rawMonthlySnap.data || {}) as Partial<SnapRow>
    const health = (rawHealth.data ?? []) as HealthRow[]
    const rollups = (rawRollups.data ?? []) as Array<{ project_jira_issue_id: string, children_total: number, children_done: number, children_open: number }>

    // lastUpdated: prefer snapshot.generated_at, fallback to max health computed_at
    const maxHealthAt = health.map((h) => h.computed_at).filter(Boolean).sort().at(-1) ?? null
    const lastUpdated = snap?.generated_at ?? maxHealthAt ?? new Date().toISOString()

    if (!snap) {
        console.log('[projects] No snapshot for today — returning zero state')
        return zeroState(lastUpdated)
    }

    // Alert severities: max across rows where the flag is true
    const alerts = {
        missingCriticalDates: {
            count: snap.missing_critical_dates_count ?? 0,
            severity: maxSeverity(
                health.filter((h) => h.missing_critical_dates_flag).map((h) => h.severity_missing_dates)
            ),
        },
        behindSchedule: {
            count: snap.behind_schedule_count ?? 0,
            severity: maxSeverity(
                health.filter((h) => h.behind_schedule_flag).map((h) => h.severity_behind_schedule)
            ),
        },
        closedOpenChildren: {
            count: snap.closed_open_children_count ?? 0,
            severity: maxSeverity(
                health.filter((h) => h.closed_open_children_flag).map((h) => h.severity_closed_open_children)
            ),
        },
        statusInconsistency: {
            count: snap.status_inconsistency_count ?? 0,
            severity: maxSeverity(
                health.filter((h) => h.status_inconsistency_flag).map((h) => h.severity_status_inconsistency)
            ),
        },
    }

    const alertTrends = {
        missingCriticalDates: {
            weekly: calcTrend(snap.missing_critical_dates_count ?? 0, weeklySnap.missing_critical_dates_count ?? null),
            monthly: calcTrend(snap.missing_critical_dates_count ?? 0, monthlySnap.missing_critical_dates_count ?? null),
        },
        behindSchedule: {
            weekly: calcTrend(snap.behind_schedule_count ?? 0, weeklySnap.behind_schedule_count ?? null),
            monthly: calcTrend(snap.behind_schedule_count ?? 0, monthlySnap.behind_schedule_count ?? null),
        },
        closedOpenChildren: {
            weekly: calcTrend(snap.closed_open_children_count ?? 0, weeklySnap.closed_open_children_count ?? null),
            monthly: calcTrend(snap.closed_open_children_count ?? 0, monthlySnap.closed_open_children_count ?? null),
        },
        statusInconsistency: {
            weekly: calcTrend(snap.status_inconsistency_count ?? 0, weeklySnap.status_inconsistency_count ?? null),
            monthly: calcTrend(snap.status_inconsistency_count ?? 0, monthlySnap.status_inconsistency_count ?? null),
        },
    }

    // Card trends: missing parents & children vs historical snapshots
    const cardTrends = {
        missingParents: {
            weekly: calcTrend(snap.missing_parents_count ?? 0, weeklySnap.missing_parents_count ?? null),
            monthly: calcTrend(snap.missing_parents_count ?? 0, monthlySnap.missing_parents_count ?? null),
        },
        missingChildren: {
            weekly: calcTrend(snap.missing_children_count ?? 0, weeklySnap.missing_children_count ?? null),
            monthly: calcTrend(snap.missing_children_count ?? 0, monthlySnap.missing_children_count ?? null),
        },
    }


    // Convert JSONB fields to chart-ready arrays
    const byWorkstream = toWorkstreamArray(snap.by_workstream as Record<string, number> | null)
    const byInvestmentCategory = toValueArray(
        snap.by_investment_category as Record<string, number> | null,
        INV_CAT_COLORS,
        WS_COLORS
    )
    const childDistribution = toValueArray(
        snap.child_issue_type_distribution as Record<string, number> | null,
        {},
        DIST_COLORS
    )

    // Phase 2: fetch jira_issues.
    // Authoritative projects are those in project_health_latest (total 242).
    const projectIds = [...new Set([
        ...health.map((h) => h.project_jira_issue_id),
    ].filter(Boolean))]

    // Fetch Workstream Initiative IDs to validate parents
    const { data: initiativeData } = await supabase
        .from('jira_issues')
        .select('jira_issue_id')
        .eq('issue_type', 'Workstream Initiative')

    const initiativeIds = new Set(initiativeData?.map(i => i.jira_issue_id) || [])

    let projectsQuery = supabase
        .from('jira_issues')
        .select('jira_issue_id, jira_key, summary, status_name, status_category, workstream, investment_category, parent_jira_issue_id, start_date, due_date, created_at_jira')
        .in('jira_issue_id', projectIds)

    if (workstream && workstream !== 'All Workstreams') {
        projectsQuery = projectsQuery.eq('workstream', workstream)
    }

    const { data: rawJiraProjects, error: jiraError } = await projectsQuery

    if (jiraError) {
        console.error('[projects] Error fetching jira_issues:', jiraError)
    }

    // Build maps for health and rollups
    const healthMap = new Map<string, HealthRow>()
    for (const h of health) {
        if (h.project_jira_issue_id) healthMap.set(h.project_jira_issue_id, h)
    }

    const rollupMap = new Map<string, any>()
    for (const r of rollups) {
        if (r.project_jira_issue_id) rollupMap.set(r.project_jira_issue_id, r)
    }

    const jiraRows = (rawJiraProjects ?? []) as Array<{
        jira_issue_id: string
        jira_key: string
        summary: string | null
        status_category: string | null
        status_name: string | null
        workstream: string | null
        investment_category: string | null
        parent_jira_issue_id: string | null
        start_date: string | null
        due_date: string | null
        created_at_jira: string | null
    }>

    const raw: ProjectRow[] = jiraRows.map((p) => {
        const h = healthMap.get(p.jira_issue_id)
        const r = rollupMap.get(p.jira_issue_id)
        return {
            key: p.jira_key,
            summary: p.summary ?? '',
            status: p.status_category ?? p.status_name ?? '',
            workstream: p.workstream ?? null,
            assignee: null,
            investment_category: p.investment_category ?? null,
            parent_issue_key: p.parent_jira_issue_id ?? null,
            missing_critical_dates_flag: h?.missing_critical_dates_flag ?? false,
            behind_schedule_flag: h?.behind_schedule_flag ?? false,
            closed_open_children_flag: (h?.closed_open_children_flag ?? (isCompleted(p.status_category ?? p.status_name ?? '') && (r?.children_open ?? 0) > 0)) && (r && r.children_total > 0),
            status_inconsistency_flag: (h?.status_inconsistency_flag ?? false) && !(isCompleted(p.status_category ?? p.status_name ?? '') && (r?.children_total ?? 0) === 0),
            no_child_issues_flag: h?.no_child_issues_flag ?? (r ? r.children_total === 0 : true),
            missing_parent_flag: !p.parent_jira_issue_id,
            severity_missing_dates: h?.severity_missing_dates ?? null,
            severity_behind_schedule: h?.severity_behind_schedule ?? null,
            severity_closed_open_children: h?.severity_closed_open_children ?? null,
            severity_status_inconsistency: h?.severity_status_inconsistency ?? null,
            status_inconsistency_reason: h?.status_inconsistency_reason ?? null,
            children_total: r?.children_total ?? 0,
            children_done: r?.children_done ?? 0,
            start_date: p.start_date ?? null,
            due_date: p.due_date ?? null,
        }
    })

    // ── 3. Support Workstream Filter for aggregates ──────────────────────────
    const isWsFiltered = workstream && workstream !== 'All Workstreams'

    // --- Calculate authoritative aggregates from live raw data ---
    const wsCounts: Record<string, number> = {}
    const invCounts: Record<string, number> = {}

    raw.forEach(p => {
        const ws = p.workstream || 'Unassigned'
        const inv = p.investment_category || 'Unassigned'
        wsCounts[ws] = (wsCounts[ws] || 0) + 1
        invCounts[inv] = (invCounts[inv] || 0) + 1
    })

    let finalByWorkstream = toWorkstreamArray(wsCounts)
    let finalByInvestmentCategory = toValueArray(invCounts, INV_CAT_COLORS, WS_COLORS)
    let finalChildDistribution = childDistribution.filter(d =>
        d.name.toLowerCase() !== 'sub-task' &&
        d.name.toLowerCase() !== 'sub task' &&
        d.name.toLowerCase() !== 'subtask'
    )

    if (isWsFiltered) {
        const projectIds = raw.map(p => {
            // We need the jira_issue_id to query children
            const row = jiraRows.find(jr => jr.jira_key === p.key)
            return row?.jira_issue_id
        }).filter(Boolean) as string[]


        // Re-calculate child distribution if we have project IDs
        if (projectIds.length > 0) {
            const { data: childTypes } = await supabase
                .from('jira_issues')
                .select('issue_type')
                .in('parent_jira_issue_id', projectIds)

            if (childTypes) {
                const typeCounts: Record<string, number> = {}
                childTypes.forEach(c => {
                    const type = c.issue_type || 'Unknown'
                    typeCounts[type] = (typeCounts[type] || 0) + 1
                })
                finalChildDistribution = toValueArray(typeCounts, {}, DIST_COLORS).filter(d =>
                    d.name.toLowerCase() !== 'sub-task' &&
                    d.name.toLowerCase() !== 'sub task' &&
                    d.name.toLowerCase() !== 'subtask'
                )
            }
        }
    }

    // Total projects for the view
    const totalProjects = raw.length

    // Progress - Always use calculated counts for consistency
    const progress = {
        completed: raw.filter(p => p.status === 'Done' || p.status === 'Done (Done)').length,
        inProgress: raw.filter(p => p.status === 'In Progress').length,
        pending: raw.filter(p => p.status !== 'Done' && p.status !== 'Done (Done)' && p.status !== 'In Progress').length
    }

    // Alerts - Always use calculated counts for consistency with modals
    const finalAlerts = {
        missingCriticalDates: { count: raw.filter(p => p.missing_critical_dates_flag).length, severity: maxSeverity(raw.filter(p => p.missing_critical_dates_flag).map(p => p.severity_missing_dates)) },
        behindSchedule: { count: raw.filter(p => p.behind_schedule_flag).length, severity: maxSeverity(raw.filter(p => p.behind_schedule_flag).map(p => p.severity_behind_schedule)) },
        closedOpenChildren: { count: raw.filter(p => p.closed_open_children_flag).length, severity: maxSeverity(raw.filter(p => p.closed_open_children_flag).map(p => p.severity_closed_open_children)) },
        statusInconsistency: { count: raw.filter(p => p.status_inconsistency_flag).length, severity: maxSeverity(raw.filter(p => p.status_inconsistency_flag).map(p => p.severity_status_inconsistency)) },
    }

    // Cards - Always use calculated counts for consistency with modals
    const cards = {
        missingParents: raw.filter(p => p.missing_parent_flag).length,
        missingChildren: raw.filter(p => p.no_child_issues_flag).length,
    }

    // Investment Category Unassigned trend (weekly) - use live count for today
    const weeklyByCat = weeklySnap.by_investment_category as Record<string, number> | null
    const weeklyUnassigned = weeklyByCat?.['Unassigned'] ?? null
    const trendUnassigned = calcTrend(invCounts['Unassigned'] ?? 0, weeklyUnassigned)

    console.log(
        `[projects] snapshot loaded | total=${snap.total_projects} | raw=${raw.length}`,
        '| alerts:', Object.fromEntries(
            Object.entries(alerts).map(([k, v]) => [k, `${v.count} (${v.severity})`])
        )
    )

    return {
        totalProjects,
        progress,
        byWorkstream: finalByWorkstream,
        byInvestmentCategory: finalByInvestmentCategory,
        childDistribution: finalChildDistribution,
        cards,
        alerts: finalAlerts,
        alertTrends,
        trendUnassigned,
        cardTrends,
        raw,
        lastUpdated,
        hasData: true,
    }
}
