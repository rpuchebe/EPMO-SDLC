'use client'

import React, { useMemo } from 'react'
import { GitPullRequest, Timer, TrendingUp, AlertTriangle } from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell, LineChart, Line, Legend,
} from 'recharts'
import type { Phase4DTO, Phase4Issue, Phase4Filters } from '../phase4-content'

// ─── Palette ──────────────────────────────────────────────────────────────────

const STATUS_COLORS: Record<string, string> = {
    Done: '#10b981',
    'In Progress': '#6366f1',
    'To Do': '#94a3b8',
}

const INV_COLORS = [
    '#6366f1', '#10b981', '#f59e0b', '#ef4444',
    '#3b82f6', '#f97316', '#8b5cf6', '#06b6d4',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

function MetricCard({ label, value, note }: { label: string; value: string; note?: string }) {
    const isEmpty = value === '—'
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-1 text-center shadow-sm">
            <div className={`text-2xl font-bold ${isEmpty ? 'text-slate-300' : 'text-slate-800'}`}>{value}</div>
            <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider">{label}</div>
            {note && <div className="text-[9px] text-slate-400">{note}</div>}
        </div>
    )
}

// ─── Issue age calculation ─────────────────────────────────────────────────────

function calcAgeDays(issue: Phase4Issue): number | null {
    const start = issue.startDate ?? issue.dueDate
    if (!start) return null
    const ms = Date.now() - new Date(start).getTime()
    return Math.max(0, Math.round(ms / 86_400_000))
}

import { FilterRow } from '../phase4-ui'

interface Props {
    dto: Phase4DTO
    filters: Phase4Filters
    setFilter: <K extends keyof Phase4Filters>(key: K, value: Phase4Filters[K]) => void
    filteredIssues: Phase4Issue[]
}

export function FlowTab({ filters, setFilter, filteredIssues }: Props) {
    const total = filteredIssues.length

    // Status breakdown bar data
    const statusData = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const i of filteredIssues) {
            counts[i.statusCategory] = (counts[i.statusCategory] || 0) + 1
        }
        return [
            { name: 'To Do', count: counts['To Do'] || 0 },
            { name: 'In Progress', count: counts['In Progress'] || 0 },
            { name: 'Done', count: counts['Done'] || 0 },
        ]
    }, [filteredIssues])

    // Investment category flow data
    const investmentData = useMemo(() => {
        const map: Record<string, { toDo: number; inProgress: number; done: number }> = {}
        for (const i of filteredIssues) {
            const cat = i.investmentCategory || 'Uncategorized'
            if (!map[cat]) map[cat] = { toDo: 0, inProgress: 0, done: 0 }
            if (i.statusCategory === 'To Do') map[cat].toDo++
            else if (i.statusCategory === 'In Progress') map[cat].inProgress++
            else map[cat].done++
        }
        return Object.entries(map)
            .map(([name, v]) => ({ name, ...v, total: v.toDo + v.inProgress + v.done }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8)
    }, [filteredIssues])

    // Throughput proxy: issues with due dates, grouped by month
    const throughputData = useMemo(() => {
        const monthCounts: Record<string, { done: number; total: number }> = {}
        const now = new Date()
        for (let m = 5; m >= 0; m--) {
            const d = new Date(now.getFullYear(), now.getMonth() - m, 1)
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
            monthCounts[key] = { done: 0, total: 0 }
        }
        for (const i of filteredIssues) {
            const date = i.dueDate || i.startDate
            if (!date) continue
            const d = new Date(date)
            const key = d.toLocaleString('default', { month: 'short', year: '2-digit' })
            if (monthCounts[key]) {
                monthCounts[key].total++
                if (i.statusCategory === 'Done') monthCounts[key].done++
            }
        }
        return Object.entries(monthCounts).map(([month, v]) => ({ month, ...v }))
    }, [filteredIssues])

    // Age of in-progress issues
    const ageData = useMemo(() => {
        const inProgress = filteredIssues.filter(i => i.statusCategory === 'In Progress')
        const buckets = { '0–7d': 0, '8–14d': 0, '15–30d': 0, '30d+': 0 }
        for (const i of inProgress) {
            const age = calcAgeDays(i)
            if (age === null) continue
            if (age <= 7) buckets['0–7d']++
            else if (age <= 14) buckets['8–14d']++
            else if (age <= 30) buckets['15–30d']++
            else buckets['30d+']++
        }
        return Object.entries(buckets).map(([label, count]) => ({ label, count }))
    }, [filteredIssues])

    const wip = filteredIssues.filter(i => i.statusCategory === 'In Progress').length
    const done = filteredIssues.filter(i => i.statusCategory === 'Done').length
    const staleCount = filteredIssues.filter(i => {
        if (i.statusCategory !== 'In Progress') return false
        const age = calcAgeDays(i)
        return age !== null && age > 30
    }).length

    return (
        <div className="space-y-5">
            <FilterRow filters={filters} setFilter={setFilter} />

            {/* ── Flow KPIs ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <MetricCard label="WIP Count" value={`${wip}`} note="In Progress issues" />
                <MetricCard label="Completed" value={`${done}`} note="Done issues" />
                <MetricCard
                    label="Completion Rate"
                    value={total > 0 ? `${Math.round(done / total * 100)}%` : '—'}
                    note={`${done} / ${total}`}
                />
                <MetricCard
                    label="Stale WIP"
                    value={staleCount > 0 ? `${staleCount}` : '0'}
                    note=">30 days in progress"
                />
            </div>

            {/* ── Status Distribution ─────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Status Distribution
                </SectionTitle>
                {total > 0 ? (
                    <div className="space-y-2.5">
                        {statusData.map(s => (
                            <div key={s.name}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-700">{s.name}</span>
                                    <span className="text-slate-500">
                                        {s.count} &middot; {total > 0 ? Math.round(s.count / total * 100) : 0}%
                                    </span>
                                </div>
                                <div className="h-3 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${total > 0 ? (s.count / total * 100) : 0}%`,
                                            background: STATUS_COLORS[s.name] ?? '#6366f1',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No issues match current filters</p>
                )}
            </div>

            {/* ── Throughput trend (monthly) + WIP age ───────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Monthly throughput proxy */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle>
                        <TrendingUp className="w-4 h-4 text-emerald-500" />
                        Monthly Activity (by due/start date)
                    </SectionTitle>
                    <ResponsiveContainer width="100%" height={180}>
                        <LineChart data={throughputData} margin={{ right: 8, left: -20 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                            <XAxis dataKey="month" tick={{ fontSize: 10 }} />
                            <YAxis tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            <Legend formatter={v => <span className="text-[11px] text-slate-600">{v}</span>} />
                            <Line type="monotone" dataKey="total" name="Total" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                            <Line type="monotone" dataKey="done" name="Done" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                        </LineChart>
                    </ResponsiveContainer>
                    <p className="text-[10px] text-slate-400 text-center mt-1">Based on due/start dates — not sprint commit dates</p>
                </div>

                {/* WIP age buckets */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle>
                        <Timer className="w-4 h-4 text-amber-500" />
                        WIP Age Distribution
                    </SectionTitle>
                    {wip > 0 ? (
                        <ResponsiveContainer width="100%" height={180}>
                            <BarChart data={ageData} margin={{ right: 8, left: -20 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                                <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                                <YAxis tick={{ fontSize: 10 }} />
                                <Tooltip
                                    formatter={(v: number | undefined) => [v ?? 0, 'Issues']}
                                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={40}>
                                    {ageData.map((d, idx) => (
                                        <Cell
                                            key={idx}
                                            fill={d.label === '30d+' ? '#ef4444' : d.label === '15–30d' ? '#f59e0b' : '#6366f1'}
                                        />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-44 text-slate-400 text-sm">No in-progress issues</div>
                    )}
                </div>
            </div>

            {/* ── Flow by Investment Category ─────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Flow by Investment Category
                </SectionTitle>
                {investmentData.length > 0 ? (
                    <ResponsiveContainer width="100%" height={220}>
                        <BarChart data={investmentData} layout="vertical" margin={{ left: 0, right: 40 }}>
                            <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                            <XAxis type="number" tick={{ fontSize: 10 }} />
                            <YAxis type="category" dataKey="name" width={130} tick={{ fontSize: 10 }} />
                            <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                            <Legend formatter={v => <span className="text-[11px] text-slate-600">{v}</span>} />
                            <Bar dataKey="done" name="Done" stackId="a" fill="#10b981" radius={[0, 0, 0, 0]} maxBarSize={14} />
                            <Bar dataKey="inProgress" name="In Progress" stackId="a" fill="#6366f1" maxBarSize={14} />
                            <Bar dataKey="toDo" name="To Do" stackId="a" fill="#94a3b8" radius={[0, 4, 4, 0]} maxBarSize={14} />
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <p className="text-sm text-slate-400 text-center py-8">No investment category data</p>
                )}
            </div>

            {/* ── Cycle Time placeholder ──────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <Timer className="w-4 h-4 text-slate-400" />
                    Cycle Time & Lead Time
                </SectionTitle>
                <ConnectBanner
                    title="Jira Status History not connected"
                    description="Connect status transition history to calculate true cycle time (In Progress → Done) and lead time (To Do → Done) per issue type."
                />
                <div className="mt-3 grid grid-cols-3 gap-3">
                    {['Avg Cycle Time', 'P50 Cycle', 'P90 Cycle'].map(label => (
                        <MetricCard key={label} label={label} value="—" note="days" />
                    ))}
                </div>
                <div className="mt-3">
                    <div className="flex items-start gap-2 p-3 bg-white rounded-lg border border-slate-200">
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-400 mt-0.5 shrink-0" />
                        <p className="text-[11px] text-slate-500 leading-relaxed">
                            Cycle time is estimated using issue start/due dates where available. True cycle time requires Jira status change history.
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}
