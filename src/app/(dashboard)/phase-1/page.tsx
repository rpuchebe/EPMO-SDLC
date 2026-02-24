'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardHeader } from '@/components/phase1/dashboard-header'
import { KpiCards } from '@/components/phase1/kpi-cards'
import { TimelineChart, type Granularity } from '@/components/phase1/timeline-chart'
import { StatusDistribution } from '@/components/phase1/status-distribution'
import { CollaboratorsReport } from '@/components/phase1/collaborators-report'
import { TicketListModal, type Phase1Ticket } from '@/components/phase1/ticket-list-modal'
import { BacklogDistribution } from '@/components/phase1/backlog-distribution'
import { Loader2, ClipboardList, AlertTriangle } from 'lucide-react'

// Map the exact types returned by /api/phase1
interface DashboardData {
    kpis: {
        discoveryItems: number
        maintenanceRTB: number
        waitingForTriage: number
        inDiscovery: number
        definitionGate: number
        atWorkstreamBacklog: number
        completedItems: number
        linkedItemsBreakdown: { type: string; count: number; percentage: number }[]
    }
    tickets: Phase1Ticket[]
    timeline: { count_date: string; workstream: string; ticket_type: string; ticket_count: number }[]
    statusDistribution: { status: string; count: number; avgDaysInStatus: number | null; avgRoi: number | null }[]
    collaborators: { name: string; avatar: string | null; ticketCount: number; avgRoi: number | null }[]
    workstreams: string[]
    lastSync: string | null
}

const emptyKpis = {
    discoveryItems: 0, maintenanceRTB: 0, waitingForTriage: 0,
    inDiscovery: 0, definitionGate: 0, atWorkstreamBacklog: 0,
    completedItems: 0, linkedItemsBreakdown: []
}

function filterByKpi(tickets: Phase1Ticket[], kpiKey: string): Phase1Ticket[] {
    switch (kpiKey) {
        case 'discoveryItems': return tickets.filter(t => t.ticket_type === 'Discovery')
        case 'maintenanceRTB': return tickets.filter(t => t.ticket_type === 'Maintenance (RTB)')
        case 'waitingForTriage': return tickets.filter(t => t.status === 'Needs more information')
        case 'inDiscovery': return tickets.filter(t => t.status === 'Discovery')
        case 'definitionGate': return tickets.filter(t => t.status === 'Internal audit')
        case 'atWorkstreamBacklog': return tickets.filter(t => t.status === 'Backlog')
        case 'completedItems': return tickets.filter(t => t.status_category === 'Done' || t.completed_at !== null)
        default: return tickets
    }
}

function filterByPeriod(tickets: Phase1Ticket[], period: string, granularity: Granularity): Phase1Ticket[] {
    return tickets.filter((t) => {
        const dateStr = t.created_at.substring(0, 10)
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
            default:
                return false
        }
    })
}

export default function Phase1Page() {
    const searchParams = useSearchParams()
    const selectedWorkstream = searchParams?.get('workstream') || null
    const selectedTeam = searchParams?.get('team') || null

    const [activeTab, setActiveTab] = useState<'planned_work' | 'incident_management'>('planned_work')

    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [drillDown, setDrillDown] = useState<{ title: string, tickets: Phase1Ticket[] } | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setError(null)
            const params = new URLSearchParams()
            if (selectedWorkstream) params.set('workstream', selectedWorkstream)
            if (selectedTeam) params.set('team', selectedTeam)



            const res = await fetch(`/api/phase1?${params}`)
            if (!res.ok) throw new Error('Failed to fetch dashboard data')
            const json = await res.json()
            setData(json)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [selectedWorkstream, selectedTeam])

    useEffect(() => {
        fetchData()
    }, [fetchData])

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
        setDrillDown({ title: `Status: ${status}`, tickets: tickets.filter(t => t.status === status) })
    }

    const handleCollaboratorDrillDown = (name: string) => {
        setDrillDown({ title: `Reporter: ${name}`, tickets: tickets.filter(t => (t.reporter_display_name || 'Unknown') === name) })
    }

    const handleBacklogDrillDown = (type: string) => {
        setDrillDown({
            title: `Workstream Backlog: ${type} items`,
            tickets: tickets.filter(t =>
                (t.status === 'Moved to Workstream Backlog' || t.status === 'Backlog') &&
                t.linked_work_items?.some(i => i.issue_type === type)
            )
        })
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 animate-in fade-in duration-500">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-slate-400">Loading Phase 1 dashboard data…</p>
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
            <DashboardHeader lastSync={lastSync} />

            {/* Tabs & Date FilterRow */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 relative">
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
                    <button
                        onClick={() => setActiveTab('planned_work')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'planned_work'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        <ClipboardList className="w-4 h-4" />
                        Planned Work
                    </button>
                    <button
                        onClick={() => setActiveTab('incident_management')}
                        className={`flex flex-col sm:flex-row items-center justify-center gap-2 flex-1 sm:flex-none px-4 py-2 text-sm font-semibold rounded-lg transition-all ${activeTab === 'incident_management'
                            ? 'bg-white text-blue-700 shadow-sm'
                            : 'text-slate-500 hover:text-slate-700 hover:bg-slate-200/50'
                            }`}
                    >
                        <AlertTriangle className="w-4 h-4" />
                        Incident Management
                    </button>
                </div>


            </div>

            {error && !data && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-sm mb-4">
                    ⚠️ {error}
                </div>
            )}

            {activeTab === 'incident_management' && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-12 flex flex-col items-center justify-center min-h-[300px]">
                    <h2 className="text-xl font-semibold text-slate-800 mb-2">Incident Management</h2>
                    <p className="text-slate-500">Coming soon</p>
                </div>
            )}

            {activeTab === 'planned_work' && (
                <div className="flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
                    <KpiCards kpis={kpis} onDrillDown={handleKpiDrillDown} />

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
                        <div className="lg:col-span-8 flex flex-col gap-4">
                            <TimelineChart
                                data={timeline}
                                onPeriodClick={handleTimelineDrillDown}
                            />
                            <StatusDistribution
                                data={statusDistribution}
                                onStatusClick={handleStatusDrillDown}
                            />
                        </div>
                        <div className="lg:col-span-4 flex flex-col gap-4">
                            <BacklogDistribution
                                data={kpis.linkedItemsBreakdown}
                                onItemClick={handleBacklogDrillDown}
                            />
                            <CollaboratorsReport
                                data={collaborators}
                                onCollaboratorClick={handleCollaboratorDrillDown}
                            />
                        </div>
                    </div>
                </div>
            )}

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
