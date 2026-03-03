'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardHeader } from '@/components/phase1/dashboard-header'
import { KpiCards, type PCBs as KPIs } from '@/components/phase1/kpi-cards'
import { TimelineChart, type Granularity } from '@/components/phase1/timeline-chart'
import { StatusDistribution } from '@/components/phase1/status-distribution'
import { CollaboratorsReport } from '@/components/phase1/collaborators-report'
import { IssueListModal, ColumnDef } from '@/components/shared/modals/issue-list-modal'
import { ExternalLink } from 'lucide-react'

export interface Phase1Ticket {
    id: string
    jira_key: string
    summary: string
    status: string
    status_category: string
    workstream: string | null
    team: string | null
    ticket_type: string | null
    created_at: string
    completed_at: string | null
    roi_score: number | null
    reporter_display_name: string | null
    reporter_avatar_url: string | null
    assignee_display_name: string | null
    assignee_avatar_url: string | null
    linked_work_item_count: number | null
    linked_work_items?: { key: string; status: string; issue_type: string; summary?: string }[] | null
}
import { BacklogDistribution } from '@/components/phase1/backlog-distribution'
import { IncidentManagementTab } from '@/components/phase1/incident-management-tab'
import { Loader2, ClipboardList, AlertTriangle } from 'lucide-react'

// Map the exact types returned by /api/phase1
interface DashboardData {
    kpis: KPIs
    tickets: Phase1Ticket[]
    timeline: { count_date: string; workstream: string; ticket_type: string; ticket_count: number }[]
    statusDistribution: { status: string; count: number; avgDaysInStatus: number | null; avgRoi: number | null }[]
    collaborators: { name: string; avatar: string | null; ticketCount: number; avgRoi: number | null; avgOriginalRoi: number | null }[]
    assignees: { name: string; avatar: string | null; ticketCount: number; avgRoi: number | null; avgOriginalRoi: number | null }[]
    workstreams: string[]
    lastSync: string | null
}

const emptyKpiBase = { value: 0, deltaAbsolute: 0, deltaPercent: 0, sparkline: [] }
const emptyKpis: KPIs = {
    discoveryItems: { ...emptyKpiBase },
    maintenanceRTB: { ...emptyKpiBase },
    waitingForTriage: { ...emptyKpiBase },
    inDiscovery: { ...emptyKpiBase },
    definitionGate: { ...emptyKpiBase },
    atWorkstreamBacklog: { ...emptyKpiBase },
    completedItems: { ...emptyKpiBase },
    linkedItemsBreakdown: []
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

const ticketColumns: ColumnDef<Phase1Ticket>[] = [
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
    { header: 'Summary', cell: (t) => <span className="max-w-[250px] truncate block" title={t.summary}>{t.summary}</span>, accessorKey: 'summary' },
    { header: 'Type', accessorKey: 'ticket_type', cell: (t) => <span className="text-slate-600 text-xs">{t.ticket_type || '—'}</span> },
    {
        header: 'ROI',
        accessorKey: 'roi_score',
        cell: (t) => (
            <span className="text-xs font-medium">
                {t.roi_score !== null && t.roi_score !== undefined ? (
                    <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                        {t.roi_score}
                    </span>
                ) : '—'}
            </span>
        )
    },
    {
        header: 'Status',
        accessorKey: 'status',
        cell: (t) => (
            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(t.status_category)}`} title={t.status}>
                <span className="max-w-[100px] truncate block">{t.status}</span>
            </span>
        )
    },
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

function filterByKpi(tickets: Phase1Ticket[], kpiKey: string): Phase1Ticket[] {
    switch (kpiKey) {
        case 'discoveryItems': return tickets.filter(t => t.ticket_type === 'Discovery' || t.ticket_type === 'Discovery Item')
        case 'maintenanceRTB': return tickets.filter(t => t.ticket_type === 'Maintenance (RTB)')
        case 'waitingForTriage': return tickets.filter(t => {
            const s = (t.status || '').toLowerCase()
            return s === 'needs more information' || s === 'needs more info' || s === 'waiting for triage' || s === 'open'
        })
        case 'inDiscovery': return tickets.filter(t => {
            const s = (t.status || '').toLowerCase()
            return s === 'discovery' || s === 'in progress'
        })
        case 'definitionGate': return tickets.filter(t => {
            const s = (t.status || '').toLowerCase()
            return s === 'internal audit' || s === 'definition gate' || s === 'pending sign-off'
        })
        case 'atWorkstreamBacklog': return tickets.filter(t => {
            const s = (t.status || '').toLowerCase()
            return s === 'backlog' || s === 'moved to workstream backlog'
        })
        case 'completedItems': return tickets.filter(t => {
            const s = (t.status || '').toLowerCase()
            return s === 'done'
        })
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
        const getMappedStatus = (originalStatus: string) => {
            const sLower = (originalStatus || '').toLowerCase()
            if (sLower === 'open' || sLower === 'waiting for triage' || sLower === 'needs more information' || sLower === 'needs more info') return 'Waiting for triage'
            if (sLower === 'ready for discovery') return 'Ready for Discovery'
            if (sLower === 'in progress' || sLower === 'discovery') return 'Discovery'
            if (sLower === 'pending sign-off' || sLower === 'internal audit' || sLower === 'definition gate') return 'Definition Gate'
            if (sLower === 'moved to workstream backlog' || sLower === 'backlog') return 'Moved to Workstream Backlog'
            if (sLower === 'done') return 'Done'
            if (sLower === 'declined' || sLower === 'descoped' || sLower === "won't do") return "Won't do"
            return originalStatus
        }

        setDrillDown({
            title: `Status: ${status}`,
            tickets: tickets.filter(t => getMappedStatus(t.status) === status)
        })
    }

    const handleCollaboratorDrillDown = (name: string) => {
        setDrillDown({ title: `Reporter: ${name}`, tickets: tickets.filter(t => (t.reporter_display_name || 'Unknown') === name) })
    }

    const handleAssigneeDrillDown = (name: string) => {
        setDrillDown({ title: `Assignee: ${name}`, tickets: tickets.filter(t => (t.assignee_display_name || 'Unassigned') === name) })
    }

    const handleBacklogDrillDown = (type: string) => {
        const backlogTickets = tickets.filter(t => t.status === 'Moved to Workstream Backlog' || t.status === 'Backlog')
        const linkedTickets: Phase1Ticket[] = []

        backlogTickets.forEach(parentTicket => {
            if (parentTicket.linked_work_items && Array.isArray(parentTicket.linked_work_items)) {
                parentTicket.linked_work_items.forEach(linkedItem => {
                    if (linkedItem.issue_type === type) {
                        const s = (linkedItem.status || '').toLowerCase()
                        const category = (s.includes('done') || s.includes('closed')) ? 'Done' : (s.includes('progress') ? 'In Progress' : 'To Do')

                        linkedTickets.push({
                            id: linkedItem.key,
                            jira_key: linkedItem.key,
                            summary: linkedItem.summary ? linkedItem.summary : `Linked to ${parentTicket.jira_key}: ${parentTicket.summary || ''}`,
                            status: linkedItem.status || 'Open',
                            status_category: category,
                            workstream: parentTicket.workstream,
                            team: parentTicket.team,
                            ticket_type: linkedItem.issue_type,
                            created_at: parentTicket.created_at,
                            completed_at: null,
                            roi_score: null,
                            reporter_display_name: parentTicket.reporter_display_name,
                            reporter_avatar_url: parentTicket.reporter_avatar_url,
                            assignee_display_name: parentTicket.assignee_display_name,
                            assignee_avatar_url: parentTicket.assignee_avatar_url,
                            linked_work_item_count: null,
                            linked_work_items: null
                        })
                    }
                })
            }
        })

        // Deduplicate in case multiple backlog items link to the same external issue
        const uniqueTickets = Array.from(new Map(linkedTickets.map(item => [item.id, item])).values())

        setDrillDown({
            title: `Workstream Backlog: ${type} items`,
            tickets: uniqueTickets
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
    const assignees = data?.assignees || []
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
                <IncidentManagementTab />
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
                                data={data?.kpis.linkedItemsBreakdown || []}
                                onItemClick={handleBacklogDrillDown}
                            />
                            <CollaboratorsReport
                                reportersData={collaborators}
                                assigneesData={assignees}
                                onReporterClick={handleCollaboratorDrillDown}
                                onAssigneeClick={handleAssigneeDrillDown}
                            />
                        </div>
                    </div>
                </div>
            )}

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
