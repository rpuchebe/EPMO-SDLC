import { NextResponse } from 'next/server'
import { getInitiativesDashboardData } from '@/lib/server/initiatives'
import { getProjectsDashboardData } from '@/lib/server/projects'
import { getPhase2BwiSnapshotData } from '@/lib/server/bwis'
import { requireAuth } from '@/utils/supabase/auth-guard'

export async function GET(request: Request) {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const { searchParams } = new URL(request.url)
    const workstream = searchParams.get('workstream') || 'All Workstreams'
    const period = searchParams.get('period') || '30'
    const bwiHideClosed = searchParams.get('bwiHideClosed') === 'true'
    const bwiDateWindow = searchParams.get('bwiDateWindow') || 'all'
    const bwiSearch = searchParams.get('bwiSearch') || ''

    // ── Fetch initiatives + projects + bwis in parallel ──
    const [initiativesResult, projectsResult, bwisResult] = await Promise.allSettled([
        getInitiativesDashboardData(workstream),
        getProjectsDashboardData(workstream),
        getPhase2BwiSnapshotData(workstream, bwiSearch, bwiDateWindow, bwiHideClosed)
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

    if (bwisResult.status === 'rejected') {
        console.error('[api/phase2] BWIs load failed:', bwisResult.reason)
    }

    const { raw, alertSeverities, alertTrends, trendUnassigned, lastUpdated } = initiativesResult.value

    // Fallback zero-state if the projects query failed
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

    const bwisData = bwisResult.status === 'fulfilled'
        ? bwisResult.value
        : {
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
        projects: projectsData,
        bwi: bwisData,
        lastSync: (bwisData as any).generated_at || lastUpdated,
    })
}
