/**
 * Server-side data fetching for Phase 4: Development & Testing.
 * Primary source: jira_issues table.
 * Extension points for GitHub, sprints, cycle-time noted inline.
 */

import { createServiceClient } from '@/utils/supabase/service'

export type StatusCategory = 'To Do' | 'In Progress' | 'Done'

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
}

export interface AggItem {
    label: string
    count: number
    pct: number
}

export interface Phase4DTO {
    issues: Phase4Issue[]
    byType: AggItem[]
    byStatus: AggItem[]
    byInvestment: AggItem[]
    total: number
    totalDone: number
    totalInProgress: number
    totalToDo: number
    completionRate: number   // 0–100
    workstream: string
    team: string
    lastUpdated: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

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
].join(', ')

function toStatusCategory(raw: string | null): StatusCategory {
    if (!raw) return 'To Do'
    const s = raw.toLowerCase()
    if (s === 'done' || s === 'closed' || s === 'completed' || s.startsWith('done')) return 'Done'
    if (
        s.includes('progress') || s.includes('review') ||
        s.includes('testing') || s.includes('deploy') || s.includes('qa')
    ) return 'In Progress'
    return 'To Do'
}

function toPct(n: number, total: number): number {
    return total > 0 ? Math.round((n / total) * 100) : 0
}

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
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function getPhase4Data(workstream?: string, _team?: string): Promise<Phase4DTO> {
    const supabase = createServiceClient()

    // Exclude top-level Workstream Initiatives (depth-0 containers)
    let query = supabase
        .from('jira_issues')
        .select(ISSUE_COLS)
        .not('issue_type', 'eq', 'Workstream Initiative')
        .order('jira_key')
        .limit(5000)

    if (workstream && workstream !== 'All Workstreams') {
        query = query.eq('workstream', workstream)
    }

    const { data, error } = await query
    if (error) throw new Error(`[phase4] ${error.message}`)

    const raw = (data ?? []) as unknown as RawRow[]

    const issues: Phase4Issue[] = raw.map(r => ({
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
    }))

    const total = issues.length
    const totalDone = issues.filter(i => i.statusCategory === 'Done').length
    const totalInProgress = issues.filter(i => i.statusCategory === 'In Progress').length
    const totalToDo = issues.filter(i => i.statusCategory === 'To Do').length

    // By issue type
    const typeCounts: Record<string, number> = {}
    for (const i of issues) typeCounts[i.issueType] = (typeCounts[i.issueType] || 0) + 1
    const byType: AggItem[] = Object.entries(typeCounts)
        .map(([label, count]) => ({ label, count, pct: toPct(count, total) }))
        .sort((a, b) => b.count - a.count)

    // By status category
    const byStatus: AggItem[] = [
        { label: 'Done', count: totalDone, pct: toPct(totalDone, total) },
        { label: 'In Progress', count: totalInProgress, pct: toPct(totalInProgress, total) },
        { label: 'To Do', count: totalToDo, pct: toPct(totalToDo, total) },
    ]

    // By investment category
    const invCounts: Record<string, number> = {}
    for (const i of issues) {
        const cat = i.investmentCategory || 'Uncategorized'
        invCounts[cat] = (invCounts[cat] || 0) + 1
    }
    const byInvestment: AggItem[] = Object.entries(invCounts)
        .map(([label, count]) => ({ label, count, pct: toPct(count, total) }))
        .sort((a, b) => b.count - a.count)

    console.log(`[phase4] ${total} issues | done=${totalDone} wip=${totalInProgress} todo=${totalToDo}`)

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
    }
}
