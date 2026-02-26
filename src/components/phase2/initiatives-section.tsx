'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { Activity, AlertTriangle, Calendar, AlertOctagon, Waypoints, Clock, ShieldAlert, CheckCircle2, CircleDashed, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { InvestmentCategoryDonut } from './charts/investment-category-donut'
import { InitiativeStatusGauge } from './charts/initiative-status-gauge'
import { WorkstreamBarChart } from './charts/workstream-bar-chart'
import { IssueListModal, ColumnDef } from './modals/issue-list-modal'
import { format } from 'date-fns'

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

interface InitiativesSectionProps {
    data: {
        raw: Initiative[]
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

    // --- Row 1 Data calculations ---
    const createdCount = initiatives.length
    const completedCount = initiatives.filter(i => ['Done', 'Closed'].includes(i.status)).length
    const inProgressCount = initiatives.filter(i => i.status === 'In Progress').length
    const pendingCount = initiatives.filter(i => ['To Do', 'Backlog', 'Not Started'].includes(i.status)).length

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

    // --- Row 2 Governance Logic ---
    const isCompleted = (status: string) => ['Done', 'Closed'].includes(status)
    const isToDo = (status: string) => ['To Do', 'Not Started', 'Backlog'].includes(status)

    const alerts = useMemo(() => {
        const now = new Date()

        const missingDates = initiatives.filter(i => !i.start_date || !i.due_date)
        const behindSchedule = initiatives.filter(i => {
            if (i.start_date && new Date(i.start_date) < now && isToDo(i.status)) return true
            if (i.due_date && new Date(i.due_date) < now && !isCompleted(i.status)) return true
            return false
        })
        const noChildren = initiatives.filter(i => i.children_count === 0)
        const closedOpenChildren = initiatives.filter(i => isCompleted(i.status) && i.open_children_count > 0)
        const statusInconsistency = initiatives.filter(i => {
            if (i.status === 'In Progress' && i.children_count > 0 && i.open_children_count === 0) return true
            if (isToDo(i.status) && i.children_count > 0 && i.children_count > i.open_children_count) return true
            return false
        })

        return {
            missingDates,
            behindSchedule,
            noChildren,
            closedOpenChildren,
            statusInconsistency
        }
    }, [initiatives])


    // --- Modals State ---
    const [modalData, setModalData] = useState<{ open: boolean, title: string, list: Initiative[], columns?: ColumnDef<Initiative>[] }>({
        open: false,
        title: '',
        list: []
    })

    const baseColumns: ColumnDef<Initiative>[] = [
        {
            header: 'Key', cell: (i) => (
                <a href={`https://jira.com/browse/${i.key}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">
                    {i.key}
                </a>
            )
        },
        { header: 'Summary', accessorKey: 'summary' },
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
        { header: 'Workstream', cell: (i) => <span className="text-slate-500 whitespace-nowrap">{i.workstream}</span> },
        { header: 'Created', cell: (i) => <span className="text-slate-500 whitespace-nowrap">{format(new Date(i.created_at), 'MMM dd, yyyy')}</span> },
    ]

    const childsColumn: ColumnDef<Initiative> = {
        header: 'Childs', cell: (i) => (
            <span className="text-slate-500">{i.children_count - i.open_children_count} / {i.children_count} closed</span>
        )
    }

    const categoryColumn: ColumnDef<Initiative> = {
        header: 'Investment Category', cell: (i) => (
            <span className="text-slate-600">{i.investment_category || 'Unassigned'}</span>
        )
    }


    const openModal = (title: string, list: Initiative[], cols: ColumnDef<Initiative>[]) => {
        setModalData({ open: true, title, list, columns: cols })
    }


    return (
        <section className="space-y-6 bg-[#39c4d0]/10 p-6 rounded-3xl border border-[#39c4d0]/20 mb-8">
            <div className="flex items-center gap-3">
                <Image src="/initiatives-icon.png" width={28} height={28} alt="Initiatives Icon" className="rounded-md" />
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Workstream Initiatives</h2>
            </div>

            {/* --- ROW 1: Metrics & Donut --- */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[200px] max-h-[200px]">

                {/* 1. Initiative Progress */}
                <div
                    onClick={() => openModal('All Initiatives', initiatives, [...baseColumns, childsColumn])}
                    className="col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all group flex flex-col"
                >
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">Initiative Progress</h3>
                    <div className="flex-1 flex flex-col justify-end">
                        <InitiativeStatusGauge data={gaugeData} total={createdCount} />
                    </div>
                </div>

                {/* 2. By Workstream */}
                <div
                    onClick={() => openModal('All Initiatives by Workstream', initiatives, [...baseColumns, childsColumn])}
                    className="col-span-1 bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all flex flex-col"
                >
                    <h3 className="text-sm font-semibold text-slate-700 mb-1">By Workstream</h3>
                    <div className="flex-1 min-h-0">
                        <WorkstreamBarChart
                            data={workstreamData}
                            onClickBar={(ws) => openModal(`Workstream: ${ws}`, initiatives.filter(i => i.workstream === ws), [...baseColumns, childsColumn])}
                        />
                    </div>
                </div>

                {/* 3. Investment Category */}
                <div className="col-span-1 relative group flex flex-col h-full rounded-xl bg-white border border-slate-200 shadow-sm p-4 hover:border-indigo-300 hover:shadow-md transition-all">
                    <div className="flex justify-between items-center mb-1 z-10 relative">
                        <h3 className="text-sm font-semibold text-slate-700">Investment Category</h3>
                        <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-rose-50 text-rose-600">
                            <TrendingUp className="w-3 h-3" />
                            +4.2% Unassigned vs last week
                        </div>
                    </div>

                    <div className="absolute inset-0 z-0 bg-transparent rounded-xl"
                        onClick={() => openModal('Investment Categories', initiatives, [...baseColumns, categoryColumn])}
                    ></div>
                    <div className="relative z-10 w-full h-full pointer-events-none">
                        <div className="pointer-events-auto h-full w-full">
                            <InvestmentCategoryDonut
                                data={invCategoryData}
                                total={createdCount}
                                trendPercentage={4.2}
                                onClickSlice={(name) => openModal(`Category: ${name}`, initiatives.filter(i => (i.investment_category || 'Unassigned') === name), [...baseColumns, categoryColumn])}
                            />
                        </div>
                    </div>
                </div>

            </div>

            {/* --- ROW 2: Governance Alerts --- */}
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {/* Alert 1 */}
                <AlertCard
                    title="Missing Critical Dates"
                    count={alerts.missingDates.length}
                    severity="Medium"
                    icon={<Calendar className="w-4 h-4" />}
                    onClick={() => openModal('Missing Critical Dates', alerts.missingDates, baseColumns)}
                />
                {/* Alert 2 */}
                <AlertCard
                    title="Behind Schedule"
                    count={alerts.behindSchedule.length}
                    severity="High"
                    icon={<Clock className="w-4 h-4" />}
                    onClick={() => openModal('Behind Schedule', alerts.behindSchedule, baseColumns)}
                />
                {/* Alert 3 */}
                <AlertCard
                    title="No Child Issues"
                    count={alerts.noChildren.length}
                    severity="High"
                    icon={<AlertOctagon className="w-4 h-4" />}
                    onClick={() => openModal('Without Child Issues', alerts.noChildren, [...baseColumns, childsColumn])}
                />
                {/* Alert 4 */}
                <AlertCard
                    title="Closed, Open Children"
                    count={alerts.closedOpenChildren.length}
                    severity="High"
                    icon={<AlertTriangle className="w-4 h-4" />}
                    onClick={() => openModal('Closed with Open Children', alerts.closedOpenChildren, [...baseColumns, childsColumn])}
                />
                {/* Alert 5 */}
                <AlertCard
                    title="Status Inconsistency"
                    count={alerts.statusInconsistency.length}
                    severity="Medium"
                    icon={<Waypoints className="w-4 h-4" />}
                    onClick={() => openModal('Status Inconsistency', alerts.statusInconsistency, [...baseColumns, childsColumn])}
                />
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


function AlertCard({ title, count, severity, icon, onClick }: { title: string, count: number, severity: 'High' | 'Medium', icon: React.ReactNode, onClick: () => void }) {
    const isHigh = severity === 'High'

    return (
        <div
            onClick={onClick}
            className={`w-full h-full min-h-[120px] flex flex-col justify-between bg-white p-4 rounded-xl border border-slate-200 cursor-pointer shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all group overflow-hidden relative`}
        >
            <div className="relative z-10">
                <div className="flex items-center gap-2 mb-3">
                    <div className={`w-7 h-7 flex items-center justify-center rounded-full ${isHigh ? 'bg-rose-50 text-rose-600' : 'bg-amber-50 text-amber-600'}`}>
                        {icon}
                    </div>
                    <span className="text-sm font-semibold text-slate-700 leading-tight pr-2">{title}</span>
                </div>
            </div>

            <div className="flex justify-between items-end relative z-10 pb-1">
                <div className="text-[44px] font-extrabold text-slate-800 leading-none tracking-tight">{count}</div>
                {count > 0 && (
                    <span className={`text-[10px] font-bold px-2 py-1 rounded-md mb-2 uppercase tracking-wide ${isHigh ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                        {severity}
                    </span>
                )}
            </div>

            {/* Faint accent background */}
            <div className={`absolute -bottom-2 -left-2 -right-2 h-1.5 opacity-60 ${isHigh ? 'bg-rose-400' : 'bg-amber-400'} group-hover:h-3 transition-all duration-300 pointer-events-none rounded-b-xl`}></div>
        </div>
    )
}
