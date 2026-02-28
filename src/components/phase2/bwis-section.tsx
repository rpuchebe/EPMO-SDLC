'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import {
    AlertTriangle,
    Calendar,
    Clock,
    Search,
    Filter,
    Activity,
    FolderCheck,
    AlertCircle,
    Info
} from 'lucide-react'
import { InitiativeStatusGauge } from './charts/initiative-status-gauge'
import { WorkstreamBarChart } from './charts/workstream-bar-chart'
import { InvestmentCategoryDonut } from './charts/investment-category-donut'
import type { BwiSectionDTO, BwiRow } from '@/lib/server/bwis'

interface BwisSectionProps {
    data?: BwiSectionDTO
}

export function BwisSection({ data }: BwisSectionProps) {
    const router = useRouter()
    const pathname = usePathname()
    const searchParams = useSearchParams()

    // Local filters to update URL
    const workstream = searchParams?.get('workstream') || 'All Workstreams'
    const bwiDateWindow = searchParams?.get('bwiDateWindow') || 'all'
    const bwiHideClosed = searchParams?.get('bwiHideClosed') === 'true'
    const bwiSearch = searchParams?.get('bwiSearch') || ''

    // fallback when loading or no data
    if (!data) return null

    // Handlers
    const updateUrlParams = (key: string, value: string | null) => {
        const params = new URLSearchParams(searchParams?.toString() || '')
        if (value) params.set(key, value)
        else params.delete(key)
        router.push(`${pathname}?${params.toString()}`, { scroll: false })
    }

    const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => updateUrlParams('bwiSearch', e.target.value)
    const handleWorkstreamChange = (e: React.ChangeEvent<HTMLSelectElement>) => updateUrlParams('workstream', e.target.value === 'All Workstreams' ? null : e.target.value)
    const handleDateChange = (e: React.ChangeEvent<HTMLSelectElement>) => updateUrlParams('bwiDateWindow', e.target.value)
    const toggleHideClosed = () => updateUrlParams('bwiHideClosed', bwiHideClosed ? null : 'true')

    const openPlaceholder = () => alert("Drill-down coming soon")

    // Charts Data
    const gaugeData = useMemo(() => [
        { name: 'Completed', value: data.done, color: '#10b981' },
        { name: 'In Progress', value: data.inProgress, color: '#fbbf24' },
        { name: 'Pending', value: data.pending, color: '#94a3b8' },
    ], [data])

    const total = data.totalBwis

    // Action items
    const ActionItem = ({ label, count, severity, tooltip }: any) => {
        const severityColors = {
            High: 'bg-rose-100 text-rose-700 border-rose-200',
            Medium: 'bg-amber-100 text-amber-700 border-amber-200',
            Low: 'bg-yellow-100 text-yellow-700 border-yellow-200',
            None: 'bg-slate-100 text-slate-500 border-slate-200'
        }
        return (
            <div className="flex items-center justify-between p-3 border-b border-slate-100 last:border-0 hover:bg-slate-50 transition-colors cursor-pointer group" onClick={openPlaceholder}>
                <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center group-hover:bg-white shadow-[0_2px_4px_rgba(0,0,0,0.02)] transition-all">
                        {severity === 'High' ? <AlertTriangle className="w-4 h-4 text-rose-500" /> : <AlertCircle className="w-4 h-4 text-amber-500" />}
                    </div>
                    <div>
                        <div className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                            {label}
                            <div className="relative group/tooltip">
                                <Info className="w-3.5 h-3.5 text-slate-400 hover:text-indigo-500 cursor-help" />
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 w-48 bg-slate-800 text-white text-[10px] p-2 rounded-lg opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all shadow-xl z-50 pointer-events-none">
                                    {tooltip}
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                <div className="flex items-center gap-4">
                    <span className="font-bold text-slate-800 tabular-nums">{count}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide border ${severityColors[severity as keyof typeof severityColors] || severityColors.None}`}>
                        {severity}
                    </span>
                </div>
            </div>
        )
    }

    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm mb-6 flex flex-col items-stretch">
            {/* Header / Filter Row */}
            <div className="flex flex-col xl:flex-row items-center justify-between px-6 py-4 border-b border-slate-100 bg-slate-50/50 gap-4">
                <div className="flex items-center gap-4 flex-wrap w-full xl:w-auto">
                    <div className="flex items-center gap-2">
                        <div className="w-[3px] h-5 rounded-full bg-[#3b82f6] flex-shrink-0" />
                        <Image src="/bwi-icon.png" width={20} height={20} alt="BWI Icon" className="rounded-md" />
                        <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight mr-2">Business Work Items</h2>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                        {/* Workstream Select */}
                        <select
                            value={workstream}
                            onChange={handleWorkstreamChange}
                            className="h-8 pl-3 pr-8 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-slate-300 transition-colors shadow-sm font-medium text-slate-700"
                        >
                            <option value="All Workstreams">All Workstreams</option>
                            <option value="MAPS">MAPS</option>
                            <option value="EG">EG</option>
                            <option value="PCE">PCE</option>
                            {workstream !== 'All Workstreams' && !['MAPS', 'EG', 'PCE'].includes(workstream) && (
                                <option value={workstream}>{workstream}</option>
                            )}
                        </select>

                        {/* Search */}
                        <div className="relative">
                            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <input
                                type="text"
                                placeholder="Search BWIs..."
                                value={bwiSearch}
                                onChange={handleSearch}
                                className="h-8 pl-8 pr-3 w-40 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-slate-300 transition-colors shadow-sm"
                            />
                        </div>

                        {/* Date Window */}
                        <div className="relative">
                            <Calendar className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
                            <select
                                value={bwiDateWindow}
                                onChange={handleDateChange}
                                className="h-8 pl-8 pr-8 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-blue-500 hover:border-slate-300 transition-colors shadow-sm text-slate-700 font-medium"
                            >
                                <option value="all">All Dates</option>
                                <option value="30">Last 30 Days</option>
                                <option value="90">Last 90 Days</option>
                            </select>
                        </div>

                        {/* Hide Closed */}
                        <button
                            onClick={toggleHideClosed}
                            className={`h-8 px-3 text-xs font-medium rounded-lg border transition-all flex items-center gap-1.5 shadow-sm
                                ${bwiHideClosed ? 'bg-slate-800 text-white border-slate-800' : 'bg-white text-slate-600 border-slate-200 hover:bg-slate-50'}
                            `}
                        >
                            <Filter className="w-3 h-3" />
                            Active Only
                        </button>
                    </div>
                </div>

                {/* KPI Right Side */}
                <div className="flex items-center gap-3 xl:ml-auto select-none overflow-x-auto w-full xl:w-auto pb-1 xl:pb-0">
                    <KPIBox label="Total BWIs" value={data.totalBwis} color="text-slate-800" bg="bg-slate-100/50" />
                    <KPIBox label="In Progress" value={data.inProgress} color="text-indigo-600" bg="bg-indigo-50/50" />
                    <KPIBox label="Pending" value={data.pending} color="text-amber-600" bg="bg-amber-50/50" />
                    <KPIBox label="Done" value={data.done} color="text-emerald-600" bg="bg-emerald-50/50" />
                </div>
            </div>

            <div className="p-6 space-y-6 bg-slate-50/30">
                {/* ── B) Action Items Array ── */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
                        <FolderCheck className="w-4 h-4 text-slate-500" />
                        <h3 className="text-sm font-semibold text-slate-700">Action Items & Data Quality</h3>
                    </div>
                    <div className="flex flex-col divide-y divide-slate-100">
                        <ActionItem label="Missing Start or Due Date" count={data.alerts.missingDates.count} severity={data.alerts.missingDates.severity} tooltip="BWIs without a planned Start Date or Due Date." />
                        <ActionItem label="Behind Schedule" count={data.alerts.behindSchedule.count} severity={data.alerts.behindSchedule.severity} tooltip="Due date passed without completion, or start date passed but still in To Do." />
                        <ActionItem label="No Child Issues" count={data.alerts.noChildIssues.count} severity={data.alerts.noChildIssues.severity} tooltip="BWIs with zero Stories, Bugs, or Tasks created under them." />
                        <ActionItem label="Closed with Open Children" count={data.alerts.closedOpenChildren.count} severity={data.alerts.closedOpenChildren.severity} tooltip="BWI is marked Done, but has open child issues." />
                        <ActionItem label="Status Inconsistency" count={data.alerts.statusInconsistency.count} severity={data.alerts.statusInconsistency.severity} tooltip="BWI is still To Do, but it has children In Progress or Done." />
                    </div>
                </div>

                {/* ── C) Row 1: 3 Equal Cards ── */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-[260px]">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-4 relative z-10">
                            <h3 className="text-sm font-semibold text-slate-700">BWI Progress</h3>
                            <button onClick={openPlaceholder} className="text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors bg-slate-50 px-2 py-1 rounded">View</button>
                        </div>
                        <div className="flex-1 relative z-10 -mt-2">
                            {total > 0 ? (
                                <InitiativeStatusGauge data={gaugeData} total={total} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No active data</div>
                            )}
                        </div>
                        <div className="absolute inset-0 bg-gradient-to-tr from-indigo-50/30 to-transparent pointer-events-none" />
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <h3 className="text-sm font-semibold text-slate-700">By Workstream</h3>
                        </div>
                        <div className="flex-1 min-h-0 relative z-10">
                            {data.byWorkstream.length > 0 ? (
                                <WorkstreamBarChart data={data.byWorkstream} onClickBar={openPlaceholder} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No active data</div>
                            )}
                        </div>
                    </div>

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col relative overflow-hidden group">
                        <div className="flex items-center justify-between mb-2 relative z-10">
                            <h3 className="text-sm font-semibold text-slate-700 leading-tight">Investment Category<span className="block text-[10px] font-normal text-slate-400 uppercase mt-0.5">Inherited from Initiative</span></h3>
                        </div>
                        <div className="flex-1 relative z-10 min-h-0 flex items-center justify-center">
                            {data.byInvestmentCategory.length > 0 ? (
                                <InvestmentCategoryDonut data={data.byInvestmentCategory} total={total} onClickSlice={openPlaceholder} />
                            ) : (
                                <div className="h-full flex items-center justify-center text-xs text-slate-400 font-medium">No active data</div>
                            )}
                        </div>
                    </div>
                </div>

                {/* ── D) Row 2: Child distribution + Top at risk ── */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 min-h-[300px]">
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-sm font-semibold text-slate-700">Child Issue Distribution</h3>
                            <button onClick={openPlaceholder} className="text-[10px] font-bold text-slate-400 uppercase hover:text-indigo-600 transition-colors bg-slate-50 px-2 py-1 rounded">View</button>
                        </div>
                        <div className="flex-1 min-h-0 flex items-center justify-center -mt-2">
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

                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
                        <div className="flex items-center justify-between mb-4">
                            <h3 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                <AlertTriangle className="w-4 h-4 text-rose-500" /> Top BWIs at Risk
                            </h3>
                            <span className="text-xs font-medium text-slate-400 bg-slate-100 px-2 py-0.5 rounded">Top 10</span>
                        </div>
                        <div className="flex-1 overflow-auto pr-1 custom-scrollbar">
                            {data.topAtRisk.length > 0 ? (
                                <table className="w-full text-left text-xs text-slate-600">
                                    <thead className="text-[10px] uppercase font-bold text-slate-400 border-b border-slate-100 sticky top-0 bg-white">
                                        <tr>
                                            <th className="pb-2 font-semibold">Key</th>
                                            <th className="pb-2 font-semibold">Summary</th>
                                            <th className="pb-2 font-semibold text-center">Score</th>
                                            <th className="pb-2 font-semibold text-right">Due Date</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-slate-50">
                                        {data.topAtRisk.map(row => (
                                            <tr key={row.id} className="hover:bg-slate-50/50 group cursor-pointer transition-colors" onClick={openPlaceholder}>
                                                <td className="py-2.5 pr-2 font-mono text-indigo-600 font-medium truncate max-w-[80px]" title={row.key}>{row.key}</td>
                                                <td className="py-2.5 pr-2 font-medium text-slate-700 truncate max-w-[150px]" title={row.summary}>{row.summary}</td>
                                                <td className="py-2.5 px-2 text-center">
                                                    <span className={`inline-flex items-center justify-center w-5 h-5 rounded-full text-[10px] font-bold ${row.risk_score >= 4 ? 'bg-rose-100 text-rose-700' : 'bg-amber-100 text-amber-700'}`}>
                                                        {row.risk_score}
                                                    </span>
                                                </td>
                                                <td className="py-2.5 pl-2 text-right tabular-nums whitespace-nowrap">
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
            </div>
        </section>
    )
}

function KPIBox({ label, value, color, bg }: { label: string, value: number, color: string, bg: string }) {
    return (
        <div className={`flex flex-col items-center justify-center px-4 py-1.5 rounded-lg border border-slate-200/50 ${bg} min-w-[90px]`}>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 mb-0.5">{label}</span>
            <span className={`text-xl font-black leading-none tracking-tight ${color}`}>{value}</span>
        </div>
    )
}
