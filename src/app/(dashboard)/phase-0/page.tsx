'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardHeader } from '@/components/phase0/dashboard-header'
import { KpiCards } from '@/components/phase0/kpi-cards'
import { TimelineChart, type Granularity } from '@/components/phase0/timeline-chart'
import { StatusDistribution } from '@/components/phase0/status-distribution'
import { CollaboratorsReport } from '@/components/phase0/collaborators-report'
import { TicketListModal, type Ticket } from '@/components/phase0/ticket-list-modal'
import { Loader2 } from 'lucide-react'

interface KPIs {
    total: number
    inProgress: number
    discovery: number
    movedToWorkstream: number
    done: number
    wontDo: number
    avgRoi: number
}

interface DailyCount {
    count_date: string
    workstream: string
    ticket_count: number
}

interface StatusData {
    status: string
    count: number
    avgRoi: number | null
    avgDaysInStatus: number | null
}

interface Collaborator {
    name: string
    avatar: string | null
    ticketCount: number
    avgRoi: number | null
}

interface DashboardData {
    kpis: KPIs
    tickets: Ticket[]
    timeline: DailyCount[]
    statusDistribution: StatusData[]
    collaborators: Collaborator[]
    workstreams: string[]
    lastSync: string | null
}

interface DrillDown {
    title: string
    tickets: Ticket[]
}

const emptyKpis: KPIs = { total: 0, inProgress: 0, discovery: 0, movedToWorkstream: 0, done: 0, wontDo: 0, avgRoi: 0 }

// ── Helpers to filter tickets for drill-down ──

function filterByKpi(tickets: Ticket[], kpiKey: string): Ticket[] {
    switch (kpiKey) {
        case 'total': return tickets
        case 'inProgress': return tickets.filter((t) => t.status_category === 'In Progress')
        case 'discovery': return tickets.filter((t) => t.status === 'Discovery')
        case 'movedToWorkstream': return tickets.filter((t) => t.status === 'Moved to Workstream')
        case 'done': return tickets.filter((t) => t.status_category === 'Done')
        default: return tickets
    }
}

function filterByPeriod(tickets: Ticket[], period: string, granularity: Granularity): Ticket[] {
    return tickets.filter((t) => {
        const dateStr = t.created_at.substring(0, 10)
        // Must use new Date(dateStr) — same as chart's getGranularityKey — NOT new Date(dateStr + 'T00:00:00')
        const d = new Date(dateStr)

        switch (granularity) {
            case 'daily':
                return dateStr === period
            case 'weekly': {
                const startOfWeek = new Date(d)
                startOfWeek.setDate(d.getDate() - d.getDay())
                return startOfWeek.toISOString().split('T')[0] === period
            }
            case 'monthly':
                return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}` === period
            case 'quarterly': {
                const q = Math.ceil((d.getUTCMonth() + 1) / 3)
                return `${d.getUTCFullYear()}-Q${q}` === period
            }
        }
    })
}

function filterByStatus(tickets: Ticket[], status: string): Ticket[] {
    return tickets.filter((t) => t.status === status)
}

function filterByReporter(tickets: Ticket[], name: string): Ticket[] {
    return tickets.filter((t) => (t.reporter_display_name || 'Unknown') === name)
}

export default function Phase0Page() {
    const searchParams = useSearchParams()
    const selectedWorkstream = searchParams?.get('workstream') || null

    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [drillDown, setDrillDown] = useState<DrillDown | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setError(null)
            const params = new URLSearchParams()
            if (selectedWorkstream) params.set('workstream', selectedWorkstream)

            const res = await fetch(`/api/phase0?${params}`)
            if (!res.ok) throw new Error('Failed to fetch dashboard data')
            const json = await res.json()
            setData(json)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [selectedWorkstream])

    useEffect(() => {
        fetchData()
    }, [fetchData])


    // ── Drill-down handlers ──

    const tickets = data?.tickets || []

    const handleKpiDrillDown = (kpiKey: string, label: string) => {
        setDrillDown({ title: label, tickets: filterByKpi(tickets, kpiKey) })
    }

    const handleTimelineDrillDown = (period: string, granularity: Granularity) => {
        const filtered = filterByPeriod(tickets, period, granularity)
        const label = granularity === 'daily' ? period
            : granularity === 'weekly' ? `Week of ${period}`
                : granularity === 'monthly' ? period
                    : period
        setDrillDown({ title: `Tickets Created — ${label}`, tickets: filtered })
    }

    const handleStatusDrillDown = (status: string) => {
        setDrillDown({ title: `Status: ${status}`, tickets: filterByStatus(tickets, status) })
    }

    const handleCollaboratorDrillDown = (name: string) => {
        setDrillDown({ title: `Reporter: ${name}`, tickets: filterByReporter(tickets, name) })
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 animate-in fade-in duration-500">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm text-slate-400">Loading dashboard data…</p>
            </div>
        )
    }

    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 animate-in fade-in duration-500">
                <div className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl text-sm max-w-md text-center">
                    <p className="font-semibold mb-1">Error loading dashboard</p>
                    <p className="text-red-500">{error}</p>
                </div>
            </div>
        )
    }

    const kpis = data?.kpis || emptyKpis
    const timeline = data?.timeline || []
    const statusDistribution = data?.statusDistribution || []
    const collaborators = data?.collaborators || []
    const lastSync = data?.lastSync || null

    return (
        <div className="flex flex-col w-full animate-in fade-in duration-500">
            <DashboardHeader
                lastSync={lastSync}
            />

            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-sm mb-4">
                    ⚠️ {error}
                </div>
            )}

            <KpiCards kpis={kpis} onDrillDown={handleKpiDrillDown} />

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                <div className="lg:col-span-8 flex flex-col gap-4">
                    <TimelineChart
                        data={timeline}
                        selectedWorkstream={selectedWorkstream}
                        onPeriodClick={handleTimelineDrillDown}
                    />
                    <StatusDistribution
                        data={statusDistribution}
                        onStatusClick={handleStatusDrillDown}
                    />
                </div>
                <div className="lg:col-span-4">
                    <CollaboratorsReport
                        data={collaborators}
                        onCollaboratorClick={handleCollaboratorDrillDown}
                    />
                </div>
            </div>

            {/* Drill-down modal */}
            <TicketListModal
                open={drillDown !== null}
                title={drillDown?.title || ''}
                tickets={drillDown?.tickets || []}
                onClose={() => setDrillDown(null)}
            />
        </div>
    )
}
