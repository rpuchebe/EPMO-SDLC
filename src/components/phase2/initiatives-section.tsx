'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Activity, AlertTriangle, Calendar, AlertOctagon, Waypoints, Clock, ShieldAlert, CheckCircle2, CircleDashed, TrendingUp, TrendingDown, Minus, ExternalLink } from 'lucide-react'
import { InvestmentCategoryDonut } from './charts/investment-category-donut'
import { InitiativeStatusGauge } from './charts/initiative-status-gauge'
import { WorkstreamBarChart } from './charts/workstream-bar-chart'
import { IssueListModal, ColumnDef } from './modals/issue-list-modal'
import { format } from 'date-fns'

type Severity = 'High' | 'Medium' | 'Low' | 'None'

interface Initiative {
    key: string
    summary: string
    status: string
    workstream: string
    investment_category: string | null
    children_count: number
    open_children_count: number
    created_at: string
    start_date: string | null
    due_date: string | null
}

interface AlertSeverities {
    missingDates: Severity
    behindSchedule: Severity
    noChildIssues: Severity
    closedOpenChildren: Severity
    statusInconsistency: Severity
}

interface AlertTrends {
    missingDates: { weekly: number | null; monthly: number | null }
    behindSchedule: { weekly: number | null; monthly: number | null }
    noChildIssues: { weekly: number | null; monthly: number | null }
    closedOpenChildren: { weekly: number | null; monthly: number | null }
    statusInconsistency: { weekly: number | null; monthly: number | null }
}

interface InitiativesSectionProps {
    data: {
        raw: Initiative[]
        alertSeverities?: AlertSeverities
        alertTrends?: AlertTrends
        trendUnassigned?: number | null
        [key: string]: any
    }
}

const INV_CATEGORIES = [
    { name: 'Strategic Innovation', color: '#10b981' },
    { name: 'Scale & Reliability', color: '#3b82f6' },
    { name: 'Revenue-Commit', color: '#8b5cf6' },
    { name: 'Sales Activation', color: '#f59e0b' },
    { name: 'Support', color: '#f43f5e' },
    { name: 'Unassigned', color: '#94a3b8' }
]

export function InitiativesSection({ data }: InitiativesSectionProps) {
    const initiatives = data.raw || []
    const alertSeverities = data.alertSeverities
    const alertTrends = data.alertTrends
    const trendUnassigned = data.trendUnassigned ?? null

    // --- Row 1 Data calculations ---
    const createdCount = initiatives.length
    const completedCount = initiatives.filter(i => i.status === 'Done').length
    const inProgressCount = initiatives.filter(i => i.status === 'In Progress').length
    const pendingCount = initiatives.filter(i => i.status === 'To Do').length

    const gaugeData = [
        { name: 'Completed', value: completedCount, color: '#10b981' },
        { name: 'In Progress', value: inProgressCount, color: '#fbbf24' },
        { name: 'Pending', value: pendingCount, color: '#94a3b8' }
    ]

    const invCategoryData = useMemo(() => {
        const counts: Record<string, number> = {}
        INV_CATEGORIES.forEach(c => counts[c.name] = 0)

        initiatives.forEach(i => {
            const catStr = i.investment_category || 'Unassigned'
            if (counts[catStr] !== undefined) counts[catStr]++
            else counts['Unassigned']++
        })

        return INV_CATEGORIES.map(c => ({
            name: c.name,
            value: counts[c.name],
            color: c.color
        })).filter(c => c.value > 0)
    }, [initiatives])

    // --- Workstream Distribution ---
    const WORKSTREAM_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#06b6d4', '#84cc16', '#a855f7']
    const workstreamData = useMemo(() => {
        const counts: Record<string, number> = {}
        initiatives.forEach(i => {
            const ws = i.workstream || 'Unassigned'
            counts[ws] = (counts[ws] || 0) + 1
        })
        return Object.entries(counts)
            .map(([name, count], i) => ({ name, count, color: WORKSTREAM_COLORS[i % WORKSTREAM_COLORS.length] }))
            .sort((a, b) => b.count - a.count)
    }, [initiatives])

    // --- Row 2 Governance Alert Lists (for modal drill-down) ---
    const isCompleted = (status: string) => status === 'Done'
    const isToDo = (status: string) => status === 'To Do'

    const alerts = useMemo(() => {
        const now = new Date()

        const missingDates = initiatives.filter(i => !i.start_date || !i.due_date)
        const behindSchedule = initiatives.filter(i => {
            if (i.start_date && new Date(i.start_date) < now && isToDo(i.status)) return true
            if (i.due_date && new Date(i.due_date) < now && !isCompleted(i.status)) return true
            return false
        })
        const noChildren = initiatives.filter(i => i.children_count === 0)
        const closedOpenChildren = initiatives.filter(i => isCompleted(i.status) && i.open_children_count > 0 && i.children_count > 0)
        const statusInconsistency = initiatives.filter(i => {
            if (i.status === 'In Progress' && i.children_count > 0 && i.open_children_count === 0) return true
            if (isToDo(i.status) && i.children_count > 0 && i.children_count > i.open_children_count) return true
            return false
        })

        return { missingDates, behindSchedule, noChildren, closedOpenChildren, statusInconsistency }
    }, [initiatives])

    // --- Trend badge rendering ---
    const trendBadge = trendUnassigned !== null ? (
        <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium
            ${trendUnassigned > 0 ? 'bg-rose-50 text-rose-600' : trendUnassigned < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
            {trendUnassigned > 0
                ? <TrendingUp className="w-3 h-3" />
                : trendUnassigned < 0
                    ? <TrendingDown className="w-3 h-3" />
                    : <Minus className="w-3 h-3" />}
            {trendUnassigned > 0 ? '+' : ''}{trendUnassigned.toFixed(1)}% Unassigned
        </div>
    ) : (
        <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-slate-50 text-slate-400 border border-slate-100/50">
            <Activity className="w-2.5 h-2.5 opacity-50" />
            <span>Trend pending</span>
        </div>
    )

    // --- Modals State ---
    const [modalData, setModalData] = useState<{ open: boolean, title: string, list: Initiative[], columns?: ColumnDef<Initiative>[] }>({
        open: false,
        title: '',
        list: []
    })

    const baseColumns: ColumnDef<Initiative>[] = [
        {
            header: 'Key', cell: (i) => (
                <a href={`https://prioritycommerce.atlassian.net/browse/${i.key}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold flex items-center gap-1.5 group">
                    {i.key}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            )
        },
        {
            header: 'Summary',
            cell: (i) => <span className="font-medium text-slate-700 line-clamp-2">{i.summary}</span>
        },
        {
            header: 'Status', cell: (i) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border
                    ${isCompleted(i.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        i.status === 'In Progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                    {i.status}
                </span>
            )
        },
        { header: 'Workstream', cell: (i) => <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold uppercase whitespace-nowrap">{i.workstream}</span> },
        {
            header: 'Created',
            cell: (i) => <span className="text-slate-500 whitespace-nowrap tabular-nums">{format(new Date(i.created_at), 'MMM dd, yyyy')}</span>
        },
    ]

    const datesColumns: ColumnDef<Initiative>[] = [
        {
            header: 'Start Date',
            cell: (i) => (
                <span className={`whitespace-nowrap tabular-nums font-medium ${!i.start_date ? 'text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded' : 'text-slate-600'}`}>
                    {!i.start_date ? <><AlertTriangle className="w-3 h-3" /> Missing</> : format(new Date(i.start_date), 'MMM dd, yyyy')}
                </span>
            )
        },
        {
            header: 'Due Date',
            cell: (i) => {
                const isPastDue = i.due_date && new Date(i.due_date) < new Date() && !isCompleted(i.status)
                return (
                    <span className={`whitespace-nowrap tabular-nums font-medium ${!i.due_date ? 'text-rose-500 flex items-center gap-1 bg-rose-50 px-2 py-0.5 rounded' : isPastDue ? 'text-amber-500 flex items-center gap-1 bg-amber-50 px-2 py-0.5 rounded' : 'text-slate-600'}`}>
                        {!i.due_date ? <><AlertTriangle className="w-3 h-3" /> Missing</> : format(new Date(i.due_date), 'MMM dd, yyyy')}
                        {isPastDue && <Clock className="w-3 h-3" />}
                    </span>
                )
            }
        }
    ]

    const childsColumn: ColumnDef<Initiative> = {
        header: 'Childs', cell: (i) => (
            <span className="text-slate-500">{i.children_count - i.open_children_count} / {i.children_count} closed</span>
        )
    }

    const inconsistencyColumn: ColumnDef<Initiative> = {
        header: 'Inconsistency Reason',
        cell: (i) => {
            let reason = 'Unknown'
            if (i.status === 'In Progress' && i.children_count > 0 && i.open_children_count === 0) reason = 'In Progress but 100% children closed'
            if (isToDo(i.status) && i.children_count > 0 && i.children_count > i.open_children_count) reason = 'To Do but children already started'
            return <span className="text-amber-600 font-medium text-xs bg-amber-50 px-2 py-1 rounded-md border border-amber-100">{reason}</span>
        }
    }

    const categoryColumn: ColumnDef<Initiative> = {
        header: 'Investment Category', cell: (i) => (
            <span className="bg-indigo-50 text-indigo-700 font-bold px-2 py-0.5 rounded text-[11px] uppercase">{i.investment_category || 'Unassigned'}</span>
        )
    }

    const openModal = (title: string, list: Initiative[], cols: ColumnDef<Initiative>[]) => {
        setModalData({ open: true, title, list, columns: cols })
    }


    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">
            {/* Section header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                <div className="w-[3px] h-5 rounded-full bg-[#39c4d0] flex-shrink-0" />
                <Image src="/initiatives-icon.png" width={20} height={20} alt="Initiatives Icon" className="rounded-md" />
                <h2 className="text-sm font-semibold text-slate-800">Workstream Initiatives</h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">{createdCount} initiatives</span>
            </div>

            <div className="p-6 space-y-4">
                {/* --- ROW 1: Metrics & Charts --- */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[200px] max-h-[200px]">

                    {/* 1. Initiative Progress */}
                    <div
                        onClick={() => openModal('All Initiatives', initiatives, [...baseColumns, childsColumn])}
                        className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group flex flex-col"
                    >
                        <h3 className="text-[12px] font-medium text-slate-600 mb-1">Initiative Progress</h3>
                        <div className="flex-1 flex flex-col justify-end">
                            <InitiativeStatusGauge data={gaugeData} total={createdCount} />
                        </div>
                    </div>

                    {/* 2. By Workstream */}
                    <div
                        onClick={() => openModal('All Initiatives by Workstream', initiatives, [...baseColumns, childsColumn])}
                        className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex flex-col"
                    >
                        <h3 className="text-[12px] font-medium text-slate-600 mb-1">By Workstream</h3>
                        <div className="flex-1 min-h-0">
                            <WorkstreamBarChart
                                data={workstreamData}
                                onClickBar={(ws) => openModal(`Workstream: ${ws}`, initiatives.filter(i => i.workstream === ws), [...baseColumns, childsColumn])}
                            />
                        </div>
                    </div>

                    {/* 3. Investment Category */}
                    <div className="col-span-1 relative group flex flex-col h-full rounded-2xl bg-white border border-slate-200 shadow-sm p-4 hover:border-slate-300 hover:shadow-md transition-all">
                        <div className="flex justify-between items-center mb-1 z-10 relative">
                            <h3 className="text-[12px] font-medium text-slate-600">Investment Category</h3>
                            {trendBadge}
                        </div>
                        <div className="absolute inset-0 z-0 bg-transparent rounded-2xl"
                            onClick={() => openModal('Investment Categories', initiatives, [...baseColumns, categoryColumn])}
                        />
                        <div className="relative z-10 w-full h-full pointer-events-none">
                            <div className="pointer-events-auto h-full w-full">
                                <InvestmentCategoryDonut
                                    data={invCategoryData}
                                    total={createdCount}
                                    trendPercentage={trendUnassigned ?? 0}
                                    onClickSlice={(name) => openModal(`Category: ${name}`, initiatives.filter(i => (i.investment_category || 'Unassigned') === name), [...baseColumns, categoryColumn])}
                                />
                            </div>
                        </div>
                    </div>
                </div>

                {/* --- ROW 2: Governance Alerts --- */}
                <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                    <AlertCard
                        title="Missing Critical Dates"
                        count={alerts.missingDates.length}
                        severity={alertSeverities?.missingDates ?? 'Medium'}
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        onClick={() => openModal('Missing Critical Dates', alerts.missingDates, [...baseColumns.filter(c => c.header !== 'Created'), ...datesColumns])}
                        weeklyTrend={alertTrends?.missingDates?.weekly ?? null}
                        monthlyTrend={alertTrends?.missingDates?.monthly ?? null}
                    />
                    <AlertCard
                        title="Behind Schedule"
                        count={alerts.behindSchedule.length}
                        severity={alertSeverities?.behindSchedule ?? 'High'}
                        icon={<Clock className="w-3.5 h-3.5" />}
                        onClick={() => openModal('Behind Schedule', alerts.behindSchedule, [...baseColumns.filter(c => c.header !== 'Created'), ...datesColumns])}
                        weeklyTrend={alertTrends?.behindSchedule?.weekly ?? null}
                        monthlyTrend={alertTrends?.behindSchedule?.monthly ?? null}
                    />
                    <AlertCard
                        title="No Child Issues"
                        count={alerts.noChildren.length}
                        severity={alertSeverities?.noChildIssues ?? 'High'}
                        icon={<AlertOctagon className="w-3.5 h-3.5" />}
                        onClick={() => openModal('Without Child Issues', alerts.noChildren, baseColumns)}
                        weeklyTrend={alertTrends?.noChildIssues?.weekly ?? null}
                        monthlyTrend={alertTrends?.noChildIssues?.monthly ?? null}
                    />
                    <AlertCard
                        title="Closed, Open Children"
                        count={alerts.closedOpenChildren.length}
                        severity={alertSeverities?.closedOpenChildren ?? 'High'}
                        icon={<AlertTriangle className="w-3.5 h-3.5" />}
                        onClick={() => openModal('Closed with Open Children', alerts.closedOpenChildren, [...baseColumns, childsColumn])}
                        weeklyTrend={alertTrends?.closedOpenChildren?.weekly ?? null}
                        monthlyTrend={alertTrends?.closedOpenChildren?.monthly ?? null}
                    />
                    <AlertCard
                        title="Status Inconsistency"
                        count={alerts.statusInconsistency.length}
                        severity={alertSeverities?.statusInconsistency ?? 'Medium'}
                        icon={<Waypoints className="w-3.5 h-3.5" />}
                        onClick={() => openModal('Status Inconsistency', alerts.statusInconsistency, [...baseColumns, inconsistencyColumn])}
                        weeklyTrend={alertTrends?.statusInconsistency?.weekly ?? null}
                        monthlyTrend={alertTrends?.statusInconsistency?.monthly ?? null}
                    />
                </div>
            </div>

            <IssueListModal
                open={modalData.open}
                onOpenChange={(op) => setModalData(prev => ({ ...prev, open: op }))}
                title={modalData.title}
                data={modalData.list}
                columns={modalData.columns || baseColumns}
            />
        </section>
    )
}


function AlertCard({ title, count, severity, icon, onClick, weeklyTrend, monthlyTrend }: {
    title: string
    count: number
    severity: Severity
    icon: React.ReactNode
    onClick: () => void
    weeklyTrend: number | null
    monthlyTrend: number | null
}) {
    const colors =
        severity === 'High'
            ? { icon: 'bg-rose-50 text-rose-600', badge: 'bg-rose-100 text-rose-700' }
            : severity === 'Medium'
                ? { icon: 'bg-amber-50 text-amber-600', badge: 'bg-amber-100 text-amber-700' }
                : severity === 'Low'
                    ? { icon: 'bg-yellow-50 text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' }
                    : { icon: 'bg-slate-50 text-slate-500', badge: 'bg-slate-100 text-slate-500' }

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 p-4 pt-3.5 flex flex-col h-[155px] relative overflow-hidden cursor-pointer"
        >
            {/* Title row */}
            <div className="flex items-center gap-1.5 mb-2 relative z-10">
                <div className={`w-[22px] h-[22px] flex-shrink-0 flex items-center justify-center rounded-lg ${colors.icon}`}>
                    {icon}
                </div>
                <span className="text-[12px] font-medium text-slate-600 truncate">{title}</span>
            </div>

            {/* Main value & Weekly Trend */}
            <div className="flex items-end justify-between mb-3 relative z-10">
                <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight">
                    {count}
                </div>

                {weeklyTrend !== null ? (
                    <div className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold mb-1
                        ${weeklyTrend > 0 ? 'bg-rose-50 text-rose-600' : weeklyTrend < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        {weeklyTrend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : weeklyTrend < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                        {weeklyTrend > 0 ? '+' : ''}{weeklyTrend.toFixed(0)}%
                    </div>
                ) : (
                    <div className="text-[9px] text-slate-300 italic mb-1">Weekly pending</div>
                )}
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-slate-100 mb-2 relative z-10" />

            {/* Bottom row: Monthly Trend */}
            <div className="flex flex-col gap-1.5 relative z-10">
                <div className="flex items-center justify-between">
                    <span className="text-[10.5px] text-slate-500 font-medium">Severity</span>
                    {count > 0 ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide ${colors.badge}`}>
                            {severity}
                        </span>
                    ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md">
                            None
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-end">
                    {monthlyTrend !== null ? (
                        <div className={`flex items-center gap-0.5 text-[9px] font-semibold
                            ${monthlyTrend > 0 ? 'text-rose-500' : monthlyTrend < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {monthlyTrend > 0 ? <TrendingUp className="w-2 h-2" /> : monthlyTrend < 0 ? <TrendingDown className="w-2 h-2" /> : <Minus className="w-2 h-2" />}
                            <span>{monthlyTrend > 0 ? '+' : ''}{monthlyTrend.toFixed(0)}% monthly</span>
                        </div>
                    ) : (
                        <span className="text-[8.5px] text-slate-300 italic">Monthly trend pending</span>
                    )}
                </div>
            </div>
        </div>
    )
}
