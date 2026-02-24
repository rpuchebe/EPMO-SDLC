import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface TicketRow {
    status: string
    status_category: string
    workstream: string | null
    roi_score: number | null
    created_at: string
    assignee_display_name: string | null
    assignee_avatar_url: string | null
}

interface StatusHistoryRow {
    jira_key: string
    from_status: string | null
    to_status: string | null
    transitioned_at: string
}

interface DailyCountRow {
    count_date: string
    workstream: string
    ticket_count: number
}

interface SyncLogRow {
    synced_at: string
}

const EMPTY_RESPONSE = {
    kpis: { total: 0, inProgress: 0, discovery: 0, movedToWorkstream: 0, done: 0, avgRoi: 0 },
    timeline: [],
    statusDistribution: [],
    collaborators: [],
    workstreams: [],
    lastSync: null,
    _notice: 'No data yet. Run the Jira sync or apply the database migration first.',
}

async function safeQuery<T>(promise: Promise<{ data: T | null; error: { message: string } | null }>): Promise<T> {
    const { data, error } = await promise
    if (error) {
        // Table doesn't exist yet — return empty
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
            return [] as unknown as T
        }
        throw new Error(error.message)
    }
    return data ?? ([] as unknown as T)
}

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const workstreamFilter = searchParams.get('workstream')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    try {
        // ── Fetch tickets ──
        let ticketQuery = supabase.from('bpi_tickets').select('*')
        if (workstreamFilter) ticketQuery = ticketQuery.eq('workstream', workstreamFilter)
        if (dateFrom) ticketQuery = ticketQuery.gte('created_at', dateFrom)
        if (dateTo) ticketQuery = ticketQuery.lte('created_at', dateTo)

        let typedTickets: TicketRow[]
        try {
            typedTickets = await safeQuery<TicketRow[]>(ticketQuery)
        } catch {
            // Table doesn't exist — return empty dashboard
            return NextResponse.json(EMPTY_RESPONSE)
        }

        // ── KPIs ──
        const total = typedTickets.length
        const inProgress = typedTickets.filter((t) => t.status_category === 'In Progress').length
        const discovery = typedTickets.filter((t) => t.status === 'Discovery').length
        const movedToWorkstream = typedTickets.filter((t) => t.status === 'Moved to Workstream').length
        const done = typedTickets.filter((t) => t.status_category === 'Done').length
        const roiValues = typedTickets.filter((t) => t.roi_score !== null).map((t) => t.roi_score as number)
        const avgRoi = roiValues.length > 0 ? roiValues.reduce((a, b) => a + b, 0) / roiValues.length : 0

        // ── Timeline data ──
        let timelineQuery = supabase.from('bpi_daily_counts').select('*').order('count_date', { ascending: true })
        if (dateFrom) timelineQuery = timelineQuery.gte('count_date', dateFrom)
        if (dateTo) timelineQuery = timelineQuery.lte('count_date', dateTo)

        const typedCounts = await safeQuery<DailyCountRow[]>(timelineQuery)

        // ── Status Distribution ──
        const statusMap: Record<string, { count: number; roiSum: number; roiCount: number }> = {}
        for (const t of typedTickets) {
            if (!statusMap[t.status]) statusMap[t.status] = { count: 0, roiSum: 0, roiCount: 0 }
            statusMap[t.status].count++
            if (t.roi_score !== null) {
                statusMap[t.status].roiSum += t.roi_score
                statusMap[t.status].roiCount++
            }
        }

        // Fetch status history for time-in-status calculation
        let historyQuery = supabase.from('bpi_status_history').select('*')
        if (workstreamFilter) {
            const filteredTickets = await safeQuery<{ jira_key: string }[]>(
                supabase.from('bpi_tickets').select('jira_key').eq('workstream', workstreamFilter)
            )
            if (filteredTickets.length > 0) {
                const keys = filteredTickets.map((t) => t.jira_key)
                historyQuery = historyQuery.in('jira_key', keys)
            }
        }

        const typedHistory = await safeQuery<StatusHistoryRow[]>(historyQuery)

        // Calculate avg time in each status
        const statusTimeMap: Record<string, number[]> = {}
        const historyByKey: Record<string, StatusHistoryRow[]> = {}
        for (const h of typedHistory) {
            if (!historyByKey[h.jira_key]) historyByKey[h.jira_key] = []
            historyByKey[h.jira_key].push(h)
        }

        for (const key of Object.keys(historyByKey)) {
            const transitions = historyByKey[key].sort(
                (a, b) => new Date(a.transitioned_at).getTime() - new Date(b.transitioned_at).getTime()
            )
            for (let i = 0; i < transitions.length; i++) {
                const status = transitions[i].from_status
                if (!status) continue
                const start = new Date(i > 0 ? transitions[i - 1].transitioned_at : transitions[i].transitioned_at)
                const end = new Date(transitions[i].transitioned_at)
                const days = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
                if (days >= 0) {
                    if (!statusTimeMap[status]) statusTimeMap[status] = []
                    statusTimeMap[status].push(days)
                }
            }
        }

        const statusDistribution = Object.entries(statusMap).map(([status, data]) => ({
            status,
            count: data.count,
            avgRoi: data.roiCount > 0 ? Math.round((data.roiSum / data.roiCount) * 10) / 10 : null,
            avgDaysInStatus: statusTimeMap[status]
                ? Math.round((statusTimeMap[status].reduce((a, b) => a + b, 0) / statusTimeMap[status].length) * 10) / 10
                : null,
        }))

        // ── Collaborators ──
        const collabMap: Record<string, {
            name: string
            avatar: string | null
            ticketCount: number
            roiSum: number
            roiCount: number
        }> = {}

        for (const t of typedTickets) {
            const name = t.assignee_display_name || 'Unassigned'
            if (!collabMap[name]) {
                collabMap[name] = {
                    name,
                    avatar: t.assignee_avatar_url,
                    ticketCount: 0,
                    roiSum: 0,
                    roiCount: 0,
                }
            }
            collabMap[name].ticketCount++
            if (t.roi_score !== null) {
                collabMap[name].roiSum += t.roi_score
                collabMap[name].roiCount++
            }
        }

        const collaborators = Object.values(collabMap)
            .map((c) => ({
                name: c.name,
                avatar: c.avatar,
                ticketCount: c.ticketCount,
                avgRoi: c.roiCount > 0 ? Math.round((c.roiSum / c.roiCount) * 10) / 10 : null,
            }))
            .sort((a, b) => b.ticketCount - a.ticketCount)

        // ── Workstreams (for filter dropdown) ──
        const workstreams = [...new Set(typedTickets.map((t) => t.workstream).filter(Boolean))] as string[]

        // ── Last sync ──
        let lastSync: string | null = null
        try {
            const syncLog = await safeQuery<SyncLogRow[]>(
                supabase.from('bpi_sync_log').select('synced_at').order('synced_at', { ascending: false }).limit(1)
            )
            lastSync = syncLog?.[0]?.synced_at || null
        } catch {
            // sync_log table may not exist
        }

        return NextResponse.json({
            kpis: {
                total,
                inProgress,
                discovery,
                movedToWorkstream,
                done,
                avgRoi: Math.round(avgRoi * 10) / 10,
            },
            timeline: typedCounts,
            statusDistribution,
            collaborators,
            workstreams,
            lastSync,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as { message: string }).message) : 'Unknown error'
        console.error('Phase0 API error:', message)
        // Return empty data with error message rather than 500
        return NextResponse.json({
            ...EMPTY_RESPONSE,
            _error: message,
        })
    }
}
