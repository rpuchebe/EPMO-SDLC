'use client'

import React, { useMemo } from 'react'
import { Users, GitPullRequest, BarChart2 } from 'lucide-react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import type { Phase4DTO, Phase4Issue, Phase4Filters } from '../phase4-content'

// ─── Palette ──────────────────────────────────────────────────────────────────

const INV_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#f97316', '#8b5cf6', '#06b6d4', '#94a3b8',
]

// ─── Sub-components ───────────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            {children}
        </h3>
    )
}

function ConnectBanner({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-slate-500">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                <GitPullRequest className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600">{title}</p>
                <p className="text-[11px] text-slate-400">{description}</p>
            </div>
        </div>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
    dto: Phase4DTO
    filters: Phase4Filters
    filteredIssues: Phase4Issue[]
}

export function CapacityTab({ dto, filteredIssues }: Props) {
    const total = filteredIssues.length

    // Investment category distribution (real data)
    const investmentData = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const i of filteredIssues) {
            const cat = i.investmentCategory || 'Uncategorized'
            counts[cat] = (counts[cat] || 0) + 1
        }
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value, pct: total > 0 ? Math.round(value / total * 100) : 0 }))
            .sort((a, b) => b.value - a.value)
    }, [filteredIssues, total])

    // Workstream breakdown (real data — issues have workstream field)
    const workstreamData = useMemo(() => {
        const counts: Record<string, { total: number; done: number; inProgress: number; toDo: number }> = {}
        for (const i of filteredIssues) {
            const ws = i.workstream || 'Unassigned'
            if (!counts[ws]) counts[ws] = { total: 0, done: 0, inProgress: 0, toDo: 0 }
            counts[ws].total++
            if (i.statusCategory === 'Done') counts[ws].done++
            else if (i.statusCategory === 'In Progress') counts[ws].inProgress++
            else counts[ws].toDo++
        }
        return Object.entries(counts)
            .map(([name, v]) => ({
                name: name.length > 22 ? name.slice(0, 22) + '…' : name,
                fullName: name,
                ...v,
                completionPct: v.total > 0 ? Math.round(v.done / v.total * 100) : 0,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 10)
    }, [filteredIssues])

    // Issue type vs investment category cross-tab (heat-map proxy via stacked bar)
    const typeInvData = useMemo(() => {
        const categories = investmentData.slice(0, 5).map(d => d.name)
        const typeCounts: Record<string, Record<string, number>> = {}
        for (const i of filteredIssues) {
            const t = i.issueType
            const cat = i.investmentCategory || 'Uncategorized'
            if (!categories.includes(cat)) continue
            if (!typeCounts[t]) typeCounts[t] = {}
            typeCounts[t][cat] = (typeCounts[t][cat] || 0) + 1
        }
        return Object.entries(typeCounts)
            .map(([type, catMap]) => ({
                type: type.length > 14 ? type.slice(0, 14) + '…' : type,
                ...catMap,
                total: Object.values(catMap).reduce((s, v) => s + v, 0),
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8)
    }, [filteredIssues, investmentData])

    const topCategories = investmentData.slice(0, 5).map(d => d.name)

    return (
        <div className="space-y-5">

            {/* ── Investment Allocation ─────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* Donut */}
                <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle>
                        <BarChart2 className="w-4 h-4 text-indigo-500" />
                        Investment Allocation
                    </SectionTitle>
                    {investmentData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={investmentData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={85}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {investmentData.map((_, idx) => (
                                        <Cell key={idx} fill={INV_COLORS[idx % INV_COLORS.length]} />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number | undefined, name: string | undefined) => [
                                        `${value ?? 0} issues (${total > 0 ? Math.round((value ?? 0) / total * 100) : 0}%)`,
                                        name ?? '',
                                    ]}
                                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Legend formatter={v => <span className="text-[11px] text-slate-600">{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-10">No investment category data</p>
                    )}
                </div>

                {/* Category list */}
                <div className="lg:col-span-3 bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle>Category Breakdown</SectionTitle>
                    {investmentData.length > 0 ? (
                        <div className="space-y-2.5">
                            {investmentData.map((d, idx) => (
                                <div key={d.name}>
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="flex items-center gap-1.5 font-medium text-slate-700">
                                            <span
                                                className="w-2 h-2 rounded-full inline-block shrink-0"
                                                style={{ background: INV_COLORS[idx % INV_COLORS.length] }}
                                            />
                                            {d.name}
                                        </span>
                                        <span className="text-slate-500">{d.value} &middot; {d.pct}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full"
                                            style={{
                                                width: `${d.pct}%`,
                                                background: INV_COLORS[idx % INV_COLORS.length],
                                                transition: 'width 0.6s ease',
                                            }}
                                        />
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-8">No data</p>
                    )}
                </div>
            </div>

            {/* ── Workstream Load ───────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <Users className="w-4 h-4 text-indigo-500" />
                    Workstream Load
                </SectionTitle>
                {workstreamData.length > 0 ? (
                    <>
                        <ResponsiveContainer width="100%" height={Math.max(180, workstreamData.length * 28)}>
                            <BarChart data={workstreamData} layout="vertical" margin={{ left: 0, right: 50 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" width={140} tick={{ fontSize: 10 }} />
                                <Tooltip
                                    formatter={(v: number | undefined, name: string | undefined) => [v ?? 0, name ?? '']}
                                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Legend formatter={v => <span className="text-[11px] text-slate-600">{v}</span>} />
                                <Bar dataKey="done" name="Done" stackId="a" fill="#10b981" maxBarSize={14} />
                                <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#6366f1" maxBarSize={14} />
                                <Bar dataKey="toDo" name="To Do" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} maxBarSize={14} />
                            </BarChart>
                        </ResponsiveContainer>

                        {/* Completion rate table */}
                        <div className="mt-4 overflow-x-auto">
                            <table className="w-full text-xs">
                                <thead>
                                    <tr className="border-b border-slate-200">
                                        {['Workstream', 'Total', 'Done', 'WIP', 'Backlog', 'Completion'].map(h => (
                                            <th key={h} className="px-3 py-2 text-left font-semibold text-slate-500 uppercase tracking-wider text-[10px]">{h}</th>
                                        ))}
                                    </tr>
                                </thead>
                                <tbody>
                                    {workstreamData.map((ws, idx) => (
                                        <tr key={ws.name} className={`border-b border-slate-100 ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}>
                                            <td className="px-3 py-2 font-medium text-slate-700 max-w-[160px] truncate" title={ws.fullName}>{ws.name}</td>
                                            <td className="px-3 py-2 text-slate-600">{ws.total}</td>
                                            <td className="px-3 py-2 text-emerald-700 font-medium">{ws.done}</td>
                                            <td className="px-3 py-2 text-indigo-700">{ws.inProgress}</td>
                                            <td className="px-3 py-2 text-slate-500">{ws.toDo}</td>
                                            <td className="px-3 py-2">
                                                <div className="flex items-center gap-2">
                                                    <div className="flex-1 h-1.5 bg-slate-200 rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full rounded-full bg-emerald-500"
                                                            style={{ width: `${ws.completionPct}%` }}
                                                        />
                                                    </div>
                                                    <span className="text-slate-600 font-medium w-7 text-right">{ws.completionPct}%</span>
                                                </div>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No workstream data available</p>
                )}
            </div>

            {/* ── Issue Type × Investment Category ─────────────────────────── */}
            {typeInvData.length > 0 && topCategories.length > 0 && (
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle>
                        <BarChart2 className="w-4 h-4 text-amber-500" />
                        Issue Type by Investment Category (top 5 categories)
                    </SectionTitle>
                    <ResponsiveContainer width="100%" height={Math.max(160, typeInvData.length * 24)}>
                        <BarChart data={typeInvData} layout="vertical" margin={{ left: 0, right: 20 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="type" width={110} tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            <Legend formatter={v => <span className="text-[11px] text-slate-600">{v}</span>} />
                            {topCategories.map((cat, idx) => (
                                <Bar
                                    key={cat}
                                    dataKey={cat}
                                    stackId="a"
                                    fill={INV_COLORS[idx % INV_COLORS.length]}
                                    maxBarSize={14}
                                    radius={idx === topCategories.length - 1 ? [0, 4, 4, 0] : undefined}
                                />
                            ))}
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            )}

            {/* ── Team capacity placeholder ─────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <Users className="w-4 h-4 text-slate-400" />
                    Team Capacity & FTE Allocation
                </SectionTitle>
                <ConnectBanner
                    title="Team / assignee data not available"
                    description="Connect Jira assignee fields or HR capacity data to see per-engineer issue load, sprint allocation, and available FTE capacity."
                />
                <div className="mt-3 grid grid-cols-3 gap-3">
                    {['Total FTEs', 'Avg Load/Dev', 'Capacity Used'].map(label => (
                        <div key={label} className="text-center p-3 bg-white rounded-lg border border-slate-200">
                            <div className="text-lg font-bold text-slate-300">—</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
