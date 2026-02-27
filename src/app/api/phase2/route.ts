import { NextResponse } from 'next/server'
import { getInitiativesDashboardData } from '@/lib/server/initiatives'
import { getProjectsDashboardData } from '@/lib/server/projects'

// ─── Mock data for BWIs (not yet migrated) ────────────────────────────────────

const mockBWIs = [
    { key: 'BWI-1', summary: 'Model Training Pipeline', issue_type: 'New Feature', status: 'In Progress', workstream: 'MAPS', parent_project_key: 'PROJ-1', children_count: 3, open_children_count: 2, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 15 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'BWI-2', summary: 'API Endpoint', issue_type: 'Enhancement', status: 'Done', workstream: 'MAPS', parent_project_key: 'PROJ-1', children_count: 2, open_children_count: 1, warning_types: ['ClosedWithOpenChildren'], has_warning: true, wrong_status: true, created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'BWI-3', summary: 'UI Dashboard', issue_type: 'New Feature', status: 'In Progress', workstream: 'MAPS', parent_project_key: 'PROJ-2', children_count: 0, open_children_count: 0, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'BWI-4', summary: 'Fix Crash on Login', issue_type: 'Issue', status: 'Backlog', workstream: 'EG', parent_project_key: 'PROJ-3', children_count: 0, open_children_count: 0, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 5 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'BWI-5', summary: 'Orphaned BWI', issue_type: 'New Feature', status: 'In Progress', workstream: 'PCE', parent_project_key: 'EPMO-1', children_count: 0, open_children_count: 0, warning_types: ['MissingParentProject'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 2 * 86400000).toISOString(), updated_at: new Date().toISOString() },
]

// ─── Route handler ────────────────────────────────────────────────────────────

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const workstream = searchParams.get('workstream') || 'All Workstreams'
    const period = searchParams.get('period') || '30'

    // ── Fetch initiatives + projects in parallel ───────────────────────────────
    const [initiativesResult, projectsResult] = await Promise.allSettled([
        getInitiativesDashboardData(workstream),
        getProjectsDashboardData(workstream),
    ])

    if (initiativesResult.status === 'rejected') {
        console.error('[api/phase2] Initiatives load failed:', initiativesResult.reason)
        return NextResponse.json(
            { error: 'Failed to load initiatives data. Check server logs.' },
            { status: 500 }
        )
    }

    if (projectsResult.status === 'rejected') {
        console.error('[api/phase2] Projects load failed:', projectsResult.reason)
    }

    const { raw, alertSeverities, alertTrends, trendUnassigned, lastUpdated } = initiativesResult.value

    // Fallback zero-state if the projects query failed at the network level
    const noTrend = { weekly: null, monthly: null }
    const noAlert = { count: 0, severity: 'None' as const }
    const projectsData = projectsResult.status === 'fulfilled'
        ? projectsResult.value
        : {
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
            cardTrends: { missingParents: noTrend, missingChildren: noTrend },
            raw: [],
            lastUpdated: new Date().toISOString(),
            hasData: false,
        }

    // ── BWIs: still mock (pending migration) ─────────────────────────────────
    const filterByDate = (dateStr: string) => {
        if (period === 'all') return true
        const days = parseInt(period)
        if (isNaN(days)) return true
        const cutoff = new Date()
        cutoff.setDate(cutoff.getDate() - days)
        return new Date(dateStr) >= cutoff
    }
    const filterByWs = (ws: string) => {
        if (workstream === 'All Workstreams') return true
        const lowWs = workstream.toLowerCase()
        if (ws === 'MAPS' && lowWs.includes('partner')) return true
        if (ws === 'EG' && lowWs.includes('governance')) return true
        return ws === workstream
    }

    const filteredBWI = mockBWIs.filter(
        (b) => filterByWs(b.workstream) && filterByDate(b.created_at)
    )

    const wsMap: Record<string, number> = {}
    filteredBWI.forEach((b) => {
        wsMap[b.workstream] = (wsMap[b.workstream] || 0) + 1
    })

    return NextResponse.json({
        initiatives: {
            raw,
            alertSeverities,
            alertTrends,
            trendUnassigned,
            created: raw.length,
            inProgress: raw.filter((i) => i.status === 'In Progress').length,
            completed: raw.filter((i) => i.status === 'Done').length,
            pending: raw.filter((i) => i.status === 'To Do').length,
        },
        // projects is now a ProjectsDashboardData object from Supabase
        projects: projectsData,
        bwi: {
            raw: filteredBWI,
            created: filteredBWI.length,
            breakdown: {
                newFeature: filteredBWI.filter((b) => b.issue_type === 'New Feature').length,
                enhancement: filteredBWI.filter((b) => b.issue_type === 'Enhancement').length,
                issue: filteredBWI.filter((b) => b.issue_type === 'Issue').length,
            },
            inProgress: filteredBWI.filter((b) => b.status === 'In Progress').length,
            completed: filteredBWI.filter((b) => b.status === 'Done').length,
            completedWithWarnings: filteredBWI.filter((b) => b.status === 'Done' && b.has_warning).length,
            noChildren: filteredBWI.filter((b) => b.children_count === 0).length,
            noParent: filteredBWI.filter((b) => !b.parent_project_key || b.parent_project_key === 'EPMO-1').length,
            wrongStatus: filteredBWI.filter((b) => b.wrong_status).length,
            issues: filteredBWI.filter((b) => b.has_warning || b.wrong_status),
            byWorkstream: Object.entries(wsMap).map(([name, value]) => ({ name, value })),
        },
        lastSync: lastUpdated,
    })
}
