/**
 * Server-side data fetching for the Phase 3 Roadmap Gantt chart.
 * Builds a full 4-level hierarchy: Initiative → Project → BWI → Task.
 * Uses the Supabase service role key — never call from client components.
 */

import { createServiceClient } from '@/utils/supabase/service'

// ─── Types ────────────────────────────────────────────────────────────────────

export type StatusCategory = 'To Do' | 'In Progress' | 'Done'

export interface RoadmapNode {
    id: string              // jira_issue_id (UUID)
    key: string             // jira_key
    summary: string
    issueType: string       // issue_type
    statusName: string      // status_name (raw Jira status)
    statusCategory: StatusCategory
    startDate: string | null
    dueDate: string | null
    assignee: string | null
    workstream: string | null
    investmentCategory: string | null
    parentId: string | null // parent_jira_issue_id UUID
    childIds: string[]
    depth: number           // 0=Initiative, 1=Project, 2=BWI, 3=Task
    childrenTotal: number   // direct children count in tree
    childrenDone: number    // direct children with Done status
    percentComplete: number // 0–100
    hiddenMissingDatesCount: number // descendants missing start OR due date
}

export interface RoadmapDTO {
    nodes: Record<string, RoadmapNode>
    rootIds: string[]
    minDate: string | null  // earliest start_date across all nodes
    maxDate: string | null  // latest due_date across all nodes
    lastUpdated: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Note: 'assignee' is excluded — the column does not exist in jira_issues.
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

function toStatusCategory(raw: string | null | undefined): StatusCategory {
    if (!raw) return 'To Do'
    const s = raw.toLowerCase()
    if (s === 'done' || s === 'closed' || s === 'completed' || s.startsWith('done')) return 'Done'
    if (s.includes('progress')) return 'In Progress'
    return 'To Do'
}

type RawIssue = {
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

// ─── Main function ────────────────────────────────────────────────────────────

export async function getRoadmapData(workstream?: string): Promise<RoadmapDTO> {
    const supabase = createServiceClient()

    // ── Phase 1: Workstream Initiatives (root level) ──────────────────────────
    let query = supabase
        .from('jira_issues')
        .select(ISSUE_COLS)
        .eq('issue_type', 'Workstream Initiative')
        .order('jira_key')

    if (workstream && workstream !== 'All Workstreams') {
        query = query.eq('workstream', workstream)
    }

    const { data: rawInitiatives, error: initError } = await query

    // Throw on query errors so the route handler surfaces them — prevents
    // silent empty results that are hard to debug.
    if (initError) throw new Error(`[roadmap] initiatives: ${initError.message}`)

    const initiatives: RawIssue[] = (rawInitiatives ?? []) as unknown as RawIssue[]
    const initiativeIds = initiatives.map((i) => i.jira_issue_id)

    // ── Phase 2: Level 2 (children of initiatives) ────────────────────────────
    let level2: RawIssue[] = []
    if (initiativeIds.length > 0) {
        const { data, error } = await supabase
            .from('jira_issues')
            .select(ISSUE_COLS)
            .in('parent_jira_issue_id', initiativeIds)
            .order('jira_key')
        if (error) throw new Error(`[roadmap] level2: ${error.message}`)
        level2 = (data ?? []) as unknown as RawIssue[]
    }

    const level2Ids = level2.map((p) => p.jira_issue_id)

    // ── Phase 3: Level 3 (children of level 2) ────────────────────────────────
    let level3: RawIssue[] = []
    if (level2Ids.length > 0) {
        const { data, error } = await supabase
            .from('jira_issues')
            .select(ISSUE_COLS)
            .in('parent_jira_issue_id', level2Ids)
            .order('jira_key')
        if (error) throw new Error(`[roadmap] level3: ${error.message}`)
        level3 = (data ?? []) as unknown as RawIssue[]
    }

    const level3Ids = level3.map((b) => b.jira_issue_id)

    // ── Phase 4: Level 4 (children of level 3) — skip if too many ────────────
    // Guard: if > 800 BWIs, the IN clause may be too large; skip task level.
    let level4: RawIssue[] = []
    if (level3Ids.length > 0 && level3Ids.length <= 800) {
        const { data, error } = await supabase
            .from('jira_issues')
            .select(ISSUE_COLS)
            .in('parent_jira_issue_id', level3Ids)
            .order('jira_key')
            .limit(3000)
        // Level 4 errors are non-fatal: log and continue without tasks
        if (error) console.warn('[roadmap] level4 (non-fatal):', error.message)
        level4 = (data ?? []) as unknown as RawIssue[]
    }

    // ── Build flat node map ────────────────────────────────────────────────────
    const nodes: Record<string, RoadmapNode> = {}

    const levelData: Array<{ items: RawIssue[]; depth: number }> = [
        { items: initiatives, depth: 0 },
        { items: level2, depth: 1 },
        { items: level3, depth: 2 },
        { items: level4, depth: 3 },
    ]

    for (const { items, depth } of levelData) {
        for (const issue of items) {
            nodes[issue.jira_issue_id] = {
                id: issue.jira_issue_id,
                key: issue.jira_key ?? '',
                summary: issue.summary ?? '',
                issueType: issue.issue_type ?? '',
                statusName: issue.status_name ?? '',
                statusCategory: toStatusCategory(issue.status_category ?? issue.status_name),
                startDate: issue.start_date ?? null,
                dueDate: issue.due_date ?? null,
                assignee: null, // column does not exist in jira_issues
                workstream: issue.workstream ?? null,
                investmentCategory: issue.investment_category ?? null,
                parentId: issue.parent_jira_issue_id ?? null,
                childIds: [],
                depth,
                childrenTotal: 0,
                childrenDone: 0,
                percentComplete: 0,
                hiddenMissingDatesCount: 0,
            }
        }
    }

    // ── Wire parent → child relationships ─────────────────────────────────────
    for (const node of Object.values(nodes)) {
        if (node.parentId && nodes[node.parentId]) {
            nodes[node.parentId].childIds.push(node.id)
        }
    }

    // ── Post-order traversal: compute aggregate metrics ───────────────────────
    function computeMetrics(id: string): void {
        const node = nodes[id]
        if (!node) return

        let childrenTotal = 0
        let childrenDone = 0
        let missingDates = 0

        for (const childId of node.childIds) {
            const child = nodes[childId]
            if (!child) continue

            // First compute child's own metrics (post-order)
            computeMetrics(childId)

            childrenTotal++
            if (child.statusCategory === 'Done') childrenDone++
            if (!child.startDate || !child.dueDate) missingDates++

            // Propagate child's hidden missing dates upward
            missingDates += child.hiddenMissingDatesCount
        }

        node.childrenTotal = childrenTotal
        node.childrenDone = childrenDone
        node.hiddenMissingDatesCount = missingDates

        node.percentComplete =
            childrenTotal > 0
                ? Math.round((childrenDone / childrenTotal) * 100)
                : node.statusCategory === 'Done'
                    ? 100
                    : node.statusCategory === 'In Progress'
                        ? 50
                        : 0
    }

    const rootIds = initiativeIds.filter((id) => nodes[id])
    for (const rootId of rootIds) {
        computeMetrics(rootId)
    }

    // ── Date range ────────────────────────────────────────────────────────────
    let minDate: string | null = null
    let maxDate: string | null = null

    for (const node of Object.values(nodes)) {
        if (node.startDate && (!minDate || node.startDate < minDate)) minDate = node.startDate
        if (node.dueDate && (!maxDate || node.dueDate > maxDate)) maxDate = node.dueDate
    }

    const total = Object.keys(nodes).length
    console.log(
        `[roadmap] ${total} nodes (init=${initiatives.length}, l2=${level2.length}, l3=${level3.length}, l4=${level4.length}) | ${minDate} → ${maxDate}`
    )

    return {
        nodes,
        rootIds,
        minDate,
        maxDate,
        lastUpdated: new Date().toISOString(),
    }
}
