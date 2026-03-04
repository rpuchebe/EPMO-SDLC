'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useSearchParams } from 'next/navigation'
import {
    AlertTriangle, Calendar, Clock, Waypoints,
    AlertOctagon, HelpCircle, ExternalLink,
} from 'lucide-react'
import { InitiativeStatusGauge } from './charts/initiative-status-gauge'
import { WorkstreamBarChart } from './charts/workstream-bar-chart'
import { InvestmentCategoryDonut } from './charts/investment-category-donut'
import { AlertCard } from '@/components/ui/alert-card'
import { IssueListModal, ColumnDef } from '@/components/shared/modals/issue-list-modal'
import type { BwiSectionDTO, BwiRow } from '@/lib/server/bwis'

// ─── Types ────────────────────────────────────────────────────────────────────

interface BwisSectionProps {
    data?: BwiSectionDTO
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const JIRA_BASE = 'https://prioritycommerce.atlassian.net/browse'

function fmtDate(d: string | null) {
    if (!d) return null
    return new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' })
}

function StatusChip({ status }: { status: string }) {
    const s = status?.toLowerCase() ?? ''
    const cls = s.includes('done') || s.includes('closed')
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : s.includes('progress') || s.includes('review')
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-slate-50 text-slate-600 border-slate-200'
    return (
        <span className={`px-2 py-0.5 rounded-full text-xs font-medium whitespace-nowrap border ${cls}`}>
            {status || '—'}
        </span>
    )
}

// ─── Column definitions ───────────────────────────────────────────────────────

// Base: Key + Summary + Status + Workstream
const colKey: ColumnDef<BwiRow> = {
    header: 'Key',
    cell: (r) => (
        <a
            href={`${JIRA_BASE}/${r.key}`}
            target="_blank"
            rel="noreferrer"
            className="text-indigo-600 hover:underline font-bold flex items-center gap-1.5 group font-mono"
        >
            {r.key}
            <ExternalLink className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
        </a>
    ),
}

const colSummary: ColumnDef<BwiRow> = {
    header: 'Summary',
    cell: (r) => <span className="font-medium text-slate-700 line-clamp-2">{r.summary}</span>,
}

const colStatus: ColumnDef<BwiRow> = {
    header: 'Status',
    cell: (r) => <StatusChip status={r.status} />,
}

const colWorkstream: ColumnDef<BwiRow> = {
    header: 'Workstream',
    cell: (r) => (
        <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded text-xs font-bold uppercase whitespace-nowrap">
            {r.workstream || 'N/A'}
        </span>
    ),
}

const colInvestment: ColumnDef<BwiRow> = {
    header: 'Investment Category',
    cell: (r) => (
        <span className="text-slate-500 text-xs">{r.investment_category || '—'}</span>
    ),
}

const colChildren: ColumnDef<BwiRow> = {
    header: 'Children',
    cell: (r) => {
        const pct = r.children_total > 0 ? Math.round((r.children_total - r.open_children_count) / r.children_total * 100) : 0
        const done = r.children_total - r.open_children_count
        return (
            <div className="flex flex-col gap-1 min-w-[90px]">
                <div className="flex justify-between text-[10px] font-medium text-slate-500">
                    <span>{pct}%</span>
                    <span>{done}/{r.children_total}</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1 overflow-hidden">
                    <div className="bg-indigo-500 h-full" style={{ width: `${pct}%` }} />
                </div>
            </div>
        )
    },
}

const colOpenChildren: ColumnDef<BwiRow> = {
    header: 'Open Children',
    cell: (r) => (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-md ${r.open_children_count > 0 ? 'bg-amber-50 text-amber-700 border border-amber-100' : 'text-slate-400'}`}>
            {r.open_children_count}
        </span>
    ),
}

const colDueDate: ColumnDef<BwiRow> = {
    header: 'Due Date',
    cell: (r) => {
        const formatted = fmtDate(r.due_date)
        return (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${!formatted ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-slate-600'}`}>
                {formatted ?? 'MISSING'}
            </span>
        )
    },
}

const colStartDate: ColumnDef<BwiRow> = {
    header: 'Start Date',
    cell: (r) => {
        const formatted = fmtDate(r.start_date)
        return (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${!formatted ? 'bg-rose-50 text-rose-600 border border-rose-100' : 'text-slate-600'}`}>
                {formatted ?? 'MISSING'}
            </span>
        )
    },
}

const colDueDateBehind: ColumnDef<BwiRow> = {
    header: 'Due Date',
    cell: (r) => {
        const isPast = r.due_date && new Date(r.due_date) < new Date() && r.status_category !== 'Done'
        const formatted = fmtDate(r.due_date)
        return (
            <span className={`text-xs font-medium px-2 py-0.5 rounded ${isPast ? 'bg-orange-50 text-orange-600 border border-orange-100' : 'text-slate-600'}`}>
                {formatted ?? 'N/A'}{isPast ? ' ⚠' : ''}
            </span>
        )
    },
}

const colRiskScore: ColumnDef<BwiRow> = {
    header: 'Risk',
    cell: (r) => (
        <span className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-[10px] font-bold ${r.risk_score >= 4 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
            {r.risk_score}
        </span>
    ),
}

const colInconsistencyReason: ColumnDef<BwiRow> = {
    header: 'Inconsistency',
    cell: (r) => {
        let reason = ''
        if (r.closed_open_children_flag && r.status_category === 'Done' && r.open_children_count > 0) {
            reason = `Closed but has ${r.open_children_count} open child${r.open_children_count > 1 ? 'ren' : ''}`
        } else if (r.status_category === 'To Do' && r.children_total > 0 && r.open_children_count < r.children_total) {
            reason = 'To Do but children are progressing'
        } else {
            reason = 'Status / children mismatch'
        }
        return (
            <span className="text-amber-700 font-medium text-xs bg-amber-50 px-2 py-1 rounded-md border border-amber-100 leading-tight inline-block">
                {reason}
            </span>
        )
    },
}

// ─── Column sets per drill-down ───────────────────────────────────────────────

const COL_PROGRESS: ColumnDef<BwiRow>[] = [colKey, colSummary, colStatus, colWorkstream, colChildren, colDueDate]
const COL_DATES: ColumnDef<BwiRow>[] = [colKey, colSummary, colStartDate, colDueDate, colStatus, colWorkstream]
const COL_BEHIND: ColumnDef<BwiRow>[] = [colKey, colSummary, colStatus, colStartDate, colDueDateBehind, colWorkstream]
const COL_NO_CHILDREN: ColumnDef<BwiRow>[] = [colKey, colSummary, colStatus, colWorkstream, colInvestment, colDueDate]
const COL_CLOSED_OPEN: ColumnDef<BwiRow>[] = [colKey, colSummary, colStatus, colWorkstream, colOpenChildren, colChildren, colDueDate]
const COL_INCONSISTENCY: ColumnDef<BwiRow>[] = [colKey, colSummary, colStatus, colWorkstream, colInconsistencyReason, colChildren]
const COL_AT_RISK: ColumnDef<BwiRow>[] = [colKey, colSummary, colStatus, colWorkstream, colRiskScore, colOpenChildren, colDueDateBehind]
const COL_WORKSTREAM: ColumnDef<BwiRow>[] = [colKey, colSummary, colStatus, colInvestment, colChildren, colDueDate]
const COL_INVESTMENT: ColumnDef<BwiRow>[] = [colKey, colSummary, colStatus, colWorkstream, colChildren, colDueDate]

// ─── Main component ───────────────────────────────────────────────────────────

export function BwisSection({ data }: BwisSectionProps) {
    const searchParams = useSearchParams()
    const workstream = searchParams?.get('workstream') || 'All Workstreams'

    const [modalKey, setModalKey] = useState(0)
    const [modal, setModal] = useState<{
        open: boolean
        title: string
        list: BwiRow[]
        columns: ColumnDef<BwiRow>[]
    }>({ open: false, title: '', list: [], columns: COL_PROGRESS })

    // Always derive from raw so rows 2 & 3 stay in sync with the active filter
    const raw = data?.raw ?? []

    const topAtRisk = useMemo(() =>
        [...raw]
            .filter(r => r.risk_score > 0)
            .sort((a, b) => {
                if (b.risk_score !== a.risk_score) return b.risk_score - a.risk_score
                if (!a.due_date && b.due_date) return 1
                if (a.due_date && !b.due_date) return -1
                if (a.due_date && b.due_date) return a.due_date.localeCompare(b.due_date)
                return 0
            })
            .slice(0, 10),
        [raw],
    )

    const alerts = useMemo(() => {
        const tBwis = raw.length
        const sev = (n: number): string =>
            n > tBwis * 0.1 ? 'High' : n > tBwis * 0.05 ? 'Medium' : n > 0 ? 'Low' : 'None'
        const missingDates = raw.filter(r => r.missing_dates_flag).length
        const behindSchedule = raw.filter(r => r.behind_schedule_flag).length
        const noChildIssues = raw.filter(r => r.no_child_issues_flag).length
        const closedOpenChildren = raw.filter(r => r.closed_open_children_flag).length
        const statusInconsistency = raw.filter(r => r.status_inconsistency_flag).length
        return {
            missingDates: { count: missingDates, severity: sev(missingDates) },
            behindSchedule: { count: behindSchedule, severity: sev(behindSchedule) },
            noChildIssues: { count: noChildIssues, severity: sev(noChildIssues) },
            closedOpenChildren: { count: closedOpenChildren, severity: sev(closedOpenChildren) },
            statusInconsistency: { count: statusInconsistency, severity: sev(statusInconsistency) },
        }
    }, [raw])

    if (!data) return null

    // Use raw.length as the source of truth so the count always matches the rendered data
    const total = raw.length

    function openModal(title: string, list: BwiRow[], columns: ColumnDef<BwiRow>[]) {
        // Increment key to force IssueListModal to remount with fresh filter state
        setModalKey(k => k + 1)
        setModal({ open: true, title, list, columns })
    }

    // Chart data
    const gaugeData = [
        { name: 'Completed', value: data.done, color: '#10b981' },
        { name: 'In Progress', value: data.inProgress, color: '#fbbf24' },
        { name: 'Pending', value: data.pending, color: '#94a3b8' },
    ]

    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col items-stretch">

            {/* ── Section header ── */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                <div className="w-[3px] h-5 rounded-full bg-[#3b82f6] flex-shrink-0" />
                <Image src="/bwi-icon.png" width={20} height={20} alt="BWI Icon" className="rounded-md" />
                <div className="flex flex-col">
                    <h2 className="text-sm font-semibold text-slate-800">Business Work Items</h2>
                    {workstream && workstream !== 'All Workstreams' && (
                        <span className="text-[10px] text-indigo-600 font-bold uppercase tracking-wider -mt-0.5">
                            Filter: {workstream}
                        </span>
                    )}
                </div>
                <span className="ml-auto text-xs text-slate-400 font-medium">{total} business work items</span>
            </div>

            <div className="p-6 space-y-6">

                {/* ── Row 1: Progress · Workstream · Investment Category ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[200px] max-h-[200px]">

                    {/* BWI Progress gauge */}
                    <div
                        onClick={() => openModal('All Business Work Items', raw, COL_PROGRESS)}
                        className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex flex-col group"
                    >
                        <h3 className="text-xs font-medium text-slate-600 mb-1">BWI Progress</h3>
                        <div className="flex-1 relative z-10 flex flex-col justify-end">
                            {total > 0 ? (
                                <InitiativeStatusGauge data={gaugeData} total={total} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No active data</div>
                            )}
                        </div>
                    </div>

                    {/* By Workstream */}
                    <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex flex-col group">
                        <h3 className="text-xs font-medium text-slate-600 mb-1">By Workstream</h3>
                        <div className="flex-1 min-h-0 relative z-10">
                            {data.byWorkstream.length > 0 ? (
                                <WorkstreamBarChart
                                    data={data.byWorkstream}
                                    onClickBar={(ws) =>
                                        openModal(
                                            `Workstream: ${ws}`,
                                            raw.filter(r => (r.workstream || 'Unassigned').trim().toLowerCase() === ws.trim().toLowerCase()),
                                            COL_WORKSTREAM,
                                        )
                                    }
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No active data</div>
                            )}
                        </div>
                    </div>

                    {/* Investment Category */}
                    <div className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex flex-col group">
                        <h3 className="text-xs font-medium text-slate-600 mb-1">Investment Category</h3>
                        <div className="flex-1 relative z-10 min-h-0">
                            {data.byInvestmentCategory.length > 0 ? (
                                <InvestmentCategoryDonut
                                    data={data.byInvestmentCategory}
                                    total={total}
                                    onClickSlice={(name) =>
                                        openModal(
                                            `Category: ${name}`,
                                            raw.filter(r => (r.investment_category || 'Unassigned').trim().toLowerCase() === name.trim().toLowerCase()),
                                            COL_INVESTMENT,
                                        )
                                    }
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No active data</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Row 2: Child distribution + Top at risk ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[270px] max-h-[270px]">

                    {/* Child Issue Distribution */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full overflow-hidden">
                        <h3 className="text-xs font-medium text-slate-600 mb-1">Child Issue Distribution</h3>
                        <div className="flex-1 min-h-0 overflow-auto">
                            {data.childDistribution.length > 0 ? (
                                <InvestmentCategoryDonut
                                    data={data.childDistribution}
                                    total={data.childDistribution.reduce((s, d) => s + d.value, 0)}
                                    onClickSlice={() => { }}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No child data</div>
                            )}
                        </div>
                    </div>

                    {/* Top BWIs at Risk */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full relative overflow-hidden">
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <div className="flex items-center gap-1.5">
                                <h3 className="text-xs font-medium text-slate-600 flex items-center gap-1.5">
                                    <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Top BWIs at Risk
                                </h3>
                                {/* Score tooltip */}
                                <div className="group relative flex items-center">
                                    <HelpCircle className="w-3.5 h-3.5 text-slate-300 cursor-help hover:text-slate-500 transition-colors" />
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full mt-2 w-64 p-3 bg-slate-900/95 backdrop-blur-sm text-white text-[10px] rounded-xl shadow-2xl opacity-0 group-hover:opacity-100 transition-all duration-200 z-[100] pointer-events-none leading-relaxed border border-white/10 -translate-y-2 group-hover:translate-y-0">
                                        <p className="font-bold mb-1.5 border-b border-white/10 pb-1 text-cyan-400">How is the Score calculated?</p>
                                        <ul className="grid grid-cols-1 gap-1.5">
                                            <li className="flex items-start gap-1.5"><span className="text-rose-400 font-bold shrink-0">+3</span><span>Overdue and not completed</span></li>
                                            <li className="flex items-start gap-1.5"><span className="text-amber-400 font-bold shrink-0">+2</span><span>Past start date and in To Do</span></li>
                                            <li className="flex items-start gap-1.5"><span className="text-slate-400 font-bold shrink-0">+2</span><span>Missing critical dates</span></li>
                                            <li className="flex items-start gap-1.5"><span className="text-slate-400 font-bold shrink-0">+2</span><span>Closed with open children</span></li>
                                            <li className="flex items-start gap-1.5"><span className="text-slate-400 font-bold shrink-0">+2</span><span>Status inconsistency</span></li>
                                            <li className="flex items-start gap-1.5"><span className="text-slate-400 font-bold shrink-0">+1</span><span>No child issues</span></li>
                                            <li className="flex items-start gap-1.5"><span className="text-cyan-400 font-bold shrink-0">+1</span><span>Per 2 open children (max 5)</span></li>
                                        </ul>
                                        <div className="absolute bottom-full left-1/2 -translate-x-1/2 w-0 h-0 border-l-[6px] border-l-transparent border-r-[6px] border-r-transparent border-b-[6px] border-b-slate-900/95" />
                                    </div>
                                </div>
                            </div>
                            {/* "View all" button */}
                            {raw.filter(r => r.risk_score > 0).length > 10 && (
                                <button
                                    onClick={() => openModal('All BWIs at Risk', [...raw].filter(r => r.risk_score > 0).sort((a, b) => b.risk_score - a.risk_score), COL_AT_RISK)}
                                    className="text-[10px] font-semibold text-indigo-500 hover:text-indigo-700 transition-colors"
                                >
                                    View all →
                                </button>
                            )}
                        </div>

                        <div className="flex-1 overflow-auto pr-1 min-h-0">
                            {topAtRisk.length > 0 ? (
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 sticky top-0 bg-white">
                                        <tr>
                                            <th className="pb-2 font-semibold font-mono">Key</th>
                                            <th className="pb-2 font-semibold">Summary</th>
                                            <th className="pb-2 font-semibold text-center">Score</th>
                                            <th className="pb-2 font-semibold text-right">Due Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {topAtRisk.map(row => (
                                            <tr
                                                key={row.id}
                                                className="hover:bg-slate-50/50 group cursor-pointer transition-colors"
                                                onClick={() => openModal(`BWI: ${row.key}`, [row], COL_AT_RISK)}
                                            >
                                                <td className="py-2 pr-2 font-mono text-indigo-600 font-medium truncate max-w-[80px]" title={row.key}>
                                                    {row.key}
                                                </td>
                                                <td className="py-2 pr-2 font-medium text-slate-700 truncate max-w-[150px]" title={row.summary}>
                                                    {row.summary}
                                                </td>
                                                <td className="py-2 px-2 text-center">
                                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${row.risk_score >= 4 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {row.risk_score}
                                                    </span>
                                                </td>
                                                <td className="py-2 pl-2 text-right tabular-nums whitespace-nowrap">
                                                    {row.due_date
                                                        ? <span className={new Date(row.due_date) < new Date() && row.status_category !== 'Done' ? 'text-orange-600 font-semibold' : 'text-slate-500'}>
                                                            {fmtDate(row.due_date)}
                                                        </span>
                                                        : <span className="text-rose-400 text-[10px] font-bold">MISSING</span>
                                                    }
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No BWIs at risk 🎉</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── Row 3: Governance Alert Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <AlertCard
                        title="Missing Critical Dates"
                        count={data.alerts.missingDates.count}
                        severity={data.alerts.missingDates.severity as any}
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        weeklyTrend={null}
                        monthlyTrend={null}
                        onClick={() => openModal(
                            'Missing Critical Dates',
                            raw.filter(r => r.missing_dates_flag),
                            COL_DATES,
                        )}
                    />
                    <AlertCard
                        title="Behind Schedule"
                        count={data.alerts.behindSchedule.count}
                        severity={data.alerts.behindSchedule.severity as any}
                        icon={<Clock className="w-3.5 h-3.5" />}
                        weeklyTrend={null}
                        monthlyTrend={null}
                        onClick={() => openModal(
                            'Behind Schedule',
                            raw.filter(r => r.behind_schedule_flag),
                            COL_BEHIND,
                        )}
                    />
                    <AlertCard
                        title="No Child Issues"
                        count={data.alerts.noChildIssues.count}
                        severity={data.alerts.noChildIssues.severity as any}
                        icon={<AlertOctagon className="w-3.5 h-3.5" />}
                        weeklyTrend={null}
                        monthlyTrend={null}
                        onClick={() => openModal(
                            'BWIs Without Child Issues',
                            raw.filter(r => r.no_child_issues_flag),
                            COL_NO_CHILDREN,
                        )}
                    />
                    <AlertCard
                        title="Closed, Open Children"
                        count={data.alerts.closedOpenChildren.count}
                        severity={data.alerts.closedOpenChildren.severity as any}
                        icon={<AlertTriangle className="w-3.5 h-3.5" />}
                        weeklyTrend={null}
                        monthlyTrend={null}
                        onClick={() => openModal(
                            'Closed BWIs with Open Children',
                            raw.filter(r => r.closed_open_children_flag),
                            COL_CLOSED_OPEN,
                        )}
                    />
                    <AlertCard
                        title="Status Inconsistency"
                        count={data.alerts.statusInconsistency.count}
                        severity={data.alerts.statusInconsistency.severity as any}
                        icon={<Waypoints className="w-3.5 h-3.5" />}
                        weeklyTrend={null}
                        monthlyTrend={null}
                        onClick={() => openModal(
                            'Status Inconsistency',
                            raw.filter(r => r.status_inconsistency_flag),
                            COL_INCONSISTENCY,
                        )}
                    />
                </div>
            </div>

            {/* ── Modal ── */}
            <IssueListModal
                key={modalKey}
                open={modal.open}
                onOpenChange={(open) => setModal(prev => ({ ...prev, open }))}
                title={modal.title}
                data={modal.list}
                columns={modal.columns}
            />
        </section>
    )
}
