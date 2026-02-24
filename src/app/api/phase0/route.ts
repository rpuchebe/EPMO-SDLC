import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface TicketRow {
    jira_key: string
    summary: string
    status: string
    status_category: string
    workstream: string | null
    roi_score: number | null
    created_at: string
    reporter_display_name: string | null
    reporter_avatar_url: string | null
    status_durations: Record<string, number> | null
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

async function safeQuery<T>(result: { data: unknown | null; error: { message: string } | null }): Promise<T> {
    const { data, error } = result
    if (error) {
        // Table doesn't exist yet — return empty
        if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
            return [] as unknown as T
        }
        throw new Error(error.message)
    }
    return (data as T) || ([] as unknown as T)
}

export async function GET(request: NextRequest) {
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)

    const workstreamFilter = searchParams.get('workstream')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    try {
        // ── Fetch tickets (filtered for KPIs, reports) ──
        let ticketQuery = supabase.from('bpi_tickets').select('*')
        if (workstreamFilter) ticketQuery = ticketQuery.eq('workstream', workstreamFilter)
        if (dateFrom) ticketQuery = ticketQuery.gte('created_at', dateFrom)
        if (dateTo) ticketQuery = ticketQuery.lte('created_at', dateTo)

        let typedTickets: TicketRow[]
        try {
            typedTickets = await safeQuery<TicketRow[]>(await ticketQuery)
        } catch {
            // Table doesn't exist — return empty dashboard
            return NextResponse.json(EMPTY_RESPONSE)
        }

        // ── Fetch ALL tickets (unfiltered) for timeline reference line ──
        let allTickets: TicketRow[] = typedTickets
        if (workstreamFilter) {
            let allQuery = supabase.from('bpi_tickets').select('*')
            if (dateFrom) allQuery = allQuery.gte('created_at', dateFrom)
            if (dateTo) allQuery = allQuery.lte('created_at', dateTo)
            try {
                allTickets = await safeQuery<TicketRow[]>(await allQuery)
            } catch {
                allTickets = typedTickets
            }
        }

        // ── KPIs ──
        const total = typedTickets.length
        const inProgress = typedTickets.filter((t) => t.status_category === 'In Progress').length
        const discovery = typedTickets.filter((t) => t.status === 'Discovery').length
        const movedToWorkstream = typedTickets.filter((t) => t.status === 'Moved to Workstream').length
        const done = typedTickets.filter((t) => t.status_category === 'Done' && t.status.toLowerCase() !== "won't do" && t.status.toLowerCase() !== 'wont do').length
        const wontDo = typedTickets.filter((t) => t.status.toLowerCase() === "won't do" || t.status.toLowerCase() === 'wont do').length
        const roiValues = typedTickets.filter((t) => t.roi_score !== null).map((t) => t.roi_score as number)
        const avgRoi = roiValues.length > 0 ? roiValues.reduce((a, b) => a + b, 0) / roiValues.length : 0

        // ── Timeline data (from ALL tickets so the "all workstreams" line always shows) ──
        const dailyMap: Record<string, Record<string, number>> = {}
        for (const t of allTickets) {
            const date = t.created_at.substring(0, 10) // YYYY-MM-DD
            const ws = t.workstream || '_all'
            if (!dailyMap[date]) dailyMap[date] = {}
            dailyMap[date][ws] = (dailyMap[date][ws] || 0) + 1
        }

        const typedCounts: DailyCountRow[] = []
        for (const [date, wsMap] of Object.entries(dailyMap)) {
            for (const [ws, count] of Object.entries(wsMap)) {
                typedCounts.push({ count_date: date, workstream: ws, ticket_count: count })
            }
        }
        typedCounts.sort((a, b) => a.count_date.localeCompare(b.count_date))

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

        // Calculate avg time in each status from status_durations JSONB field (values in seconds)
        const statusTimeMap: Record<string, number[]> = {}
        for (const t of typedTickets) {
            if (!t.status_durations) continue
            for (const [status, seconds] of Object.entries(t.status_durations)) {
                if (seconds <= 0) continue
                const days = seconds / 86400 // convert seconds to days
                if (!statusTimeMap[status]) statusTimeMap[status] = []
                statusTimeMap[status].push(days)
            }
        }

        const statusDistribution = Object.entries(statusMap).map(([status, data]) => {
            // Case-insensitive match for status_durations keys
            const timeKey = Object.keys(statusTimeMap).find(
                (k) => k.toLowerCase() === status.toLowerCase()
            )
            const times = timeKey ? statusTimeMap[timeKey] : null
            return {
                status,
                count: data.count,
                avgRoi: data.roiCount > 0 ? Math.round((data.roiSum / data.roiCount) * 10) / 10 : null,
                avgDaysInStatus: times
                    ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10
                    : null,
            }
        })

        // ── Collaborators ──
        const collabMap: Record<string, {
            name: string
            avatar: string | null
            ticketCount: number
            roiSum: number
            roiCount: number
        }> = {}

        for (const t of typedTickets) {
            const name = t.reporter_display_name || 'Unknown'
            if (!collabMap[name]) {
                collabMap[name] = {
                    name,
                    avatar: t.reporter_avatar_url,
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
                await supabase.from('sync_log').select('synced_at').order('synced_at', { ascending: false }).limit(1)
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
                wontDo,
                avgRoi: Math.round(avgRoi * 10) / 10,
            },
            tickets: typedTickets.map((t) => ({
                jira_key: t.jira_key,
                summary: t.summary,
                status: t.status,
                status_category: t.status_category,
                workstream: t.workstream,
                roi_score: t.roi_score,
                created_at: t.created_at,
                reporter_display_name: t.reporter_display_name,
                reporter_avatar_url: t.reporter_avatar_url,
            })),
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
