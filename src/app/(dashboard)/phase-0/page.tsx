'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardHeader } from '@/components/phase0/dashboard-header'

import { TimelineChart, type Granularity } from '@/components/phase0/timeline-chart'
import { StatusDistribution } from '@/components/phase0/status-distribution'
import { CollaboratorsReport } from '@/components/phase0/collaborators-report'
import { IssueListModal, ColumnDef } from '@/components/shared/modals/issue-list-modal'
import { ExternalLink } from 'lucide-react'

export interface Ticket {
    jira_key: string
    summary: string
    status: string
    status_category: string
    workstream: string | null
    roi_score: number | null
    created_at: string
    reporter_display_name: string | null
    reporter_avatar_url: string | null
}
import { Loader2 } from 'lucide-react'
import { KpiCards, type KPIs } from '@/components/phase0/kpi-cards'

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
    avgOriginalRoi: number | null
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

const emptyKpiBase = { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] }
const emptyKpis: KPIs = {
    ideasSubmitted: { ...emptyKpiBase, wontDo: 0, wontDoPercent: 0, conversionToDiscovery: 0 },
    readyForDiscoveryIdeas: { ...emptyKpiBase, avgAgeDays: 0, over14DaysCount: 0 },
    onDiscovery: { ...emptyKpiBase, avgDaysToStart: 0, conversionFromSubmitted: 0 },
    atWorkstream: { ...emptyKpiBase, avgDaysToWorkstream: 0, conversionFromDiscovery: 0 },
    completedIdeas: { ...emptyKpiBase, completionRate: 0, avgDaysToCompletion: 0 },
    avgRoiScoring: { ...emptyKpiBase, medianRoi: 0, top10Roi: 0 }
}

const statusColors: Record<string, string> = {
    'To Do': 'bg-slate-100 text-slate-700',
    'In Progress': 'bg-blue-50 text-blue-700',
    'Done': 'bg-emerald-50 text-emerald-700',
}

function getStatusColor(category: string) {
    return statusColors[category] || 'bg-slate-100 text-slate-600'
}

const JIRA_BASE = 'https://prioritycommerce.atlassian.net'

const ticketColumns: ColumnDef<Ticket>[] = [
    {
        header: 'Key',
        accessorKey: 'jira_key',
        cell: (t) => (
            <a
                href={`${JIRA_BASE}/browse/${t.jira_key}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors"
                title={t.jira_key}
            >
                {t.jira_key}
                <ExternalLink className="w-3 h-3" />
            </a>
        )
    },
    { header: 'Summary', cell: (t) => <span className="max-w-[300px] truncate block" title={t.summary}>{t.summary}</span>, accessorKey: 'summary' },
    {
        header: 'Status',
        accessorKey: 'status',
        cell: (t) => (
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(t.status_category)}`} title={t.status}>
                {t.status}
            </span>
        )
    },
    { header: 'ROI', accessorKey: 'roi_score', cell: (t) => <span className="font-medium text-xs text-slate-600">{t.roi_score !== null ? t.roi_score : '—'}</span> },
    {
        header: 'Reporter',
        accessorKey: 'reporter_display_name',
        cell: (t) => (
            <div className="flex items-center gap-1.5">
                {t.reporter_avatar_url && !t.reporter_avatar_url.startsWith('https://secure.gravatar.com/avatar/') ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={t.reporter_avatar_url} alt="" className="w-5 h-5 rounded-full" />
                ) : (
                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                        {(t.reporter_display_name || '?')[0]}
                    </div>
                )}
                <span className="text-xs text-slate-600 truncate max-w-[90px]" title={t.reporter_display_name || 'Unknown'}>
                    {t.reporter_display_name || 'Unknown'}
                </span>
            </div>
        )
    },
    { header: 'Created', accessorKey: 'created_at', cell: (t) => <span className="text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}</span> },
]

// ── Helpers to filter tickets for drill-down ──

function filterByKpi(tickets: Ticket[], kpiKey: string): Ticket[] {
    switch (kpiKey) {
        case 'ideasSubmitted': return tickets
        case 'readyForDiscoveryIdeas': return tickets.filter((t) => t.status && t.status.toLowerCase() === 'ready for discovery')
        case 'onDiscovery': return tickets.filter((t) => t.status === 'Discovery')
        case 'atWorkstream': return tickets.filter((t) => t.status === 'Moved to Workstream')
        case 'completedIdeas': return tickets.filter((t) => t.status_category === 'Done' && t.status.toLowerCase() !== "won't do" && t.status.toLowerCase() !== 'wont do')
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
            {drillDown && (
                <IssueListModal
                    key={drillDown.title}
                    open
                    onOpenChange={(op) => { if (!op) setDrillDown(null) }}
                    title={drillDown.title}
                    data={drillDown.tickets}
                    columns={ticketColumns}
                />
            )}
        </div>
    )
}
