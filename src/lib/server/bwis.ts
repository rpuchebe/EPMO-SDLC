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

export async function getPhase2BwiSnapshotData(): Promise<BwiSectionDTO> {
    const supabase = createServiceClient()

    const today = todayISO()
    const { data: snapshotData, error } = await supabase
        .from('bwi_metrics_snapshot')
        .select('*')
        .eq('snapshot_date', today)
        .eq('period', 'daily')
        .maybeSingle()

    if (error) {
        console.error('[bwis] Snapshot fetch failed:', error.message)
    }

    // Default zero-state DTO
    let dto: BwiSectionDTO = {
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
            statusInconsistency: { count: 0, severity: 'None' }
        },
        topAtRisk: [],
        raw: []
    }

    if (snapshotData) {
        // Map JSONB to arrays with colors
        const byWorkstream = Object.entries(snapshotData.by_workstream || {}).map(([name, count], i) => ({
            name,
            count: Number(count),
            color: WS_COLORS[i % WS_COLORS.length]
        })).sort((a, b) => b.count - a.count)

        const byInvestmentCategory = Object.entries(snapshotData.by_investment_category || {}).map(([name, value]) => ({
            name,
            value: Number(value),
            color: INV_CAT_COLORS[name] || '#94a3b8'
        })).filter(c => c.value > 0).sort((a, b) => b.value - a.value)

        const childDistribution = Object.entries(snapshotData.child_issue_type_distribution || {}).map(([name, value], i) => ({
            name,
            value: Number(value),
            color: CHILD_DISTR_COLORS[i % CHILD_DISTR_COLORS.length]
        })).filter(c => c.value > 0).sort((a, b) => b.value - a.value)

        // compute severities (dumb heuristic)
        const sev = (count: number, t: number) => count > t * 0.1 ? 'High' : count > t * 0.05 ? 'Medium' : count > 0 ? 'Low' : 'None'
        const tBwis = snapshotData.total_bwi || 0

        dto = {
            totalBwis: tBwis,
            inProgress: snapshotData.progress_in_progress || 0,
            pending: snapshotData.progress_pending || 0,
            done: snapshotData.progress_completed || 0,
            byWorkstream,
            byInvestmentCategory,
            childDistribution,
            alerts: {
                missingDates: { count: snapshotData.missing_critical_dates_count || 0, severity: sev(snapshotData.missing_critical_dates_count || 0, tBwis) },
                behindSchedule: { count: snapshotData.behind_schedule_count || 0, severity: sev(snapshotData.behind_schedule_count || 0, tBwis) },
                noChildIssues: { count: snapshotData.missing_children_count || 0, severity: sev(snapshotData.missing_children_count || 0, tBwis) },
                closedOpenChildren: { count: snapshotData.closed_open_children_count || 0, severity: sev(snapshotData.closed_open_children_count || 0, tBwis) },
                statusInconsistency: { count: snapshotData.status_inconsistency_count || 0, severity: sev(snapshotData.status_inconsistency_count || 0, tBwis) },
            },
            // The UI expects these, but they aren't part of the direct snapshot right now, 
            // returning empty to satisfy UI types without crashing
            topAtRisk: [],
            raw: []
        }

            // Pass the generated_at date up hidden in 'raw' array if needed, or we can just pass it directly.
            // We will pass it via a custom prop since the DTO doesn't explicitly have it, or we can just return it.
            // The API route can extract it if we attach it.
            ; (dto as any).generated_at = snapshotData.generated_at
    }

    return dto
}
