'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { AlertTriangle, Calendar, Clock, Waypoints, Network, FileX, FileCheck, Minus, ExternalLink, TrendingUp, TrendingDown, Activity } from 'lucide-react'
import { InitiativeStatusGauge } from './charts/initiative-status-gauge'
import { WorkstreamBarChart } from './charts/workstream-bar-chart'
import { InvestmentCategoryDonut } from './charts/investment-category-donut'
import { IssueListModal, ColumnDef } from '@/components/shared/modals/issue-list-modal'
import { AlertCard } from '@/components/ui/alert-card'
import type { ProjectsDashboardData, ProjectRow } from '@/lib/server/projects'

type Severity = 'High' | 'Medium' | 'Low' | 'None'

// ─── Props ────────────────────────────────────────────────────────────────────

interface ProjectsSectionProps {
    data: ProjectsDashboardData
    workstream?: string
}

// ─── Section ──────────────────────────────────────────────────────────────────

export function ProjectsSection({ data, workstream }: ProjectsSectionProps) {
    const total = data.totalProjects
    const projects = data.raw || []

    // Re-calculate distributions from raw data for perfect reactivity with filters
    const gaugeData = useMemo(() => [
        { name: 'Completed', value: data.progress.completed, color: '#10b981' },
        { name: 'In Progress', value: data.progress.inProgress, color: '#fbbf24' },
        { name: 'Pending', value: data.progress.pending, color: '#94a3b8' },
    ], [data.progress])

    const WORKSTREAM_COLORS = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#3b82f6', '#f43f5e', '#06b6d4', '#84cc16', '#a855f7']
    const workstreamData = useMemo(() => {
        const counts: Record<string, number> = {}
        projects.forEach(p => {
            const ws = p.workstream || 'Unassigned'
            counts[ws] = (counts[ws] || 0) + 1
        })
        return Object.entries(counts)
            .map(([name, count], i) => ({ name, count, color: WORKSTREAM_COLORS[i % WORKSTREAM_COLORS.length] }))
            .sort((a, b) => b.count - a.count)
    }, [projects])

    const INV_CATEGORIES = [
        { name: 'Strategic Innovation', color: '#10b981' },
        { name: 'Scale & Reliability', color: '#3b82f6' },
        { name: 'Revenue-Commit', color: '#8b5cf6' },
        { name: 'Sales Activation', color: '#f59e0b' },
        { name: 'Support', color: '#f43f5e' },
        { name: 'Unassigned', color: '#94a3b8' }
    ]

    const invCategoryData = useMemo(() => {
        const counts: Record<string, number> = {}
        INV_CATEGORIES.forEach(c => counts[c.name] = 0)
        projects.forEach(p => {
            const cat = p.investment_category || 'Unassigned'
            if (counts[cat] !== undefined) counts[cat]++
            else counts['Unassigned']++
        })
        return INV_CATEGORIES.map(c => ({
            name: c.name,
            value: counts[c.name],
            color: c.color
        })).filter(c => c.value > 0)
    }, [projects])

    const childTotal = data.childDistribution.reduce((s, i) => s + i.value, 0)

    // --- Modals State ---
    const [modalData, setModalData] = useState<{ open: boolean, title: string, list: ProjectRow[], columns?: ColumnDef<ProjectRow>[] }>({
        open: false,
        title: '',
        list: []
    })

    const isCompleted = (status: string) => status === 'Done' || status === 'Done (Done)'

    const baseColumns: ColumnDef<ProjectRow>[] = [
        {
            header: 'Key', cell: (p) => (
                <a href={`https://prioritycommerce.atlassian.net/browse/${p.key}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-bold flex items-center gap-1.5 group">
                    {p.key}
                    <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                </a>
            )
        },
        {
            header: 'Summary',
            cell: (p) => <span className="font-medium text-slate-700 line-clamp-2">{p.summary}</span>
        },
        {
            header: 'Status', cell: (p) => (
                <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border
                    ${isCompleted(p.status) ? 'bg-emerald-50 text-emerald-700 border-emerald-200' :
                        p.status === 'In Progress' ? 'bg-indigo-50 text-indigo-700 border-indigo-200' :
                            'bg-slate-50 text-slate-700 border-slate-200'
                    }`}>
                    {p.status}
                </span>
            )
        },
        { header: 'Workstream', cell: (p) => <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-[11px] font-bold uppercase whitespace-nowrap">{p.workstream || 'N/A'}</span> },
        {
            header: 'Assignee',
            cell: (p) => <span className="text-slate-500 text-xs italic">{p.assignee || 'Unassigned'}</span>
        },
    ]

    const childrenColumn: ColumnDef<ProjectRow> = {
        header: 'Children',
        cell: (p) => (
            <div className="flex flex-col gap-1 min-w-[100px]">
                <div className="flex justify-between text-[10px] font-medium text-slate-500">
                    <span>{p.children_total > 0 ? Math.round((p.children_done / p.children_total) * 100) : 0}%</span>
                    <span>{p.children_done}/{p.children_total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div
                        className="bg-indigo-500 h-full transition-all duration-500"
                        style={{ width: `${p.children_total > 0 ? (p.children_done / p.children_total) * 100 : 0}%` }}
                    />
                </div>
            </div>
        )
    }

    const dateColumns: ColumnDef<ProjectRow>[] = [
        ...baseColumns.filter(c => c.header !== 'Assignee' && c.header !== 'Status' && c.header !== 'Workstream'),
        {
            header: 'Start Date',
            cell: (p) => (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${!p.start_date ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-slate-600'}`}>
                    {p.start_date ? new Date(p.start_date).toLocaleDateString() : 'MISSING'}
                </span>
            )
        },
        {
            header: 'Due Date',
            cell: (p) => (
                <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${!p.due_date ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-slate-600'}`}>
                    {p.due_date ? new Date(p.due_date).toLocaleDateString() : 'MISSING'}
                </span>
            )
        },
        {
            header: 'Status',
            cell: baseColumns.find(c => c.header === 'Status')?.cell || (() => null)
        }
    ]

    const behindScheduleColumns: ColumnDef<ProjectRow>[] = [
        ...baseColumns.filter(c => c.header !== 'Assignee' && c.header !== 'Workstream' && c.header !== 'Status'),
        {
            header: 'Start Date',
            cell: (p) => (
                <span className="text-[11px] font-medium px-2 py-0.5 rounded text-slate-600">
                    {p.start_date ? new Date(p.start_date).toLocaleDateString() : 'N/A'}
                </span>
            )
        },
        {
            header: 'Due Date',
            cell: (p) => {
                const isPastDue = p.due_date && new Date(p.due_date) < new Date() && !isCompleted(p.status)
                return (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded ${isPastDue ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-slate-600'}`}>
                        {p.due_date ? new Date(p.due_date).toLocaleDateString() : 'N/A'}
                        {isPastDue && ' (Past Due)'}
                    </span>
                )
            }
        },
        {
            header: 'Status',
            cell: baseColumns.find(c => c.header === 'Status')?.cell || (() => null)
        }
    ]

    const inconsistencyColumn: ColumnDef<ProjectRow> = {
        header: 'Reason',
        cell: (p) => {
            const reason = p.status_inconsistency_reason
            let display = ''

            if (reason?.rule === 'project_done_children_open') {
                display = `Project marked Done but has ${reason.children_open} open children`
            } else if (reason?.rule === 'project_in_progress_no_children') {
                display = 'Project In Progress but has no child work items'
            } else if (typeof reason === 'string' && reason) {
                display = reason
            } else {
                // Infer reason if flag is true but metadata is missing
                const isDone = isCompleted(p.status)
                if (isDone && p.children_total > 0 && (p.children_total - p.children_done) > 0) {
                    display = `Project closed with ${p.children_total - p.children_done} children still open`
                } else if (!isDone && p.status !== 'To Do' && p.children_total === 0) {
                    display = 'Project In Progress but missing child work items'
                } else {
                    display = 'Governance flag mismatch (Manual check)'
                }
            }

            return (
                <span className="text-amber-700 font-medium text-[11px] bg-amber-50 px-2 py-1 rounded-md border border-amber-100 shadow-sm leading-tight inline-block">
                    {display}
                </span>
            )
        }
    }

    const progressColumns = [...baseColumns.filter(c => c.header !== 'Assignee'), childrenColumn]

    const openModal = (title: string, list: ProjectRow[], cols?: ColumnDef<ProjectRow>[]) => {
        setModalData({ open: true, title, list, columns: cols })
    }

    // --- Trend badge (matching initiatives style) ---
    const trendBadge = data.trendUnassigned !== null ? (
        <div className={`flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium
            ${data.trendUnassigned > 0 ? 'bg-rose-50 text-rose-600' : data.trendUnassigned < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-500'}`}>
            {data.trendUnassigned > 0
                ? <TrendingUp className="w-3 h-3" />
                : data.trendUnassigned < 0
                    ? <TrendingDown className="w-3 h-3" />
                    : <Minus className="w-3 h-3" />}
            {data.trendUnassigned > 0 ? '+' : ''}{data.trendUnassigned.toFixed(1)}% Unassigned
        </div>
    ) : (
        <div className="flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded-full font-medium bg-slate-50 text-slate-400 border border-slate-100/50">
            <Activity className="w-2.5 h-2.5 opacity-50" />
            <span>Trend pending</span>
        </div>
    )

    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6">

            {/* ── Section header ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                <div className="w-[3px] h-5 rounded-full bg-[#8b5cf6] flex-shrink-0" />
                <Image src="/projects-icon.png" width={20} height={20} alt="Projects Icon" className="rounded-md" />
                <div className="flex flex-col">
                    <h2 className="text-sm font-semibold text-slate-800">Projects</h2>
                    {workstream && workstream !== 'All Workstreams' && (
                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider -mt-0.5">
                            Filter: {workstream}
                        </span>
                    )}
                </div>
                <span className="ml-auto text-xs text-slate-400 font-medium">{total} projects</span>
            </div>

            {/* ── No data state ── */}
            {!data.hasData ? (
                <div className="p-10 flex flex-col items-center justify-center gap-3 text-slate-400">
                    <div className="w-10 h-10 bg-slate-50 rounded-full flex items-center justify-center">
                        <Minus className="w-5 h-5" />
                    </div>
                    <p className="text-sm font-medium text-slate-500">No snapshot for today yet.</p>
                    <p className="text-xs text-slate-300">Data appears once the daily sync completes.</p>
                </div>
            ) : (
                <div className="p-6 space-y-6">

                    {/* ── Row 1: Progress · Workstream · Investment Category ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 h-[200px] max-h-[200px]">

                        {/* 1. Project Progress */}
                        <div
                            onClick={() => openModal('All Projects', projects, progressColumns)}
                            className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group flex flex-col"
                        >
                            <h3 className="text-[12px] font-medium text-slate-600 mb-1">Project Progress</h3>
                            <div className="flex-1 flex flex-col justify-end">
                                <InitiativeStatusGauge data={gaugeData} total={total} />
                            </div>
                        </div>

                        {/* 2. By Workstream */}
                        <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex flex-col">
                            <h3 className="text-[12px] font-medium text-slate-600 mb-1">By Workstream</h3>
                            <div className="flex-1 min-h-0">
                                <WorkstreamBarChart
                                    data={workstreamData}
                                    onClickBar={(ws) => openModal(`Workstream: ${ws}`, projects.filter(p => (p.workstream || 'Unassigned').trim().toLowerCase() === ws.trim().toLowerCase()), progressColumns)}
                                />
                            </div>
                        </div>

                        {/* 3. Investment Category */}
                        <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col group h-full transition-all hover:border-slate-300 hover:shadow-md">
                            <div
                                className="flex justify-between items-center mb-1 cursor-pointer hover:opacity-80 group/title transition-all"
                                onClick={() => openModal('Investment Categories', projects, progressColumns)}
                            >
                                <h3 className="text-[12px] font-medium text-slate-600 underline underline-offset-4 decoration-slate-200 group-hover/title:decoration-slate-400">Investment Category</h3>
                                {trendBadge}
                            </div>
                            <div className="flex-1 min-h-0">
                                <InvestmentCategoryDonut
                                    data={data.byInvestmentCategory}
                                    total={total}
                                    trendPercentage={data.trendUnassigned ?? 0}
                                    onClickSlice={(name) => {
                                        const filtered = projects.filter(p => {
                                            const pCat = (p.investment_category || 'Unassigned').trim().toLowerCase();
                                            const targetCat = name.trim().toLowerCase();
                                            return pCat === targetCat;
                                        });
                                        openModal(`Category: ${name}`, filtered, progressColumns);
                                    }}
                                />
                            </div>
                        </div>
                    </div>

                    {/* ── Row 2: Child Distribution · Missing Parents · Missing Children ── */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[200px] max-h-[200px]">

                        {/* 4. Child Issue Type Distribution */}
                        <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
                            <h3 className="text-[12px] font-medium text-slate-600 mb-1">Child Issue Types</h3>
                            <div className="flex-1 min-h-0">
                                {childTotal > 0 ? (
                                    <InvestmentCategoryDonut
                                        data={data.childDistribution}
                                        total={childTotal}
                                        onClickSlice={() => { }}
                                    />
                                ) : (
                                    <div className="h-full flex items-center justify-center">
                                        <span className="text-xs text-slate-400">No child issues recorded</span>
                                    </div>
                                )}
                            </div>
                        </div>

                        {/* 5. Missing Parent */}
                        <StatCard
                            title="Missing Parent"
                            subtitle="Projects with no parent initiative"
                            count={data.cards.missingParents}
                            total={total}
                            icon={<Network className="w-3.5 h-3.5" />}
                            iconClass="bg-rose-50 text-rose-600"
                            accentColor="#f43f5e"
                            weeklyTrend={data.cardTrends.missingParents.weekly}
                            monthlyTrend={data.cardTrends.missingParents.monthly}
                            progressPercent={total > 0 ? Math.round(((total - data.cards.missingParents) / total) * 100) : 0}
                            progressColor="#10b981"
                            onClick={() => openModal('Missing Parent Attribution', projects.filter(p => !p.parent_issue_key), progressColumns)}
                        />

                        {/* 6. No Child BWIs */}
                        <StatCard
                            title="No Child BWIs"
                            subtitle="Projects without child work items"
                            count={data.cards.missingChildren}
                            total={total}
                            icon={<FileX className="w-3.5 h-3.5" />}
                            iconClass="bg-rose-50 text-rose-600"
                            accentColor="#f43f5e"
                            weeklyTrend={data.cardTrends.missingChildren.weekly}
                            monthlyTrend={data.cardTrends.missingChildren.monthly}
                            progressPercent={total > 0 ? Math.round(((total - data.cards.missingChildren) / total) * 100) : 0}
                            progressColor="#10b981"
                            onClick={() => openModal('Projects Missing Child BWIs', projects.filter(p => p.no_child_issues_flag), progressColumns)}
                        />
                    </div>

                    {/* ── Row 3: Governance Alert Cards ── */}
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        <AlertCard
                            title="Missing Critical Dates"
                            count={data.alerts.missingCriticalDates.count}
                            severity={data.alerts.missingCriticalDates.severity}
                            weeklyTrend={data.alertTrends.missingCriticalDates.weekly}
                            monthlyTrend={data.alertTrends.missingCriticalDates.monthly}
                            icon={<Calendar className="w-3.5 h-3.5" />}
                            onClick={() => openModal('Missing Critical Dates', projects.filter(p => p.missing_critical_dates_flag), dateColumns)}
                        />
                        <AlertCard
                            title="Behind Schedule"
                            count={data.alerts.behindSchedule.count}
                            severity={data.alerts.behindSchedule.severity}
                            weeklyTrend={data.alertTrends.behindSchedule.weekly}
                            monthlyTrend={data.alertTrends.behindSchedule.monthly}
                            icon={<Clock className="w-3.5 h-3.5" />}
                            onClick={() => openModal('Behind Schedule', projects.filter(p => p.behind_schedule_flag), behindScheduleColumns)}
                        />
                        <AlertCard
                            title="Closed, Open Children"
                            count={data.alerts.closedOpenChildren.count}
                            severity={data.alerts.closedOpenChildren.severity}
                            weeklyTrend={data.alertTrends.closedOpenChildren.weekly}
                            monthlyTrend={data.alertTrends.closedOpenChildren.monthly}
                            icon={<AlertTriangle className="w-3.5 h-3.5" />}
                            onClick={() => openModal('Closed with Open Children', projects.filter(p => p.closed_open_children_flag), progressColumns)}
                        />
                        <AlertCard
                            title="Status Inconsistency"
                            count={data.alerts.statusInconsistency.count}
                            severity={data.alerts.statusInconsistency.severity}
                            weeklyTrend={data.alertTrends.statusInconsistency.weekly}
                            monthlyTrend={data.alertTrends.statusInconsistency.monthly}
                            icon={<Waypoints className="w-3.5 h-3.5" />}
                            onClick={() => openModal('Status Inconsistency', projects.filter(p => p.status_inconsistency_flag), [...baseColumns.filter(c => c.header !== 'Assignee'), inconsistencyColumn])}
                        />
                    </div>

                </div>
            )}

            <IssueListModal
                key={modalData.title}
                open={modalData.open}
                onOpenChange={(op) => setModalData(prev => ({ ...prev, open: op }))}
                title={modalData.title}
                data={modalData.list}
                columns={modalData.columns || baseColumns}
            />
        </section>
    )
}

// ─── StatCard ─────────────────────────────────────────────────────────────────

function StatCard({ title, subtitle, count, total, icon, iconClass, accentColor, onClick, weeklyTrend, monthlyTrend, progressPercent, progressColor }: {
    title: string
    subtitle: string
    count: number
    total: number
    icon: React.ReactNode
    iconClass: string
    accentColor: string
    onClick?: () => void
    weeklyTrend: number | null
    monthlyTrend: number | null
    progressPercent?: number
    progressColor?: string
}) {
    const pct = progressPercent !== undefined ? progressPercent : (total > 0 ? Math.round((count / total) * 100) : 0)
    const barColor = progressColor || accentColor

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between h-full cursor-pointer hover:border-slate-300 hover:shadow-md transition-all group"
        >
            {/* Title Row */}
            <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-1.5">
                    <div className={`w-[22px] h-[22px] flex-shrink-0 flex items-center justify-center rounded-lg ${iconClass}`}>
                        {icon}
                    </div>
                    <span className="text-[12px] font-medium text-slate-600 truncate">{title}</span>
                </div>

                {weeklyTrend !== null && (
                    <div className={`text-[10px] font-bold flex items-center gap-0.5 ${weeklyTrend > 0 ? 'text-rose-500' : weeklyTrend < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                        {weeklyTrend > 0 ? '↑' : weeklyTrend < 0 ? '↓' : '•'}
                        {Math.abs(Math.round(weeklyTrend))}%
                    </div>
                )}
            </div>

            {/* Count */}
            <div className="text-[32px] leading-none font-bold text-slate-800 tracking-tight">
                {count}
            </div>

            {/* Subtitle */}
            <p className="text-[10px] text-slate-400 leading-tight">{subtitle}</p>

            {/* Divider */}
            <div className="w-full h-px bg-slate-100" />

            {/* Progress bar + label */}
            <div className="flex flex-col gap-1">
                <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, pct)}%`, backgroundColor: barColor }}
                    />
                </div>
                <div className="flex items-center justify-between">
                    <span className="text-[10px] text-slate-400">of {total} projects</span>
                    <span className="text-[10px] font-bold tabular-nums" style={{ color: barColor }}>
                        {progressPercent !== undefined ? `${pct}% Completed` : `${pct}%`}
                    </span>
                </div>
            </div>
        </div>
    )
}
