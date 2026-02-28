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

export async function getPhase2BwiSectionData(
    workstream?: string,
    search?: string,
    dateWindow?: string,
    hideClosed?: boolean
): Promise<BwiSectionDTO> {
    const supabase = createServiceClient()

    // 1. Fetch ancestry tree elements to resolve investment category
    const { data: ancestryData, error: ancError } = await supabase
        .from('jira_issues')
        .select('jira_issue_id, issue_type, parent_jira_issue_id, investment_category')
    
    if (ancError) throw new Error(`[bwis] Ancestry fetch failed: ${ancError.message}`)

    const parentMap = new Map<string, string>()
    const typeMap = new Map<string, string>()
    const invCatMap = new Map<string, string>()

    for (const row of (ancestryData || [])) {
        parentMap.set(row.jira_issue_id, row.parent_jira_issue_id || '')
        typeMap.set(row.jira_issue_id, row.issue_type || '')
        if (row.issue_type === 'Workstream Initiative' && row.investment_category) {
            invCatMap.set(row.jira_issue_id, row.investment_category)
        }
    }

    function resolveInvestmentCategory(id: string): string {
        let curr = id
        for (let i = 0; i < 5; i++) {
            if (!curr) break
            const t = typeMap.get(curr)
            if (t === 'Workstream Initiative') {
                return invCatMap.get(curr) || 'Unassigned'
            }
            curr = parentMap.get(curr) || ''
        }
        return 'Unassigned'
    }

    // 2. Fetch BWIs
    let query = supabase
        .from('jira_issues')
        .select(`
            jira_issue_id,
            jira_key,
            summary,
            status_name,
            status_category,
            workstream,
            start_date,
            due_date,
            parent_jira_issue_id,
            created_at_jira
        `)
        .eq('issue_type', 'Business Work items')

    if (workstream && workstream !== 'All Workstreams') {
        query = query.eq('workstream', workstream)
    }

    const { data: bwisData, error: bwisError } = await query
    if (bwisError) throw new Error(`[bwis] BWI fetch failed: ${bwisError.message}`)

    let bwis = bwisData || []

    // ── Apply JS filters ──
    if (dateWindow && dateWindow !== 'all') {
        const days = parseInt(dateWindow, 10)
        if (!isNaN(days)) {
            const cutoff = new Date()
            cutoff.setDate(cutoff.getDate() - days)
            bwis = bwis.filter(b => b.created_at_jira && new Date(b.created_at_jira) >= cutoff)
        }
    }

    if (hideClosed) {
        bwis = bwis.filter(b => b.status_category !== 'Done')
    }

    if (search) {
        const lowerSearch = search.toLowerCase()
        bwis = bwis.filter(b => 
            (b.jira_key?.toLowerCase().includes(lowerSearch)) || 
            (b.summary?.toLowerCase().includes(lowerSearch))
        )
    }

    const bwiIds = bwis.map(b => b.jira_issue_id)

    // 3. Fetch children
    const childrenData: any[] = []
    if (bwiIds.length > 0) {
        const chunkSize = 800
        for (let i = 0; i < bwiIds.length; i += chunkSize) {
            const chunk = bwiIds.slice(i, i + chunkSize)
            const { data: cData, error: cErr } = await supabase
                .from('jira_issues')
                .select('parent_jira_issue_id, status_category, issue_type')
                .in('parent_jira_issue_id', chunk)
            if (cData) childrenData.push(...cData)
        }
    }

    const bwiChildrenMap = new Map<string, { total: number, open: number, inProgress: number, done: number, types: Record<string, number> }>()
    for (const id of bwiIds) {
        bwiChildrenMap.set(id, { total: 0, open: 0, inProgress: 0, done: 0, types: {} })
    }
    for (const c of childrenData) {
        const parentId = c.parent_jira_issue_id
        const map = bwiChildrenMap.get(parentId)
        if (map) {
            map.total++
            const cat = c.status_category || 'To Do'
            if (cat === 'Done') map.done++
            else if (cat === 'In Progress') map.inProgress++
            else map.open++

            const t = c.issue_type || 'Unknown'
            map.types[t] = (map.types[t] || 0) + 1
        }
    }

    const today = todayISO()
    const resultRows: BwiRow[] = []
    
    let totalBwis = 0
    let inProgress = 0
    let pending = 0
    let done = 0

    const wsCounts: Record<string, number> = {}
    const invCounts: Record<string, number> = {}
    const childTypeCounts: Record<string, number> = {}

    let alertsMissingDates = 0
    let alertsBehindSchedule = 0
    let alertsNoChildren = 0
    let alertsClosedOpen = 0
    let alertsStatusInconsistent = 0

    for (const b of bwis) {
        totalBwis++
        const cat = b.status_category || 'To Do'
        if (cat === 'Done') done++
        else if (cat === 'In Progress') inProgress++
        else pending++

        const ws = b.workstream || 'Unassigned'
        wsCounts[ws] = (wsCounts[ws] || 0) + 1

        const invCat = resolveInvestmentCategory(b.jira_issue_id)
        invCounts[invCat] = (invCounts[invCat] || 0) + 1

        const cMap = bwiChildrenMap.get(b.jira_issue_id)!
        for (const [t, count] of Object.entries(cMap.types)) {
            childTypeCounts[t] = (childTypeCounts[t] || 0) + count
        }

        // Rules
        const missingDates = !b.start_date || !b.due_date
        const behindSchedule = 
            (b.due_date && b.due_date < today && cat !== 'Done') || 
            (b.start_date && b.start_date < today && cat === 'To Do')
        const noChild = cMap.total === 0
        const closedOpen = cat === 'Done' && cMap.total > cMap.done
        const statusIncon = cat === 'To Do' && (cMap.inProgress > 0 || cMap.done > 0)

        // Count for alerts
        if (missingDates) alertsMissingDates++
        if (behindSchedule) alertsBehindSchedule++
        if (noChild) alertsNoChildren++
        if (closedOpen) alertsClosedOpen++
        if (statusIncon) alertsStatusInconsistent++

        // Score
        let score = 0
        if (behindSchedule) score += 3
        if (missingDates) score += 2
        if (closedOpen) score += 2
        if (statusIncon) score += 1

        resultRows.push({
            id: b.jira_issue_id,
            key: b.jira_key || '',
            summary: b.summary || '',
            status: b.status_name || '',
            status_category: cat as 'To Do' | 'In Progress' | 'Done',
            workstream: ws,
            investment_category: invCat,
            start_date: b.start_date || null,
            due_date: b.due_date || null,
            open_children_count: cMap.open + cMap.inProgress,
            children_total: cMap.total,
            missing_dates_flag: missingDates,
            behind_schedule_flag: !!behindSchedule,
            no_child_issues_flag: noChild,
            closed_open_children_flag: closedOpen,
            status_inconsistency_flag: !!statusIncon,
            risk_score: score
        })
    }

    const byWorkstream = Object.entries(wsCounts)
        .map(([name, count], i) => ({ name, count, color: WS_COLORS[i % WS_COLORS.length] }))
        .sort((a, b) => b.count - a.count)

    const byInvestmentCategory = Object.entries(invCounts)
        .map(([name, value]) => ({ name, value, color: INV_CAT_COLORS[name] || '#94a3b8' }))
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value)

    const childDistribution = Object.entries(childTypeCounts)
        .map(([name, value], i) => ({ name, value, color: CHILD_DISTR_COLORS[i % CHILD_DISTR_COLORS.length] }))
        .filter(c => c.value > 0)
        .sort((a, b) => b.value - a.value)

    const topAtRisk = [...resultRows].sort((a, b) => b.risk_score - a.risk_score).slice(0, 10)

    // compute severities (dumb heuristic)
    const sev = (count: number, t: number) => count > t * 0.1 ? 'High' : count > t * 0.05 ? 'Medium' : count > 0 ? 'Low' : 'None'

    return {
        totalBwis,
        inProgress,
        pending,
        done,
        byWorkstream,
        byInvestmentCategory,
        childDistribution,
        alerts: {
            missingDates: { count: alertsMissingDates, severity: sev(alertsMissingDates, totalBwis) },
            behindSchedule: { count: alertsBehindSchedule, severity: sev(alertsBehindSchedule, totalBwis) },
            noChildIssues: { count: alertsNoChildren, severity: sev(alertsNoChildren, totalBwis) },
            closedOpenChildren: { count: alertsClosedOpen, severity: sev(alertsClosedOpen, totalBwis) },
            statusInconsistency: { count: alertsStatusInconsistent, severity: sev(alertsStatusInconsistent, totalBwis) },
        },
        topAtRisk,
        raw: resultRows
    }
}
