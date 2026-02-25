import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface Phase1TicketRow {
    id: string
    jira_key: string
    summary: string
    status: string
    status_category: string
    workstream: string | null
    team: string | null
    ticket_type: string | null
    reporter_display_name: string | null
    reporter_avatar_url: string | null
    reporter_account_id: string | null
    assignee_account_id: string | null
    assignee_display_name: string | null
    assignee_avatar_url: string | null
    roi_score: number | null
    status_durations: Record<string, number> | null
    lead_time_seconds: number | null
    linked_work_items: { key: string; status: string; issue_type: string }[] | null
    linked_work_item_count: number | null
    linked_work_item_keys: string[] | null
    created_at: string
    completed_at: string | null
}


interface DailyCountRow {
    count_date: string
    workstream: string
    ticket_type: string
    ticket_count: number
}

interface SyncLogRow {
    synced_at: string
}

const EMPTY_RESPONSE = {
    kpis: {
        discoveryItems: { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] },
        maintenanceRTB: { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] },
        waitingForTriage: { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] },
        inDiscovery: { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] },
        definitionGate: { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] },
        atWorkstreamBacklog: { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] },
        completedItems: { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] },
        linkedItemsBreakdown: []
    },
    timeline: [],
    statusDistribution: [],
    collaborators: [],
    workstreams: [],
    teams: [],
    lastSync: null,
    _notice: 'No data yet. Run the Jira sync or apply the database migration first.',
}

async function safeQuery<T>(result: { data: unknown | null; error: { message: string } | null }): Promise<T> {
    const { data, error } = result
    if (error) {
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
    const teamFilter = searchParams.get('team')
    const dateFrom = searchParams.get('dateFrom')
    const dateTo = searchParams.get('dateTo')

    try {
        // ── Fetch tickets ──
        let ticketQuery = supabase.from('sepmo_tickets').select('*')
        if (workstreamFilter) ticketQuery = ticketQuery.eq('workstream', workstreamFilter)
        if (teamFilter) ticketQuery = ticketQuery.eq('team', teamFilter)
        if (dateFrom) ticketQuery = ticketQuery.gte('created_at', dateFrom)
        if (dateTo) ticketQuery = ticketQuery.lte('created_at', dateTo)

        let typedTickets: Phase1TicketRow[]
        try {
            typedTickets = await safeQuery<Phase1TicketRow[]>(await ticketQuery)
        } catch {
            return NextResponse.json(EMPTY_RESPONSE)
        }

        // ── Fetch ALL tickets (unfiltered) for timeline reference line ──
        let allTickets: Phase1TicketRow[] = typedTickets
        if (workstreamFilter || teamFilter) {
            let allQuery = supabase.from('sepmo_tickets').select('*')
            if (dateFrom) allQuery = allQuery.gte('created_at', dateFrom)
            if (dateTo) allQuery = allQuery.lte('created_at', dateTo)
            try {
                allTickets = await safeQuery<Phase1TicketRow[]>(await allQuery)
            } catch {
                allTickets = typedTickets
            }
        }

        // ── KPIs ──
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)

        const weekBuckets = Array.from({ length: 8 }).map((_, i) => {
            return new Date(now.getTime() - (7 - i) * 7 * 24 * 60 * 60 * 1000)
        })

        const buildKpi = (filtered: Phase1TicketRow[], isCumulative = false) => {
            const val = filtered.length

            let last7 = 0; let prev7 = 0; let sparkline: number[] = []

            if (isCumulative) {
                last7 = filtered.filter(t => new Date(t.created_at) < now).length
                prev7 = filtered.filter(t => new Date(t.created_at) < sevenDaysAgo).length

                sparkline = weekBuckets.map(bucketStart => {
                    const bucketEnd = new Date(bucketStart.getTime() + 7 * 24 * 60 * 60 * 1000)
                    return filtered.filter(t => new Date(t.created_at) < bucketEnd).length
                })
            } else {
                const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)
                last7 = filtered.filter(t => new Date(t.created_at) >= sevenDaysAgo).length
                prev7 = filtered.filter(t => new Date(t.created_at) >= fourteenDaysAgo && new Date(t.created_at) < sevenDaysAgo).length

                sparkline = weekBuckets.map(bucketStart => {
                    const bucketEnd = new Date(bucketStart.getTime() + 7 * 24 * 60 * 60 * 1000)
                    return filtered.filter(t => {
                        const d = new Date(t.created_at)
                        return d >= bucketStart && d < bucketEnd
                    }).length
                })
            }

            const deltaAbsolute = last7 - prev7
            const deltaPercent = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round((deltaAbsolute / prev7) * 100)

            return { value: val, deltaAbsolute, deltaPercent, sparkline }
        }

        const getAvgAge = (tickets: Phase1TicketRow[]) => {
            if (!tickets.length) return 0
            const totalDays = tickets.reduce((acc, t) => {
                return acc + (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 3600 * 24)
            }, 0)
            return Math.round(totalDays / tickets.length)
        }

        const getOldestAge = (tickets: Phase1TicketRow[]) => {
            if (!tickets.length) return 0
            return Math.round(Math.max(...tickets.map(t => (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 3600 * 24))))
        }

        const getUnassignedCount = (tickets: Phase1TicketRow[]) => {
            return tickets.filter(t => !t.assignee_account_id).length
        }

        const discoveryItemsTickets = typedTickets.filter(t => t.ticket_type === 'Discovery' || t.ticket_type === 'Discovery Item')
        const discoveryItems = {
            ...buildKpi(discoveryItemsTickets, true),
            avgAge: getAvgAge(discoveryItemsTickets),
            unassigned: getUnassignedCount(discoveryItemsTickets)
        }

        const maintenanceRTBTickets = typedTickets.filter(t => t.ticket_type === 'Maintenance (RTB)')
        const maintenanceRTB = {
            ...buildKpi(maintenanceRTBTickets, true),
            avgAge: getAvgAge(maintenanceRTBTickets),
            unassigned: getUnassignedCount(maintenanceRTBTickets)
        }

        // Waiting for triage mapping: "Waiting for triage" and "Needs more info" (or "Needs more information")
        const waitingForTriageTickets = typedTickets.filter(t => {
            const s = (t.status || '').toLowerCase()
            return s === 'needs more information' || s === 'needs more info' || s === 'waiting for triage'
        })
        const waitingForTriage = {
            ...buildKpi(waitingForTriageTickets, true),
            oldestTicket: getOldestAge(waitingForTriageTickets),
            unassigned: getUnassignedCount(waitingForTriageTickets)
        }

        // In Discovery maps to "Discovery", "Ready for Discovery", "In Progress"
        const inDiscoveryTickets = typedTickets.filter(t => {
            const s = (t.status || '').toLowerCase()
            return s === 'discovery' || s === 'ready for discovery' || s === 'in progress'
        })
        const inDiscovery = {
            ...buildKpi(inDiscoveryTickets, true),
            avgAge: getAvgAge(inDiscoveryTickets),
            unassigned: getUnassignedCount(inDiscoveryTickets)
        }

        // Definition Gate maps to "Internal audit" or "Definition Gate"
        const definitionGateTickets = typedTickets.filter(t => {
            const s = (t.status || '').toLowerCase()
            return s === 'internal audit' || s === 'definition gate'
        })
        const definitionGate = {
            ...buildKpi(definitionGateTickets, true),
            avgAge: getAvgAge(definitionGateTickets),
            unassigned: getUnassignedCount(definitionGateTickets)
        }

        // At workstream backlog maps to "Backlog" or "Moved to Workstream Backlog"
        const backlogTickets = typedTickets.filter(t => {
            const s = (t.status || '').toLowerCase()
            return s === 'backlog' || s === 'moved to workstream backlog'
        })
        const atWorkstreamBacklog = {
            ...buildKpi(backlogTickets, true),
            linkedItems: backlogTickets.reduce((acc, t) => {
                try {
                    const parsed = typeof t.linked_work_items === 'string' ? JSON.parse(t.linked_work_items) : t.linked_work_items
                    return acc + (Array.isArray(parsed) ? parsed.length : 0)
                } catch { return acc }
            }, 0)
        }

        // Completed items maps to "Done" status or completed_at != null
        const completedItemsTickets = typedTickets.filter(t => {
            const sCat = (t.status_category || '').toLowerCase()
            const s = (t.status || '').toLowerCase()
            return sCat === 'done' || s === 'done' || !!t.completed_at
        })
        const completedItems = {
            ...buildKpi(completedItemsTickets, true),
            avgDaysToDone: completedItemsTickets.length ? Math.round(completedItemsTickets.reduce((acc, t) => {
                if (!t.completed_at) return acc
                return acc + (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / (1000 * 3600 * 24)
            }, 0) / completedItemsTickets.length) : 0,
            completedThisMonth: completedItemsTickets.filter(t => {
                if (!t.completed_at) return false
                const d = new Date(t.completed_at)
                return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()
            }).length
        }

        // Fetch linked items for backlog breakdown
        let linkedItemsBreakdown: { type: string; count: number; percentage: number }[] = []
        if (backlogTickets.length > 0) {
            const typeMap: Record<string, number> = {}
            let totalLinkedItems = 0

            for (const ticket of backlogTickets) {
                let items = ticket.linked_work_items
                if (typeof items === 'string') {
                    try { items = JSON.parse(items) } catch { /* ignore */ }
                }

                if (items && Array.isArray(items)) {
                    for (const item of items) {
                        const type = item.issue_type || 'Unknown'
                        typeMap[type] = (typeMap[type] || 0) + 1
                        totalLinkedItems++
                    }
                }
            }

            linkedItemsBreakdown = Object.entries(typeMap)
                .map(([type, count]) => ({
                    type,
                    count,
                    percentage: totalLinkedItems > 0 ? Math.round((count / totalLinkedItems) * 100) : 0
                }))
                .sort((a, b) => b.count - a.count)
        }

        // ── Timeline data ──
        // Blue line: Discovery, Orange line: Maintenance (RTB)
        // Group by Date -> Ticket Type
        const dailyMap: Record<string, Record<string, number>> = {}
        for (const t of allTickets) {
            const date = t.created_at.substring(0, 10)
            let type = t.ticket_type || 'Unknown'
            if (type === 'Discovery Item') type = 'Discovery' // Normalize for the UI

            if (!dailyMap[date]) dailyMap[date] = {}
            dailyMap[date][type] = (dailyMap[date][type] || 0) + 1
        }

        const typedCounts: DailyCountRow[] = []
        for (const [date, typeMap] of Object.entries(dailyMap)) {
            for (const [type, count] of Object.entries(typeMap)) {
                typedCounts.push({ count_date: date, workstream: '_all', ticket_type: type, ticket_count: count })
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

            let durations = t.status_durations
            if (typeof durations === 'string') {
                try { durations = JSON.parse(durations) } catch { continue }
            }
            if (typeof durations !== 'object' || durations === null) continue

            for (const [status, seconds] of Object.entries(durations)) {
                if (typeof seconds !== 'number' || seconds <= 0) continue
                const days = seconds / 86400
                if (!statusTimeMap[status]) statusTimeMap[status] = []
                statusTimeMap[status].push(days)
            }
        }

        const statusDistribution = Object.entries(statusMap).map(([status, data]) => {
            const timeKey = Object.keys(statusTimeMap).find((k) => k.toLowerCase() === status.toLowerCase())
            const times = timeKey ? statusTimeMap[timeKey] : null
            return {
                status,
                count: data.count,
                avgRoi: data.roiCount > 0 ? Math.round((data.roiSum / data.roiCount) * 10) / 10 : null,
                avgDaysInStatus: times ? Math.round((times.reduce((a, b) => a + b, 0) / times.length) * 10) / 10 : null,
            }
        })

        // ── Collaborators (Reporters) ──
        const collabMap: Record<string, { name: string; avatar: string | null; ticketCount: number; roiSum: number; roiCount: number }> = {}
        for (const t of typedTickets) {
            const name = t.reporter_display_name || 'Unknown'
            if (!collabMap[name]) {
                collabMap[name] = { name, avatar: t.reporter_avatar_url, ticketCount: 0, roiSum: 0, roiCount: 0 }
            }
            collabMap[name].ticketCount++
            if (t.roi_score !== null) {
                collabMap[name].roiSum += t.roi_score
                collabMap[name].roiCount++
            }
        }

        const collaborators = Object.values(collabMap)
            .map(c => ({
                name: c.name,
                avatar: c.avatar,
                ticketCount: c.ticketCount,
                avgRoi: c.roiCount > 0 ? Math.round((c.roiSum / c.roiCount) * 10) / 10 : null
            }))
            .sort((a, b) => b.ticketCount - a.ticketCount)

        // ── Workstreams and Teams (for filter dropdown) ──
        const workstreams = [...new Set(typedTickets.map((t) => t.workstream).filter(Boolean))] as string[]
        const teams = [...new Set(typedTickets.map((t) => t.team).filter(Boolean))] as string[]

        // ── Last sync ──
        let lastSync: string | null = null
        try {
            const syncLog = await safeQuery<SyncLogRow[]>(
                await supabase.from('bpi_sync_log').select('synced_at').order('synced_at', { ascending: false }).limit(1)
            )
            lastSync = syncLog?.[0]?.synced_at || null
        } catch { }

        return NextResponse.json({
            kpis: {
                discoveryItems,
                maintenanceRTB,
                waitingForTriage,
                inDiscovery,
                definitionGate,
                atWorkstreamBacklog,
                completedItems,
                linkedItemsBreakdown
            },
            tickets: typedTickets.map((t) => ({
                id: t.id,
                jira_key: t.jira_key,
                summary: t.summary,
                status: t.status,
                status_category: t.status_category,
                workstream: t.workstream,
                team: t.team,
                ticket_type: t.ticket_type,
                roi_score: t.roi_score,
                created_at: t.created_at,
                reporter_display_name: t.reporter_display_name,
                reporter_avatar_url: t.reporter_avatar_url,
                assignee_display_name: t.assignee_display_name,
                assignee_avatar_url: t.assignee_avatar_url,
                linked_work_item_count: t.linked_work_item_count,
                linked_work_items: (() => {
                    let items = t.linked_work_items
                    if (typeof items === 'string') {
                        try { items = JSON.parse(items) } catch { /* ignore */ }
                    }
                    if (Array.isArray(items)) return items
                    return null
                })(),
            })),
            timeline: typedCounts,
            statusDistribution,
            collaborators,
            workstreams,
            teams,
            lastSync,
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : (typeof err === 'object' && err !== null && 'message' in err) ? String((err as { message: string }).message) : 'Unknown error'
        console.error('Phase1 API error:', message)
        return NextResponse.json({
            ...EMPTY_RESPONSE,
            _error: message,
        })
    }
}
