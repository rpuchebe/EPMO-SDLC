import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'

interface TicketRow {
    jira_key: string
    summary: string
    status: string
    status_category: string
    workstream: string | null
    roi_score: number | null
    original_roi: number | null
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

const EMPTY_KPI = { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] }
const EMPTY_RESPONSE = {
    kpis: {
        ideasSubmitted: EMPTY_KPI,
        readyForDiscoveryIdeas: EMPTY_KPI,
        onDiscovery: EMPTY_KPI,
        atWorkstream: EMPTY_KPI,
        completedIdeas: EMPTY_KPI,
        avgRoiScoring: EMPTY_KPI
    },
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
        const now = new Date()
        const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const fourteenDaysAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        // 8-week buckets for sparklines
        const weekBuckets = Array.from({ length: 8 }).map((_, i) => {
            return new Date(now.getTime() - (7 - i) * 7 * 24 * 60 * 60 * 1000)
        })

        const buildKpi = (filtered: TicketRow[], valueOverride?: number, metricType: 'count' | 'roi' = 'count') => {
            const val = valueOverride !== undefined ? valueOverride : filtered.length

            let last7 = 0; let prev7 = 0; let sparkline: number[] = []

            if (metricType === 'count') {
                // To get total cumulative count at a specific point in time:
                last7 = filtered.filter(t => new Date(t.created_at) < now).length
                prev7 = filtered.filter(t => new Date(t.created_at) < sevenDaysAgo).length

                sparkline = weekBuckets.map(bucketStart => {
                    const bucketEnd = new Date(bucketStart.getTime() + 7 * 24 * 60 * 60 * 1000)
                    // Cumulative total up to the end of that bucket
                    return filtered.filter(t => new Date(t.created_at) < bucketEnd).length
                })
            } else if (metricType === 'roi') {
                const getRoiForPeriod = (start: Date, end: Date) => {
                    const rois = filtered.filter(t => {
                        const d = new Date(t.created_at)
                        return d >= start && d < end && t.roi_score !== null
                    }).map(t => t.roi_score as number)
                    return rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : 0
                }
                last7 = getRoiForPeriod(sevenDaysAgo, now)
                prev7 = getRoiForPeriod(fourteenDaysAgo, sevenDaysAgo)
                sparkline = weekBuckets.map(bucketStart => {
                    const bucketEnd = new Date(bucketStart.getTime() + 7 * 24 * 60 * 60 * 1000)
                    return getRoiForPeriod(bucketStart, bucketEnd)
                })
            }

            const deltaAbsolute = metricType === 'roi' ? Number((last7 - prev7).toFixed(1)) : (last7 - prev7)
            const deltaPercent = prev7 === 0 ? (last7 > 0 ? 100 : 0) : Math.round((deltaAbsolute / prev7) * 100)

            return { value: val, deltaAbsolute, deltaPercent, sparkline }
        }

        const totalTickets = typedTickets
        const readyForDiscoveryTickets = typedTickets.filter(t => t.status && t.status.toLowerCase() === 'ready for discovery')
        const discoveryTickets = typedTickets.filter(t => t.status === 'Discovery')
        const workstreamTickets = typedTickets.filter(t => t.status === 'Moved to Workstream')
        const doneTickets = typedTickets.filter(t => t.status_category === 'Done' && t.status.toLowerCase() !== "won't do" && t.status.toLowerCase() !== 'wont do')
        const wontDoTickets = typedTickets.filter(t => t.status.toLowerCase() === "won't do" || t.status.toLowerCase() === 'wont do')
        const roiTickets = typedTickets.filter(t => t.roi_score !== null)

        // Ideas Submitted logic
        const wontDoCount = wontDoTickets.length
        const totalCount = totalTickets.length
        const totalExcludingWontDo = totalCount - wontDoCount
        const wontDoPercent = totalCount ? Math.round((wontDoCount / totalCount) * 100) : 0

        const hasReachedDiscovery = typedTickets.filter(t => t.status === 'Discovery').length

        const conversionToDiscovery = totalExcludingWontDo ? Math.round((hasReachedDiscovery / totalExcludingWontDo) * 100) : 0
        const ideasSubmittedKpi = {
            ...buildKpi(totalTickets),
            wontDo: wontDoCount,
            wontDoPercent,
            conversionToDiscovery,
        }

        // Ready for Discovery logic
        const rfdAges = readyForDiscoveryTickets.map(t => (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const avgAgeDays = rfdAges.length ? Math.round(rfdAges.reduce((a, b) => a + b, 0) / rfdAges.length) : 0
        const over14DaysCount = rfdAges.filter(age => age > 14).length
        const readyForDiscoveryIdeasKpi = {
            ...buildKpi(readyForDiscoveryTickets),
            avgAgeDays,
            over14DaysCount
        }

        // Helper to sum status durations
        const getSumDurations = (ticket: TicketRow, statusesToSum: string[]) => {
            if (!ticket.status_durations) return 0
            let sum = 0;
            let durs = ticket.status_durations as any
            if (typeof durs === 'string') { try { durs = JSON.parse(durs) } catch { durs = {} } }
            for (const [k, v] of Object.entries(durs)) {
                if (statusesToSum.map(s => s.toLowerCase()).includes(k.toLowerCase()) && typeof v === 'number') {
                    sum += v
                }
            }
            return sum / 86400
        }

        // On Discovery logic
        const preDiscoveryStatuses = ['Needs more information', 'Waiting for triage', 'Ready for Discovery']
        const daysToDiscoveryArray = discoveryTickets.map(t => getSumDurations(t, preDiscoveryStatuses)).filter(v => v > 0)
        const avgDaysToStart = daysToDiscoveryArray.length ? (daysToDiscoveryArray.reduce((a, b) => a + b, 0) / daysToDiscoveryArray.length).toFixed(1) : 0
        const conversionFromSubmitted = totalCount ? Math.round((discoveryTickets.length / totalCount) * 100) : 0
        const onDiscoveryKpi = {
            ...buildKpi(discoveryTickets),
            avgDaysToStart: Number(avgDaysToStart),
            conversionFromSubmitted
        }

        // At Workstream logic
        const sumDiscoveryAndPre = [...preDiscoveryStatuses, 'Discovery']
        const daysToWorkstreamArr = workstreamTickets.map(t => getSumDurations(t, sumDiscoveryAndPre)).filter(v => v > 0)
        const avgDaysToWorkstream = daysToWorkstreamArr.length ? (daysToWorkstreamArr.reduce((a, b) => a + b, 0) / daysToWorkstreamArr.length).toFixed(1) : 0
        const everDiscovery = discoveryTickets.length + workstreamTickets.length
        const conversionFromDiscovery = everDiscovery ? Math.round((workstreamTickets.length / everDiscovery) * 100) : 0
        const atWorkstreamKpi = {
            ...buildKpi(workstreamTickets),
            avgDaysToWorkstream: Number(avgDaysToWorkstream),
            conversionFromDiscovery
        }

        // Completed Ideas logic
        const completionRate = totalCount ? Math.round((doneTickets.length / totalCount) * 100) : 0
        const doneAges = doneTickets.map(t => (now.getTime() - new Date(t.created_at).getTime()) / (1000 * 60 * 60 * 24))
        const avgDaysToCompletion = doneAges.length ? Math.round(doneAges.reduce((a, b) => a + b, 0) / doneAges.length) : 0
        const completedIdeasKpi = {
            ...buildKpi(doneTickets),
            completionRate,
            avgDaysToCompletion
        }

        // Avg ROI Scoring logic
        const rois = roiTickets.map(t => t.roi_score as number).sort((a, b) => a - b)
        const avgRoiVal = rois.length ? rois.reduce((a, b) => a + b, 0) / rois.length : 0
        const medianRoi = rois.length ? rois[Math.floor(rois.length / 2)] : 0
        const top10Index = Math.floor(rois.length * 0.9)
        const top10Roi = rois.length > 0 ? rois[top10Index] : 0
        const avgRoiScoringKpi = {
            ...buildKpi(roiTickets, Number(avgRoiVal.toFixed(1)), 'roi'),
            medianRoi,
            top10Roi
        }

        const kpisObj = {
            ideasSubmitted: ideasSubmittedKpi,
            readyForDiscoveryIdeas: readyForDiscoveryIdeasKpi,
            onDiscovery: onDiscoveryKpi,
            atWorkstream: atWorkstreamKpi,
            completedIdeas: completedIdeasKpi,
            avgRoiScoring: avgRoiScoringKpi
        }

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
            originalRoiSum: number
            originalRoiCount: number
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
                    originalRoiSum: 0,
                    originalRoiCount: 0,
                }
            }
            collabMap[name].ticketCount++
            if (t.roi_score !== null) {
                collabMap[name].roiSum += t.roi_score
                collabMap[name].roiCount++
            }
            if (t.original_roi !== null && t.original_roi !== undefined) {
                collabMap[name].originalRoiSum += t.original_roi
                collabMap[name].originalRoiCount++
            }
        }

        const collaborators = Object.values(collabMap)
            .map((c) => ({
                name: c.name,
                avatar: c.avatar,
                ticketCount: c.ticketCount,
                avgRoi: c.roiCount > 0 ? Math.round((c.roiSum / c.roiCount) * 10) / 10 : null,
                avgOriginalRoi: c.originalRoiCount > 0 ? Math.round((c.originalRoiSum / c.originalRoiCount) * 10) / 10 : null,
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
            kpis: kpisObj,
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
