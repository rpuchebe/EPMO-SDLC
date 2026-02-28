'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import { AlertTriangle, Calendar, Clock, Waypoints, Activity, AlertOctagon } from 'lucide-react'
import { InitiativeStatusGauge } from './charts/initiative-status-gauge'
import { WorkstreamBarChart } from './charts/workstream-bar-chart'
import { InvestmentCategoryDonut } from './charts/investment-category-donut'
import { AlertCard } from '@/components/ui/alert-card'
import type { BwiSectionDTO, BwiRow } from '@/lib/server/bwis'

interface BwisSectionProps {
    data?: BwiSectionDTO
}

export function BwisSection({ data }: BwisSectionProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Use global filters from URL if needed for display, otherwise filtering happens server-side
    const workstream = searchParams?.get('workstream') || 'All Workstreams'

    // fallback when loading or no data
    if (!data) return null

    const openPlaceholder = () => alert("Drill-down coming soon")

    // Charts Data
    const gaugeData = useMemo(() => [
        { name: 'Completed', value: data.done, color: '#10b981' },
        { name: 'In Progress', value: data.inProgress, color: '#fbbf24' },
        { name: 'Pending', value: data.pending, color: '#94a3b8' },
    ], [data])

    const total = data.totalBwis


    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col items-stretch">
            {/* Header / Filter Row */}
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
                <span className="ml-auto text-xs text-slate-400 font-medium">{data.totalBwis} business work items</span>
            </div>

            <div className="p-6 space-y-6">
                {/* ── A) Row 1: 3 Equal Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 h-[200px] max-h-[200px]">
                    <div onClick={openPlaceholder} className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex flex-col group">
                        <div className="flex items-center justify-between mb-1 relative z-10">
                            <h3 className="text-[12px] font-medium text-slate-600">BWI Progress</h3>
                        </div>
                        <div className="flex-1 relative z-10 flex flex-col justify-end">
                            {total > 0 ? (
                                <InitiativeStatusGauge data={gaugeData} total={total} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No active data</div>
                            )}
                        </div>
                    </div>

                    <div onClick={openPlaceholder} className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex flex-col group">
                        <div className="flex items-center justify-between mb-1 relative z-10">
                            <h3 className="text-[12px] font-medium text-slate-600">By Workstream</h3>
                        </div>
                        <div className="flex-1 min-h-0 relative z-10">
                            {data.byWorkstream.length > 0 ? (
                                <WorkstreamBarChart data={data.byWorkstream} onClickBar={openPlaceholder} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No active data</div>
                            )}
                        </div>
                    </div>

                    <div onClick={openPlaceholder} className="col-span-1 bg-white rounded-2xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex flex-col group">
                        <div className="flex items-center justify-between mb-1 relative z-10">
                            <h3 className="text-[12px] font-medium text-slate-600">Investment Category</h3>
                        </div>
                        <div className="flex-1 relative z-10 min-h-0">
                            {data.byInvestmentCategory.length > 0 ? (
                                <InvestmentCategoryDonut data={data.byInvestmentCategory} total={total} onClickSlice={openPlaceholder} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No active data</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── B) Row 2: Child distribution + Top at risk ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 h-[250px] max-h-[250px]">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col">
                        <div className="flex items-center justify-between mb-1">
                            <h3 className="text-[12px] font-medium text-slate-600">Child Issue Distribution</h3>
                        </div>
                        <div className="flex-1 min-h-0">
                            {data.childDistribution.length > 0 ? (
                                <InvestmentCategoryDonut
                                    data={data.childDistribution}
                                    total={data.childDistribution.reduce((sum, d) => sum + d.value, 0)}
                                    onClickSlice={openPlaceholder}
                                />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No child data</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 flex flex-col h-full overflow-hidden">
                        <div className="flex items-center justify-between mb-3 shrink-0">
                            <h3 className="text-[12px] font-medium text-slate-600 flex items-center gap-1.5">
                                <AlertTriangle className="w-3.5 h-3.5 text-rose-500" /> Top BWIs at Risk
                            </h3>
                        </div>
                        <div className="flex-1 overflow-auto pr-1 min-h-0">
                            {data.topAtRisk.length > 0 ? (
                                <table className="w-full text-left text-[11px] text-slate-600">
                                    <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 sticky top-0 bg-white">
                                        <tr>
                                            <th className="pb-2 font-semibold font-mono">Key</th>
                                            <th className="pb-2 font-semibold">Summary</th>
                                            <th className="pb-2 font-semibold text-center">Score</th>
                                            <th className="pb-2 font-semibold text-right">Due Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.topAtRisk.map(row => (
                                            <tr key={row.id} className="hover:bg-slate-50/50 group cursor-pointer transition-colors" onClick={openPlaceholder}>
                                                <td className="py-2 pr-2 font-mono text-indigo-600 font-medium truncate max-w-[80px]" title={row.key}>{row.key}</td>
                                                <td className="py-2 pr-2 font-medium text-slate-700 truncate max-w-[150px]" title={row.summary}>{row.summary}</td>
                                                <td className="py-2 px-2 text-center">
                                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${row.risk_score >= 4 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {row.risk_score}
                                                    </span>
                                                </td>
                                                <td className="py-2 pl-2 text-right tabular-nums whitespace-nowrap">
                                                    {row.due_date ? new Date(row.due_date).toLocaleDateString() : <span className="text-rose-400 text-[10px] font-bold">MISSING</span>}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No BWIs at risk🎉</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── C) Row 3: Action Items Array (Governance Alerts Grid) ── */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
                    <AlertCard
                        title="Missing Critical Dates"
                        count={data.alerts.missingDates.count}
                        severity={data.alerts.missingDates.severity as import('@/lib/server/initiatives').Severity}
                        icon={<Calendar className="w-3.5 h-3.5" />}
                        onClick={openPlaceholder}
                        weeklyTrend={null}
                        monthlyTrend={null}
                    />
                    <AlertCard
                        title="Behind Schedule"
                        count={data.alerts.behindSchedule.count}
                        severity={data.alerts.behindSchedule.severity as import('@/lib/server/initiatives').Severity}
                        icon={<Clock className="w-3.5 h-3.5" />}
                        onClick={openPlaceholder}
                        weeklyTrend={null}
                        monthlyTrend={null}
                    />
                    <AlertCard
                        title="No Child Issues"
                        count={data.alerts.noChildIssues.count}
                        severity={data.alerts.noChildIssues.severity as import('@/lib/server/initiatives').Severity}
                        icon={<AlertOctagon className="w-3.5 h-3.5" />}
                        onClick={openPlaceholder}
                        weeklyTrend={null}
                        monthlyTrend={null}
                    />
                    <AlertCard
                        title="Closed, Open Children"
                        count={data.alerts.closedOpenChildren.count}
                        severity={data.alerts.closedOpenChildren.severity as import('@/lib/server/initiatives').Severity}
                        icon={<AlertTriangle className="w-3.5 h-3.5" />}
                        onClick={openPlaceholder}
                        weeklyTrend={null}
                        monthlyTrend={null}
                    />
                    <AlertCard
                        title="Status Inconsistency"
                        count={data.alerts.statusInconsistency.count}
                        severity={data.alerts.statusInconsistency.severity as import('@/lib/server/initiatives').Severity}
                        icon={<Waypoints className="w-3.5 h-3.5" />}
                        onClick={openPlaceholder}
                        weeklyTrend={null}
                        monthlyTrend={null}
                    />
                </div>
            </div>
        </section>
    )
}
