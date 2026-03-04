'use client'

import React, { useMemo } from 'react'
import { AlertTriangle, CheckCircle2, XCircle, GitPullRequest, ShieldCheck } from 'lucide-react'
import {
    PieChart, Pie, Cell, Tooltip, ResponsiveContainer,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend,
} from 'recharts'
import type { Phase4DTO, Phase4Issue, Phase4Filters } from '../phase4-content'

// ─── Palette ──────────────────────────────────────────────────────────────────

const BUG_COLORS = ['#ef4444', '#f59e0b', '#6366f1', '#94a3b8']

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
                <p className="text-xs text-slate-400">{description}</p>
            </div>
        </div>
    )
}

function GateBadge({ pass }: { pass: boolean }) {
    return pass ? (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-emerald-50 text-emerald-700 border-emerald-200">
            <CheckCircle2 className="w-3 h-3" /> PASS
        </span>
    ) : (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-1.5 py-0.5 rounded border bg-rose-50 text-rose-700 border-rose-200">
            <XCircle className="w-3 h-3" /> FAIL
        </span>
    )
}

// ─── Main ─────────────────────────────────────────────────────────────────────

import { FilterRow } from '../phase4-ui'

interface Props {
    dto: Phase4DTO
    filters: Phase4Filters
    setFilter: <K extends keyof Phase4Filters>(key: K, value: Phase4Filters[K]) => void
    filteredIssues: Phase4Issue[]
}

export function QualityTab({ filters, setFilter, filteredIssues }: Props) {
    const total = filteredIssues.length

    // Bug metrics
    const bugIssues = useMemo(() =>
        filteredIssues.filter(i =>
            i.issueType.toLowerCase().includes('bug') ||
            i.issueType.toLowerCase().includes('defect') ||
            i.issueType.toLowerCase().includes('hotfix'),
        ),
        [filteredIssues])

    const openBugs = bugIssues.filter(i => i.statusCategory !== 'Done')
    const closedBugs = bugIssues.filter(i => i.statusCategory === 'Done')
    const bugRatio = total > 0 ? Math.round(bugIssues.length / total * 100) : 0
    const bugResolutionRate = bugIssues.length > 0 ? Math.round(closedBugs.length / bugIssues.length * 100) : 0

    // Bug status distribution
    const bugStatusData = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const i of bugIssues) counts[i.statusCategory] = (counts[i.statusCategory] || 0) + 1
        return Object.entries(counts).map(([name, value]) => ({ name, value }))
    }, [bugIssues])

    // Bug by workstream
    const bugByWorkstream = useMemo(() => {
        const counts: Record<string, { open: number; closed: number }> = {}
        for (const i of bugIssues) {
            const ws = i.workstream || 'Unassigned'
            if (!counts[ws]) counts[ws] = { open: 0, closed: 0 }
            if (i.statusCategory === 'Done') counts[ws].closed++
            else counts[ws].open++
        }
        return Object.entries(counts)
            .map(([name, v]) => ({
                name: name.length > 20 ? name.slice(0, 20) + '…' : name,
                ...v,
                total: v.open + v.closed,
            }))
            .sort((a, b) => b.total - a.total)
            .slice(0, 8)
    }, [bugIssues])

    // Quality gates
    const gates = useMemo(() => {
        const wipCount = filteredIssues.filter(i => i.statusCategory === 'In Progress').length
        const completionRate = total > 0 ? Math.round(filteredIssues.filter(i => i.statusCategory === 'Done').length / total * 100) : 0

        return [
            {
                label: 'Bug Ratio < 20%',
                pass: bugRatio < 20,
                value: `${bugRatio}%`,
                detail: 'Percentage of bugs/hotfixes in total issue count',
            },
            {
                label: 'Bug Resolution ≥ 60%',
                pass: bugResolutionRate >= 60,
                value: `${bugResolutionRate}%`,
                detail: 'Percentage of reported bugs that are resolved',
            },
            {
                label: 'WIP < 40%',
                pass: total > 0 ? wipCount / total < 0.4 : true,
                value: total > 0 ? `${Math.round(wipCount / total * 100)}%` : '—',
                detail: 'Work In Progress should not exceed 40% of total',
            },
            {
                label: 'Completion Rate ≥ 40%',
                pass: completionRate >= 40,
                value: `${completionRate}%`,
                detail: 'At least 40% of issues should be closed',
            },
            {
                label: 'Open Bugs < 10',
                pass: openBugs.length < 10,
                value: `${openBugs.length}`,
                detail: 'Total open bug/defect/hotfix count',
            },
        ]
    }, [filteredIssues, total, bugRatio, bugResolutionRate, openBugs])

    const passCount = gates.filter(g => g.pass).length

    // DOR completeness proxy
    const dorItems = useMemo(() => {
        const hasDates = filteredIssues.filter(i => i.startDate || i.dueDate).length
        const hasInvestment = filteredIssues.filter(i => i.investmentCategory).length
        const hasWorkstream = filteredIssues.filter(i => i.workstream).length
        return [
            { label: 'Has Start or Due Date', count: hasDates, pct: total > 0 ? Math.round(hasDates / total * 100) : 0 },
            { label: 'Has Investment Category', count: hasInvestment, pct: total > 0 ? Math.round(hasInvestment / total * 100) : 0 },
            { label: 'Has Workstream', count: hasWorkstream, pct: total > 0 ? Math.round(hasWorkstream / total * 100) : 0 },
        ]
    }, [filteredIssues, total])

    return (
        <div className="space-y-5">
            <FilterRow filters={filters} setFilter={setFilter} />

            {/* ── Quality Gate Summary ──────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <div className="flex items-center justify-between mb-3">
                    <SectionTitle>
                        <ShieldCheck className="w-4 h-4 text-indigo-500" />
                        Quality Gates
                    </SectionTitle>
                    <span className={`text-xs font-semibold px-2 py-1 rounded-full border ${passCount === gates.length
                        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                        : passCount >= gates.length / 2
                            ? 'bg-amber-50 text-amber-700 border-amber-200'
                            : 'bg-rose-50 text-rose-700 border-rose-200'
                        }`}>
                        {passCount}/{gates.length} passing
                    </span>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    {gates.map(g => (
                        <div key={g.label} className="flex items-start gap-3 p-3 bg-white rounded-lg border border-slate-200">
                            <GateBadge pass={g.pass} />
                            <div className="min-w-0 flex-1">
                                <div className="flex items-center justify-between">
                                    <span className="text-xs font-medium text-slate-700">{g.label}</span>
                                    <span className={`text-xs font-bold ${g.pass ? 'text-emerald-600' : 'text-rose-600'}`}>{g.value}</span>
                                </div>
                                <p className="text-[10px] text-slate-400 mt-0.5">{g.detail}</p>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Bug KPIs ──────────────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                {[
                    { label: 'Total Bugs', value: `${bugIssues.length}`, note: 'Bugs, defects & hotfixes', color: bugIssues.length > 0 ? 'text-rose-600' : 'text-slate-300' },
                    { label: 'Open Bugs', value: `${openBugs.length}`, note: 'Not yet resolved', color: openBugs.length > 0 ? 'text-rose-600' : 'text-slate-300' },
                    { label: 'Bug Ratio', value: `${bugRatio}%`, note: `of ${total} total issues`, color: bugRatio > 20 ? 'text-rose-600' : 'text-slate-800' },
                    { label: 'Resolution Rate', value: `${bugResolutionRate}%`, note: `${closedBugs.length} resolved`, color: bugResolutionRate >= 60 ? 'text-emerald-600' : 'text-amber-600' },
                ].map(m => (
                    <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                        <div className={`text-2xl font-bold ${m.color}`}>{m.value}</div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">{m.label}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{m.note}</div>
                    </div>
                ))}
            </div>

            {/* ── Bug breakdown charts ───────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Bug status donut */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle>
                        <AlertTriangle className="w-4 h-4 text-rose-500" />
                        Bug Status
                    </SectionTitle>
                    {bugStatusData.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <PieChart>
                                <Pie
                                    data={bugStatusData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={50}
                                    outerRadius={80}
                                    paddingAngle={2}
                                    dataKey="value"
                                >
                                    {bugStatusData.map((d, idx) => (
                                        <Cell
                                            key={idx}
                                            fill={d.name === 'Done' ? '#10b981' : d.name === 'In Progress' ? '#6366f1' : '#94a3b8'}
                                        />
                                    ))}
                                </Pie>
                                <Tooltip
                                    formatter={(value: number | undefined, name: string | undefined) => [
                                        `${value ?? 0} (${bugIssues.length > 0 ? Math.round((value ?? 0) / bugIssues.length * 100) : 0}%)`,
                                        name ?? '',
                                    ]}
                                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Legend formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                            </PieChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex flex-col items-center justify-center h-44 gap-2 text-slate-400">
                            <CheckCircle2 className="w-8 h-8 text-emerald-300" />
                            <p className="text-sm font-medium text-emerald-600">No bugs found</p>
                            <p className="text-xs text-slate-400">No bug/defect/hotfix issues in current filter</p>
                        </div>
                    )}
                </div>

                {/* Bug by workstream */}
                <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                    <SectionTitle>
                        <AlertTriangle className="w-4 h-4 text-amber-500" />
                        Bugs by Workstream
                    </SectionTitle>
                    {bugByWorkstream.length > 0 ? (
                        <ResponsiveContainer width="100%" height={200}>
                            <BarChart data={bugByWorkstream} layout="vertical" margin={{ left: 0, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} />
                                <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                                <Legend formatter={v => <span className="text-xs text-slate-600">{v}</span>} />
                                <Bar dataKey="open" name="Open" stackId="a" fill="#ef4444" maxBarSize={14} />
                                <Bar dataKey="closed" name="Resolved" stackId="a" fill="#10b981" radius={[0, 4, 4, 0]} maxBarSize={14} />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <div className="flex items-center justify-center h-44 text-slate-400 text-sm">No bugs found</div>
                    )}
                </div>
            </div>

            {/* ── Definition of Ready Completeness ─────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <CheckCircle2 className="w-4 h-4 text-indigo-500" />
                    Issue Field Completeness (Definition of Ready proxy)
                </SectionTitle>
                <div className="space-y-2.5">
                    {dorItems.map(item => (
                        <div key={item.label}>
                            <div className="flex justify-between text-xs mb-1">
                                <span className="font-medium text-slate-700">{item.label}</span>
                                <span className="text-slate-500">{item.count} / {total} &middot; {item.pct}%</span>
                            </div>
                            <div className="h-2.5 bg-slate-200 rounded-full overflow-hidden">
                                <div
                                    className="h-full rounded-full transition-all duration-700"
                                    style={{
                                        width: `${item.pct}%`,
                                        background: item.pct >= 80 ? '#10b981' : item.pct >= 50 ? '#f59e0b' : '#ef4444',
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
                <p className="text-[10px] text-slate-400 mt-3">
                    High completeness rates indicate well-groomed issues. Connect acceptance criteria and story points fields for full DOR scoring.
                </p>
            </div>

            {/* ── Test coverage placeholder ─────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <ShieldCheck className="w-4 h-4 text-slate-400" />
                    Test Coverage & Code Quality
                </SectionTitle>
                <ConnectBanner
                    title="Test & code quality tools not connected"
                    description="Connect SonarQube, Codecov, or your CI pipeline to display unit test coverage, code smells, technical debt, and SAST findings."
                />
                <div className="mt-3 grid grid-cols-4 gap-3">
                    {['Test Coverage', 'Code Smells', 'Tech Debt', 'SAST Issues'].map(label => (
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
