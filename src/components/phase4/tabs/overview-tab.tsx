'use client'

import React, { useMemo } from 'react'
import {
    CheckCircle2, Clock, Circle, TrendingUp, TrendingDown,
    AlertTriangle, ArrowRight, BarChart2, GitPullRequest, Timer,
} from 'lucide-react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import type { Phase4DTO, Phase4Issue, Phase4Filters } from '../phase4-content'

// ─── Color palette ────────────────────────────────────────────────────────────

const TYPE_COLORS = [
    '#6366f1', '#ef4444', '#f59e0b', '#10b981',
    '#3b82f6', '#f97316', '#8b5cf6', '#06b6d4', '#94a3b8',
]

const STATUS_COLORS: Record<string, string> = {
    Done: '#10b981',
    'In Progress': '#6366f1',
    'To Do': '#94a3b8',
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function KpiCard({
    icon: Icon, label, value, sub, trend, trendLabel, iconBg, valueColor,
}: {
    icon: React.ElementType
    label: string
    value: string | number
    sub?: string
    trend?: 'up' | 'down' | 'neutral'
    trendLabel?: string
    iconBg?: string
    valueColor?: string
}) {
    return (
        <div className="bg-white border border-slate-200 rounded-xl p-4 flex flex-col gap-2 shadow-sm hover:shadow-md transition-shadow">
            <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">{label}</span>
                <div className={`p-1.5 rounded-lg ${iconBg ?? 'bg-indigo-50'}`}>
                    <Icon className="w-4 h-4 text-indigo-600" />
                </div>
            </div>
            <div className={`text-3xl font-bold tracking-tight ${valueColor ?? 'text-slate-800'}`}>
                {value}
            </div>
            <div className="flex items-center gap-1.5 text-xs">
                {trend === 'up' && <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />}
                {trend === 'down' && <TrendingDown className="w-3.5 h-3.5 text-rose-500" />}
                {trendLabel && (
                    <span className={
                        trend === 'up' ? 'text-emerald-600 font-medium' :
                            trend === 'down' ? 'text-rose-600 font-medium' : 'text-slate-400'
                    }>{trendLabel}</span>
                )}
                {sub && <span className="text-slate-400">{sub}</span>}
            </div>
        </div>
    )
}

function SectionTitle({ children }: { children: React.ReactNode }) {
    return (
        <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
            {children}
        </h3>
    )
}

function RiskBadge({ severity }: { severity: 'high' | 'medium' | 'low' }) {
    const styles = {
        high: 'bg-rose-50 text-rose-700 border-rose-200',
        medium: 'bg-amber-50 text-amber-700 border-amber-200',
        low: 'bg-blue-50 text-blue-700 border-blue-200',
    }
    return (
        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded border ${styles[severity]}`}>
            {severity}
        </span>
    )
}

function ConnectBanner({ source, description }: { source: string; description: string }) {
    return (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-slate-50 border border-dashed border-slate-300 text-slate-500">
            <div className="w-8 h-8 bg-slate-200 rounded-full flex items-center justify-center shrink-0">
                <GitPullRequest className="w-4 h-4" />
            </div>
            <div className="min-w-0">
                <p className="text-xs font-medium text-slate-600">{source} not connected</p>
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
    isAdmin: boolean
}

export function OverviewTab({ dto, filters, filteredIssues }: Props) {
    const total = filteredIssues.length
    const done = filteredIssues.filter(i => i.statusCategory === 'Done').length
    const inProgress = filteredIssues.filter(i => i.statusCategory === 'In Progress').length
    const toDo = filteredIssues.filter(i => i.statusCategory === 'To Do').length
    const completionRate = total > 0 ? Math.round((done / total) * 100) : 0

    // Bug ratio
    const bugs = filteredIssues.filter(i =>
        i.issueType.toLowerCase().includes('bug') ||
        i.issueType.toLowerCase().includes('hotfix'),
    ).length
    const bugRatio = total > 0 ? Math.round((bugs / total) * 100) : 0

    // Donut data
    const typeData = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const i of filteredIssues) counts[i.issueType] = (counts[i.issueType] || 0) + 1
        return Object.entries(counts)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 8)
    }, [filteredIssues])

    const statusData = [
        { name: 'Done', value: done },
        { name: 'In Progress', value: inProgress },
        { name: 'To Do', value: toDo },
    ].filter(d => d.value > 0)

    // Risks
    const risks: { severity: 'high' | 'medium' | 'low'; text: string }[] = []
    if (bugRatio > 30) risks.push({ severity: 'high', text: `High bug ratio: ${bugRatio}% of issues are bugs/hotfixes` })
    if (completionRate < 40 && total > 10) risks.push({ severity: 'medium', text: `Low completion rate: ${completionRate}% done` })
    if (inProgress > total * 0.6) risks.push({ severity: 'medium', text: `Too much WIP: ${inProgress} issues in progress (${Math.round(inProgress / total * 100)}% of total)` })
    if (toDo > total * 0.5) risks.push({ severity: 'low', text: `Large backlog: ${toDo} issues not yet started` })
    if (risks.length === 0) risks.push({ severity: 'low', text: 'No critical risks detected based on current data' })

    return (
        <div className="space-y-5">

            {/* ── KPI Row ───────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                <KpiCard
                    icon={CheckCircle2}
                    label="Completion Rate"
                    value={`${completionRate}%`}
                    sub={`${done} / ${total} issues`}
                    trend={completionRate >= 70 ? 'up' : completionRate >= 40 ? 'neutral' : 'down'}
                    trendLabel={completionRate >= 70 ? 'On track' : completionRate >= 40 ? 'At risk' : 'Below target'}
                    iconBg="bg-emerald-50"
                    valueColor={completionRate >= 70 ? 'text-emerald-600' : completionRate >= 40 ? 'text-amber-600' : 'text-rose-600'}
                />
                <KpiCard
                    icon={Clock}
                    label="In Progress"
                    value={inProgress}
                    sub="active issues"
                    trend="neutral"
                    trendLabel={`${total > 0 ? Math.round(inProgress / total * 100) : 0}% of total`}
                    iconBg="bg-indigo-50"
                />
                <KpiCard
                    icon={Circle}
                    label="Backlog"
                    value={toDo}
                    sub="not started"
                    trend={toDo > total * 0.5 ? 'down' : 'neutral'}
                    trendLabel={`${total > 0 ? Math.round(toDo / total * 100) : 0}% of total`}
                    iconBg="bg-slate-100"
                />
                <KpiCard
                    icon={AlertTriangle}
                    label="Bug / Hotfix Ratio"
                    value={`${bugRatio}%`}
                    sub={`${bugs} issues`}
                    trend={bugRatio > 30 ? 'down' : bugRatio > 15 ? 'neutral' : 'up'}
                    trendLabel={bugRatio > 30 ? 'Above threshold' : bugRatio > 15 ? 'Watch' : 'Healthy'}
                    iconBg="bg-rose-50"
                    valueColor={bugRatio > 30 ? 'text-rose-600' : 'text-slate-800'}
                />
            </div>

            {/* ── Charts Row ────────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                {/* Issue type donut */}
                <div className="lg:col-span-2 bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle><BarChart2 className="w-4 h-4 text-indigo-500" /> Issue Distribution by Type</SectionTitle>
                    {typeData.length > 0 ? (
                        <div className="flex items-center gap-4">
                            <ResponsiveContainer width="100%" height={220}>
                                <PieChart>
                                    <Pie
                                        data={typeData}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={55}
                                        outerRadius={90}
                                        paddingAngle={2}
                                        dataKey="value"
                                    >
                                        {typeData.map((_, idx) => (
                                            <Cell key={idx} fill={TYPE_COLORS[idx % TYPE_COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <Tooltip
                                        formatter={(value: number | undefined, name: string | undefined) => [
                                            `${value ?? 0} issues (${total > 0 ? Math.round((value ?? 0) / total * 100) : 0}%)`,
                                            name ?? '',
                                        ]}
                                        contentStyle={{ fontSize: 12, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                    />
                                    <Legend
                                        formatter={(value) => <span className="text-[11px] text-slate-600">{value}</span>}
                                    />
                                </PieChart>
                            </ResponsiveContainer>
                        </div>
                    ) : (
                        <p className="text-sm text-slate-400 text-center py-10">No issues match current filters</p>
                    )}
                </div>

                {/* Status breakdown */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle>Status Breakdown</SectionTitle>
                    <div className="space-y-3">
                        {statusData.map(s => (
                            <div key={s.name}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-700">{s.name}</span>
                                    <span className="text-slate-500">{s.value} &middot; {total > 0 ? Math.round(s.value / total * 100) : 0}%</span>
                                </div>
                                <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full transition-all duration-700"
                                        style={{
                                            width: `${total > 0 ? (s.value / total * 100) : 0}%`,
                                            background: STATUS_COLORS[s.name] ?? '#6366f1',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                        {statusData.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-6">No data</p>
                        )}
                        <div className="pt-2 border-t border-slate-200 text-xs text-slate-500 flex justify-between">
                            <span>Total</span>
                            <span className="font-semibold text-slate-700">{total} issues</span>
                        </div>
                    </div>

                    {/* Completion ring */}
                    <div className="mt-4 flex flex-col items-center">
                        <div className="relative w-24 h-24">
                            <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                                <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" stroke="#e2e8f0" />
                                <circle
                                    cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                                    stroke="#10b981"
                                    strokeDasharray={`${completionRate * 0.974} 100`}
                                    strokeLinecap="round"
                                />
                            </svg>
                            <div className="absolute inset-0 flex flex-col items-center justify-center">
                                <span className="text-xl font-bold text-slate-800">{completionRate}%</span>
                                <span className="text-[9px] text-slate-400 uppercase tracking-wide">Done</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Metric Gaps (GitHub/Sprint data) ──────────────────────────── */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle><Timer className="w-4 h-4 text-slate-400" /> Cycle Time & Throughput</SectionTitle>
                    <ConnectBanner
                        source="Jira Status History"
                        description="Connect status transition data to calculate avg cycle time, lead time, and weekly throughput."
                    />
                    <div className="mt-3 grid grid-cols-3 gap-3">
                        {['Avg Cycle Time', 'Throughput/wk', 'Lead Time'].map(label => (
                            <div key={label} className="text-center p-3 bg-white rounded-lg border border-slate-200">
                                <div className="text-lg font-bold text-slate-300">—</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle><GitPullRequest className="w-4 h-4 text-slate-400" /> Pull Request Metrics</SectionTitle>
                    <ConnectBanner
                        source="GitHub"
                        description="Connect GitHub to track open PRs, PR age, review throughput, and unlinked PR percentage."
                    />
                    <div className="mt-3 grid grid-cols-3 gap-3">
                        {['Open PRs', 'Avg PR Age', 'Reviews/wk'].map(label => (
                            <div key={label} className="text-center p-3 bg-white rounded-lg border border-slate-200">
                                <div className="text-lg font-bold text-slate-300">—</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ── Risks / Alerts ────────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <AlertTriangle className="w-4 h-4 text-amber-500" />
                    Top Risks & Alerts
                </SectionTitle>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {risks.map((r, i) => (
                        <div key={i} className="flex items-start gap-2.5 p-3 bg-white rounded-lg border border-slate-200">
                            <RiskBadge severity={r.severity} />
                            <span className="text-xs text-slate-700 leading-relaxed">{r.text}</span>
                            <ArrowRight className="w-3.5 h-3.5 text-slate-300 shrink-0 ml-auto mt-0.5" />
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
