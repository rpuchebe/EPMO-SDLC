/**
 * Server-side data fetching for the Business Work Items (BWI) dashboard section.
 * Uses the Supabase service role key.
 */

import { createServiceClient } from '@/utils/supabase/service'

export interface BwiRow {
    id: string
    key: string
    summary: string
    status: string
    status_category: 'To Do' | 'In Progress' | 'Done'
    workstream: string | null
    investment_category: string | null
    start_date: string | null
    due_date: string | null
    open_children_count: number
    children_total: number

    // Governance flags
    missing_dates_flag: boolean
    behind_schedule_flag: boolean
    no_child_issues_flag: boolean
    closed_open_children_flag: boolean
    status_inconsistency_flag: boolean

    risk_score: number
}

// ─── Color palettes ───────────────────────────────────────────────────────────

const WS_COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#f43f5e', '#06b6d4', '#84cc16', '#a855f7',
]

const INV_CAT_COLORS: Record<string, string> = {
    'Strategic Innovation': '#10b981',
    'Scale & Reliability': '#3b82f6',
    'Revenue-Commit': '#8b5cf6',
    'Sales Activation': '#f59e0b',
    'Support': '#f43f5e',
    'Unassigned': '#94a3b8',
}

const CHILD_DISTR_COLORS = [
    '#8b5cf6', '#f59e0b', '#3b82f6', '#10b981', '#f43f5e', '#06b6d4', '#84cc16'
]

export interface BwiSectionDTO {
    totalBwis: number
    inProgress: number
    pending: number
    done: number

    byWorkstream: Array<{ name: string; count: number; color: string }>
    byInvestmentCategory: Array<{ name: string; value: number; color: string }>
    childDistribution: Array<{ name: string; value: number; color: string }>

    alerts: {
        missingDates: { count: number; severity: string }
        behindSchedule: { count: number; severity: string }
        noChildIssues: { count: number; severity: string }
        closedOpenChildren: { count: number; severity: string }
        statusInconsistency: { count: number; severity: string }
    }

    topAtRisk: BwiRow[]
    raw: BwiRow[]
}

function todayISO(): string {
    return new Date().toISOString().split('T')[0]
}

// ─── Shared fetch helper ──────────────────────────────────────────────────────
// Returns ALL BWIs with health flags and computed risk scores.
// Single source of truth — used by both getTopBwisAtRisk and getPhase2BwiSnapshotData.

async function fetchAllBwisWithFlags(
    workstream: string = 'All Workstreams',
    search: string = '',
    hideClosed: boolean = false,
): Promise<BwiRow[]> {
    const supabase = createServiceClient()
    const now = todayISO()

    // Fetch Jira issues
    let query = supabase
        .from('jira_issues')
        .select('jira_issue_id, jira_key, summary, status_name, status_category, workstream, investment_category, start_date, due_date, updated_at_jira')
        .in('issue_type', ['Business Epic', 'Enhancement', 'New Feature', 'Maintenance (RTB)', 'Issue', 'Epic'])

    if (workstream !== 'All Workstreams') {
        query = query.eq('workstream', workstream)
    }
    if (search) {
        query = query.or(`jira_key.ilike.%${search}%,summary.ilike.%${search}%`)
    }
    if (hideClosed) {
        query = query.neq('status_category', 'Done')
    }

    const { data: issuesData, error: issuesError } = await query.limit(2000)

    if (issuesError || !issuesData) {
        console.error('[bwis] fetchAllBwisWithFlags failed:', issuesError?.message)
        return []
    }

    // Since we can't reliably join views via PostgREST without explicit relations,
    // we fetch health and rollups separately and join in memory.
    const bwiIds = issuesData.map(i => i.jira_issue_id)

    const [healthRes, rollupsRes] = await Promise.all([
        supabase.from('bwi_health_latest').select('*').in('bwi_jira_issue_id', bwiIds),
        supabase.from('bwi_rollups_latest').select('*').in('bwi_jira_issue_id', bwiIds)
    ])

    const healthMap = new Map((healthRes.data || []).map(h => [h.bwi_jira_issue_id, h]))
    const rollupsMap = new Map((rollupsRes.data || []).map(r => [r.bwi_jira_issue_id, r]))

    return issuesData.map((bwi: any) => {
        let score = 0
        const health = healthMap.get(bwi.jira_issue_id) || {}
        const rollups = rollupsMap.get(bwi.jira_issue_id) || {}

        if (bwi.due_date && bwi.due_date < now && bwi.status_category !== 'Done') score += 3
        if (bwi.start_date && bwi.start_date < now && bwi.status_category === 'To Do') score += 2
        if (health.missing_critical_dates_flag) score += 2
        if (health.closed_open_children_flag) score += 2
        if (health.status_inconsistency_flag) score += 2
        if (health.no_child_issues_flag) score += 1
        if (health.children_activity_mismatch_flag) score += 1
        const openChildren = rollups.children_open || 0
        score += Math.floor(Math.min(openChildren, 10) / 2)

        return {
            id: bwi.jira_issue_id,
            key: bwi.jira_key,
            summary: bwi.summary,
            status: bwi.status_name,
            status_category: bwi.status_category,
            workstream: bwi.workstream,
            investment_category: bwi.investment_category,
            start_date: bwi.start_date,
            due_date: bwi.due_date,
            open_children_count: openChildren,
            children_total: rollups.children_total || 0,
            missing_dates_flag: health.missing_critical_dates_flag || false,
            behind_schedule_flag: health.behind_schedule_flag || false,
            no_child_issues_flag: health.no_child_issues_flag || false,
            closed_open_children_flag: health.closed_open_children_flag || false,
            status_inconsistency_flag: health.status_inconsistency_flag || false,
            risk_score: score,
        } as BwiRow
    })
}

// ─── Public exports ───────────────────────────────────────────────────────────

export async function getTopBwisAtRisk(
    workstream: string = 'All Workstreams',
    search: string = '',
    _dateWindow: string = 'all',
    hideClosed: boolean = false,
): Promise<BwiRow[]> {
    const all = await fetchAllBwisWithFlags(workstream, search, hideClosed)
    return all
        .filter(d => d.risk_score > 0)
        .sort((a, b) => {
            if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score
            if (!a.due_date && b.due_date) return 1
            if (a.due_date && !b.due_date) return -1
            if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
            return 0
        })
        .slice(0, 10)
}

export async function getPhase2BwiSnapshotData(
    workstream: string = 'All Workstreams',
    search: string = '',
    _dateWindow: string = 'all',
    hideClosed: boolean = false,
): Promise<BwiSectionDTO> {
    const supabase = createServiceClient()
    const today = todayISO()

    // The snapshot is a global aggregate (not workstream-aware).
    // Only use it for the completely unfiltered "All Workstreams" view.
    // For any filtered view, derive everything from the live rawAll query.
    const useSnapshot = workstream === 'All Workstreams' && !search && !hideClosed

    // Run raw fetch always; snapshot only when unfiltered
    const rawPromise = fetchAllBwisWithFlags(workstream, search, hideClosed)
    const snapshotPromise = useSnapshot
        ? supabase
            .from('bwi_metrics_snapshot')
            .select('*')
            .eq('snapshot_date', today)
            .eq('period', 'daily')
            .maybeSingle()
        : Promise.resolve(null)

    const [rawResult, snapshotResult] = await Promise.allSettled([rawPromise, snapshotPromise])

    const rawAll: BwiRow[] = rawResult.status === 'fulfilled' ? rawResult.value : []

    if (snapshotResult.status === 'rejected') {
        console.error('[bwis] Snapshot fetch failed:', snapshotResult.reason)
    }
    // When useSnapshot=false, snapshotResult.value is null (Promise.resolve(null))
    // When useSnapshot=true, snapshotResult.value is the Supabase response { data, error }
    const snapshotResponse = snapshotResult.status === 'fulfilled' ? snapshotResult.value : null
    const snapshotData = (snapshotResponse && typeof snapshotResponse === 'object' && 'data' in snapshotResponse)
        ? (snapshotResponse as any).data
        : null

    // Derive topAtRisk from rawAll (avoids a second DB round-trip)
    const topAtRisk = [...rawAll]
        .filter(r => r.risk_score > 0)
        .sort((a, b) => {
            if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score
            if (!a.due_date && b.due_date) return 1
            if (a.due_date && !b.due_date) return -1
            if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
            return 0
        })
        .slice(0, 10)

    // Default zero-state DTO
    const dto: BwiSectionDTO = {
        totalBwis: 0,
        inProgress: 0,
        pending: 0,
        done: 0,
        byWorkstream: [],
        byInvestmentCategory: [],
        childDistribution: [],
        alerts: {
            missingDates: { count: 0, severity: 'None' },
            behindSchedule: { count: 0, severity: 'None' },
            noChildIssues: { count: 0, severity: 'None' },
            closedOpenChildren: { count: 0, severity: 'None' },
            statusInconsistency: { count: 0, severity: 'None' },
        },
        topAtRisk,
        raw: rawAll,
    }

    if (snapshotData) {
        const byWorkstream = Object.entries(snapshotData.by_workstream || {})
            .map(([name, count], i) => ({ name, count: Number(count), color: WS_COLORS[i % WS_COLORS.length] }))
            .sort((a, b) => b.count - a.count)

        const byInvestmentCategory = Object.entries(snapshotData.by_investment_category || {})
            .map(([name, value]) => ({ name, value: Number(value), color: INV_CAT_COLORS[name] || '#94a3b8' }))
            .filter(c => c.value > 0)
            .sort((a, b) => b.value - a.value)

        const ALLOWED_CHILD_TYPES = ['Story', 'Task', 'Bug', 'Clarification', 'Hot Fix', 'Change', 'Business Task']
        const childDistribution = Object.entries(snapshotData.child_issue_type_distribution || {})
            .filter(([name]) => ALLOWED_CHILD_TYPES.includes(name))
            .map(([name, value], i) => ({ name, value: Number(value), color: CHILD_DISTR_COLORS[i % CHILD_DISTR_COLORS.length] }))
            .filter(c => c.value > 0)
            .sort((a, b) => b.value - a.value)

        const sev = (count: number, t: number) =>
            count > t * 0.1 ? 'High' : count > t * 0.05 ? 'Medium' : count > 0 ? 'Low' : 'None'
        const tBwis = snapshotData.total_bwi || 0

        dto.totalBwis = tBwis
        dto.inProgress = snapshotData.progress_in_progress || 0
        dto.pending = snapshotData.progress_pending || 0
        dto.done = snapshotData.progress_completed || 0
        dto.byWorkstream = byWorkstream
        dto.byInvestmentCategory = byInvestmentCategory
        dto.childDistribution = childDistribution
        dto.alerts = {
            missingDates: { count: snapshotData.missing_critical_dates_count || 0, severity: sev(snapshotData.missing_critical_dates_count || 0, tBwis) },
            behindSchedule: { count: snapshotData.behind_schedule_count || 0, severity: sev(snapshotData.behind_schedule_count || 0, tBwis) },
            noChildIssues: { count: snapshotData.missing_children_count || 0, severity: sev(snapshotData.missing_children_count || 0, tBwis) },
            closedOpenChildren: { count: snapshotData.closed_open_children_count || 0, severity: sev(snapshotData.closed_open_children_count || 0, tBwis) },
            statusInconsistency: { count: snapshotData.status_inconsistency_count || 0, severity: sev(snapshotData.status_inconsistency_count || 0, tBwis) },
        };
        (dto as any).generated_at = snapshotData.generated_at
    } else {
        // Fallback: derive from raw when no snapshot exists OR when filters are active.
        // The snapshot is a global aggregate and cannot reflect workstream/search filters.
        const tBwis = rawAll.length
        const sev = (count: number) =>
            count > tBwis * 0.1 ? 'High' : count > tBwis * 0.05 ? 'Medium' : count > 0 ? 'Low' : 'None'

        const wsCounts: Record<string, number> = {}
        const invCatCounts: Record<string, number> = {}
        for (const r of rawAll) {
            const ws = r.workstream || 'Unassigned'
            wsCounts[ws] = (wsCounts[ws] || 0) + 1
            const cat = r.investment_category || 'Unassigned'
            invCatCounts[cat] = (invCatCounts[cat] || 0) + 1
        }

        const missingDates = rawAll.filter(r => r.missing_dates_flag).length
        const behindSchedule = rawAll.filter(r => r.behind_schedule_flag).length
        const noChildren = rawAll.filter(r => r.no_child_issues_flag).length
        const closedOpen = rawAll.filter(r => r.closed_open_children_flag).length
        const statusInc = rawAll.filter(r => r.status_inconsistency_flag).length

        dto.totalBwis = tBwis
        dto.done = rawAll.filter(r => r.status_category === 'Done').length
        dto.inProgress = rawAll.filter(r => r.status_category === 'In Progress').length
        dto.pending = rawAll.filter(r => r.status_category === 'To Do').length
        dto.byWorkstream = Object.entries(wsCounts)
            .map(([name, count], i) => ({ name, count, color: WS_COLORS[i % WS_COLORS.length] }))
            .sort((a, b) => b.count - a.count)
        dto.byInvestmentCategory = Object.entries(invCatCounts)
            .filter(([, v]) => v > 0)
            .map(([name, value]) => ({ name, value, color: INV_CAT_COLORS[name] || '#94a3b8' }))
            .sort((a, b) => b.value - a.value)
        // childDistribution requires a separate children query; leave empty in filtered mode
        dto.childDistribution = []
        dto.alerts = {
            missingDates: { count: missingDates, severity: sev(missingDates) },
            behindSchedule: { count: behindSchedule, severity: sev(behindSchedule) },
            noChildIssues: { count: noChildren, severity: sev(noChildren) },
            closedOpenChildren: { count: closedOpen, severity: sev(closedOpen) },
            statusInconsistency: { count: statusInc, severity: sev(statusInc) },
        }
    }

    return dto
}
