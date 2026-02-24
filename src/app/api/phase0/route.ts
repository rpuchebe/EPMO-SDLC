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

        const { data: tickets, error: ticketErr } = await ticketQuery
        if (ticketErr) throw ticketErr

        const typedTickets = (tickets || []) as TicketRow[]

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

        const { data: dailyCounts, error: timelineErr } = await timelineQuery
        if (timelineErr) throw timelineErr

        const typedCounts = (dailyCounts || []) as DailyCountRow[]

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
        const ticketKeys = typedTickets.map(() => '')  // we'll use ticket_id
        let historyQuery = supabase.from('bpi_status_history').select('*')
        if (workstreamFilter) {
            // Only get history for filtered tickets
            const { data: filteredTickets } = await supabase
                .from('bpi_tickets')
                .select('jira_key')
                .eq('workstream', workstreamFilter)
            if (filteredTickets) {
                const keys = filteredTickets.map((t: { jira_key: string }) => t.jira_key)
                if (keys.length > 0) {
                    historyQuery = historyQuery.in('jira_key', keys)
                }
            }
        }

        const { data: statusHistory } = await historyQuery
        const typedHistory = (statusHistory || []) as StatusHistoryRow[]

        // Calculate avg time in each status
        const statusTimeMap: Record<string, number[]> = {}
        // Group history by jira_key
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
        const { data: syncLog } = await supabase
            .from('bpi_sync_log')
            .select('synced_at')
            .order('synced_at', { ascending: false })
            .limit(1)

        const lastSync = (syncLog as SyncLogRow[] | null)?.[0]?.synced_at || null

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
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('Phase0 API error:', message)
        return NextResponse.json({ error: message }, { status: 500 })
    }
}
