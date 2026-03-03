'use client'

/**
 * Phase 4 – Overview Tab
 *
 * Global rules:
 *  - NO local filters. All filtering is applied by the header (workstream / team)
 *    which drives the server-side fetch; the results arrive via `dto`.
 *  - Donut single-click → filters the linked Status Breakdown.
 *  - Donut / Status double-click → opens modal with matching ticket list.
 *  - Investment Allocation segment click → opens modal with matching tickets.
 *  - AI Analysis "Analyze" button → POST /api/phase4/analyze.
 *
 * Data notes:
 *  - Sprint, assignee, PR metrics require additional Jira sync fields
 *    (see /src/lib/server/phase4.ts for extension guidance).
 *  - WoW/MoM trends use updated_at_jira as proxy for completion date.
 */

import React, { useState, useMemo, useCallback, useRef } from 'react'
import {
    CheckCircle2, Clock, Circle, BookOpen, Bug, ListTodo,
    MoreHorizontal, Layers, GitPullRequest, Zap, Sparkles,
    AlertTriangle, Info, Maximize2, X, Users,
} from 'lucide-react'
import { IssueListModal, ColumnDef } from '@/components/shared/modals/issue-list-modal'
import {
    PieChart, Pie, Cell, Tooltip as RTooltip, ResponsiveContainer, Legend,
    BarChart, Bar, XAxis, YAxis, CartesianGrid, LabelList,
} from 'recharts'

import type { Phase4DTO, Phase4Issue } from '@/lib/server/phase4'
import { DEV_TYPES } from '@/lib/server/phase4'
import type { Phase4Filters } from '../phase4-content'
import { DashboardCard } from '@/components/ui/dashboard-card'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from '@/components/ui/dialog'

// ─── DEV_TYPES filter ─────────────────────────────────────────────────────────

const DEV_TYPES_LOWER_SET = new Set(DEV_TYPES.map(t => t.toLowerCase()))

// ─── Status normalisation ─────────────────────────────────────────────────────

/**
 * Maps any raw Jira status name to a canonical display group.
 * Matching is case-insensitive; first rule wins.
 * Add more patterns here as new custom statuses appear in your instance.
 */
const STATUS_GROUPS: { label: string; category: 'Done' | 'In Progress' | 'To Do'; patterns: RegExp[] }[] = [
    {
        label: 'Complete',
        category: 'Done',
        patterns: [/^done$/i, /^released to production$/i],
    },
    {
        label: 'Descoped',
        category: 'Done',
        patterns: [/^descoped$/i],
    },
    {
        label: 'In Deployment Process',
        category: 'In Progress',
        patterns: [/^passed qa$/i, /^production ready$/i, /^regression$/i, /^sandbox$/i, /^sandbox ready$/i],
    },
    {
        label: 'In QA',
        category: 'In Progress',
        patterns: [/^in qa$/i, /^need approval$/i],
    },
    {
        label: 'In progress',
        category: 'In Progress',
        patterns: [/^code review$/i, /^in development$/i, /^in progress$/i],
    },
    {
        label: 'Blocked',
        category: 'To Do',
        patterns: [/^blocked$/i],
    },
    {
        label: 'Open',
        category: 'To Do',
        patterns: [/^open$/i, /^to do$/i, /^to-do$/i, /^reopened$/i],
    },
]

/** Returns the canonical group label for a raw Jira status name. */
function normalizeStatus(raw: string): { label: string; category: 'Done' | 'In Progress' | 'To Do' } {
    for (const group of STATUS_GROUPS) {
        if (group.patterns.some(p => p.test(raw))) {
            return { label: group.label, category: group.category }
        }
    }
    // Fallback: use raw name, preserve category from statusCategory mapping
    return { label: raw, category: 'To Do' }
}

// ─── Colour palettes ──────────────────────────────────────────────────────────

const TYPE_COLORS = [
    '#6366f1', '#ef4444', '#f59e0b', '#10b981',
    '#3b82f6', '#f97316', '#8b5cf6', '#06b6d4', '#94a3b8',
]

const STATUS_COLOR: Record<string, string> = {
    Done: '#10b981',
    'In Progress': '#6366f1',
    'To Do': '#94a3b8',
}

const INV_COLORS = [
    '#60a5fa', '#34d399', '#fb923c', '#f472b6',
    '#a78bfa', '#94a3b8', '#fbbf24', '#2dd4bf', '#f87171',
]

const INVESTMENT_CATEGORY_COLORS: Record<string, string> = {
    'Revenue-Commit': '#52A2E8',
    'Strategic Innovation': '#4BD498',
    'Support': '#F6A280',
    'Sales Activation': '#F46C7E',
    'Scale & Reliability': '#A888C6',
    'Unassigned': '#AEB7BC',
    'Uncategorized': '#AEB7BC',
}

// ─── Shared helpers ───────────────────────────────────────────────────────────

function SectionTitle({ children, className = '' }: { children: React.ReactNode; className?: string }) {
    return (
        <h3 className={`text-sm font-semibold text-slate-700 flex items-center gap-2 ${className}`}>
            {children}
        </h3>
    )
}

function StatusChip({ status }: { status: string }) {
    const s = status.toLowerCase()
    const cls = s.includes('done') || s.includes('closed') || s.includes('complete')
        ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
        : s.includes('progress') || s.includes('review') || s.includes('testing')
            ? 'bg-indigo-50 text-indigo-700 border-indigo-200'
            : 'bg-slate-100 text-slate-600 border-slate-200'
    return (
        <span className={`inline-flex items-center px-2 py-0.5 text-[10px] font-semibold rounded-full border ${cls} whitespace-nowrap`}>
            {status}
        </span>
    )
}

function DataBanner({ message }: { message: string }) {
    return (
        <div className="flex items-start gap-2 p-2.5 rounded-lg bg-amber-50 border border-amber-200 text-amber-700 text-[11px]">
            <Info className="w-3.5 h-3.5 shrink-0 mt-0.5" />
            <span>{message}</span>
        </div>
    )
}

// ─── Ticket list modal ────────────────────────────────────────────────────────

const phase4Columns: ColumnDef<Phase4Issue>[] = [
    { header: 'Key', accessorKey: 'key' },
    { header: 'Summary', accessorKey: 'summary' },
    { header: 'Type', accessorKey: 'issueType' },
    { header: 'Status', cell: (item) => <StatusChip status={item.statusName} /> },
    { header: 'Created', cell: (item) => item.createdAt ? item.createdAt.slice(0, 10) : '—' },
    { header: 'Due', cell: (item) => item.dueDate ?? '—' },
]

// ─── Sprint Health drill-down types ───────────────────────────────────────────

interface SprintHealthIssue {
    jira_key: string
    summary: string
    status: string
    statusCategory: string
    issueType: string
    workstream: string
    storyPoints: number | null
    sprintCount: number
}

const sprintHealthColumns: ColumnDef<SprintHealthIssue>[] = [
    {
        header: 'Key',
        cell: (item) => (
            <a href={`https://prioritytechsupport.atlassian.net/browse/${item.jira_key}`} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline font-medium">
                {item.jira_key}
            </a>
        ),
    },
    { header: 'Summary', accessorKey: 'summary' },
    { header: 'Type', accessorKey: 'issueType' },
    { header: 'Status', cell: (item) => <StatusChip status={item.status} /> },
    { header: 'SP', cell: (item) => item.storyPoints != null ? String(item.storyPoints) : '—' },
    { header: 'Sprints', cell: (item) => String(item.sprintCount) },
]

// ─── Props ────────────────────────────────────────────────────────────────────

interface Props {
    dto: Phase4DTO
    filteredIssues: Phase4Issue[]  // kept for compat — overview ignores local filters
    filters: Phase4Filters         // kept for compat — overview ignores local filters
    setFilter: <K extends keyof Phase4Filters>(key: K, value: Phase4Filters[K]) => void
    isAdmin: boolean
}

// ─── Main component ───────────────────────────────────────────────────────────

export function OverviewTab({ dto }: Props) {
    const { overviewKpis: kpi, issues } = dto

    // Restrict all interactive/computed data to DEV_TYPES only
    const devIssues = useMemo(
        () => issues.filter(i => DEV_TYPES_LOWER_SET.has(i.issueType.toLowerCase())),
        [issues],
    )

    // ── Row 2: Donut type filter ──────────────────────────────────────────────
    const [donutTypeFilter, setDonutTypeFilter] = useState<string | null>(null)

    // ── Modal ─────────────────────────────────────────────────────────────────
    const [modal, setModal] = useState<{
        title: string; desc?: string; issues: Phase4Issue[]
    } | null>(null)

    // ── Sprint Health drill-down modal ────────────────────────────────────────
    const [sprintModal, setSprintModal] = useState<{
        title: string; issues: SprintHealthIssue[]
    } | null>(null)
    const [sprintModalLoading, setSprintModalLoading] = useState(false)

    const handleSprintBarClick = useCallback(async (sprintLabel: string, category: string, categoryLabel: string) => {
        // Strip the star prefix for active sprint
        const cleanLabel = sprintLabel.replace(/^★\s*/, '')
        setSprintModalLoading(true)
        setSprintModal({ title: `${categoryLabel} · ${cleanLabel}`, issues: [] })
        try {
            const res = await fetch(`/api/phase4/sprint-health-detail?sprintLabel=${encodeURIComponent(cleanLabel)}&category=${encodeURIComponent(category)}`)
            const data = await res.json()
            setSprintModal({ title: `${categoryLabel} · ${cleanLabel}`, issues: data.issues || [] })
        } catch {
            setSprintModal({ title: `${categoryLabel} · ${cleanLabel}`, issues: [] })
        } finally {
            setSprintModalLoading(false)
        }
    }, [])

    // ── AI ────────────────────────────────────────────────────────────────────
    const [aiLoading, setAiLoading] = useState(false)
    const [aiResult, setAiResult] = useState<string | null>(null)
    const [aiError, setAiError] = useState<string | null>(null)

    // Click-timing refs for single vs double click
    const donutTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
    const statusTimer = useRef<ReturnType<typeof setTimeout> | null>(null)

    // ── Row 2A: donut data ────────────────────────────────────────────────────
    const donutData = useMemo(() => dto.byType.slice(0, 8), [dto.byType])
    const donutTotal = useMemo(() => donutData.reduce((s, n) => s + n.count, 0), [donutData])

    // ── Row 2B: status breakdown — grouped + scoped by donut selection ───────
    const statusBreakdownData = useMemo(() => {
        // Only iterate issues relevant to the current donut filter
        const scope = donutTypeFilter
            ? devIssues.filter(i => i.issueType === donutTypeFilter)
            : devIssues

        // Aggregate by normalised group label
        const groups: Record<string, { label: string; category: 'Done' | 'In Progress' | 'To Do'; count: number; rawStatuses: Set<string> }> = {}
        for (const i of scope) {
            const { label, category } = normalizeStatus(i.statusName)
            if (!groups[label]) {
                groups[label] = { label, category, count: 0, rawStatuses: new Set() }
            }
            groups[label].count++
            groups[label].rawStatuses.add(i.statusName)
        }
        return Object.values(groups)
            .map(g => ({ status: g.label, category: g.category, count: g.count, rawStatuses: [...g.rawStatuses] }))
            .sort((a, b) => b.count - a.count)
    }, [donutTypeFilter, devIssues])

    const statusTotal = useMemo(
        () => statusBreakdownData.reduce((s, r) => s + r.count, 0),
        [statusBreakdownData],
    )

    // ── Row 3: Investment allocation ──────────────────────────────────────────
    const { investmentByMonth } = dto
    const last6MonthsInvestment = useMemo(() => investmentByMonth.slice(-6), [investmentByMonth])

    const allInvCategories = useMemo(() => {
        const cats = new Set<string>()
        for (const m of last6MonthsInvestment) Object.keys(m.categories).forEach(c => cats.add(c))

        return [...cats].sort((a, b) => {
            const isUnassigned = (s: string) => s.toLowerCase() === 'unassigned' || s.toLowerCase() === 'uncategorized'
            // To be at the BOTTOM of the Recharts stack, it needs to be the FIRST in the array
            if (isUnassigned(a) && !isUnassigned(b)) return -1
            if (!isUnassigned(a) && isUnassigned(b)) return 1
            return a.localeCompare(b)
        })
    }, [last6MonthsInvestment])

    // Normalise investment data to % per month for the stacked chart, but KEEP counts for tooltips
    const investmentChartData = useMemo(() =>
        last6MonthsInvestment.map(m => {
            const total = Object.values(m.categories).reduce((s, n) => s + n, 0)
            const row: any = {
                monthLabel: m.monthLabel,
                monthKey: m.monthKey,
                total
            }
            // Add percentages and counts for each category
            for (const cat of allInvCategories) {
                const count = m.categories[cat] || 0
                row[cat] = total > 0 ? Math.round((count / total) * 100) : 0
                row[`${cat}_count`] = count
            }
            return row
        }),
        [last6MonthsInvestment, allInvCategories])

    // ── Handlers: Donut ───────────────────────────────────────────────────────
    const handleDonutClick = useCallback((entry: { label: string }) => {
        if (donutTimer.current) {
            clearTimeout(donutTimer.current)
            donutTimer.current = null
            // Double click → modal (all statuses)
            const typeIssues = devIssues.filter(i => i.issueType === entry.label)
            setModal({
                title: `${entry.label}`,
                desc: 'All issues of this type (header filters applied)',
                issues: typeIssues,
            })
        } else {
            donutTimer.current = setTimeout(() => {
                donutTimer.current = null
                setDonutTypeFilter(prev => prev === entry.label ? null : entry.label)
            }, 250)
        }
    }, [devIssues])

    // ── Handlers: Status ──────────────────────────────────────────────────────
    const handleStatusClick = useCallback((groupLabel: string, rawStatuses: string[], isDouble: boolean) => {
        if (!isDouble) return
        const rawSet = new Set(rawStatuses)
        const statusIssues = devIssues.filter(i => {
            const matchStatus = rawSet.has(i.statusName)
            const matchType = !donutTypeFilter || i.issueType === donutTypeFilter
            return matchStatus && matchType
        })
        setModal({
            title: `Issues: ${groupLabel}`,
            desc: [
                donutTypeFilter ? `Type: ${donutTypeFilter}` : 'All types',
                rawStatuses.length > 1 ? `Statuses: ${rawStatuses.join(', ')}` : '',
            ].filter(Boolean).join(' · '),
            issues: statusIssues,
        })
    }, [devIssues, donutTypeFilter])

    const handleStatusRowClick = useCallback((status: string, rawStatuses: string[]) => {
        if (statusTimer.current) {
            clearTimeout(statusTimer.current)
            statusTimer.current = null
            handleStatusClick(status, rawStatuses, true)
        } else {
            statusTimer.current = setTimeout(() => {
                statusTimer.current = null
                handleStatusClick(status, rawStatuses, false)
            }, 250)
        }
    }, [handleStatusClick])

    // ── Handlers: Investment bar ──────────────────────────────────────────────
    const handleInvBarClick = useCallback((monthKey: string, category: string) => {
        const monthIssues = devIssues.filter(i => {
            let dateStr: string | null = null

            // If the ticket has sprints, use the last active or latest sprint
            if (Array.isArray(i.sprintRaw) && i.sprintRaw.length > 0) {
                const activeSprint = i.sprintRaw.find((s: any) => s.state === 'active')
                const sprint = activeSprint || i.sprintRaw[i.sprintRaw.length - 1]
                dateStr = sprint.endDate || sprint.startDate || null
            }

            if (!dateStr) {
                if (i.statusCategory === 'Done') dateStr = i.updatedAt ?? i.dueDate
                else if (i.statusCategory === 'In Progress') dateStr = i.updatedAt ?? i.createdAt
                else dateStr = i.createdAt
            }

            const mk = dateStr ? dateStr.slice(0, 7) : null
            const itemCat = (i.investmentCategory || 'Unassigned').trim().toLowerCase()
            const targetCat = category.trim().toLowerCase()

            return mk === monthKey && itemCat === targetCat
        })
        const monthData = investmentByMonth.find(m => m.monthKey === monthKey)
        setModal({
            title: `${category} — ${monthData?.monthLabel ?? monthKey}`,
            desc: 'Issues attributed to this category in this month',
            issues: monthIssues,
        })
    }, [devIssues, investmentByMonth])

    // ── AI Analysis ───────────────────────────────────────────────────────────
    const handleAnalyze = useCallback(async () => {
        setAiLoading(true)
        setAiError(null)
        setAiResult(null)
        try {
            const payload = {
                workstream: dto.workstream,
                team: dto.team,
                total: kpi.workItemsTotal,
                done: kpi.workItemsDone,
                completionRate: kpi.completionRate,
                completionWoWDelta: kpi.completionWoWDelta,
                completionWoWPct: kpi.completionWoWPct,
                completionMoMDelta: kpi.completionMoMDelta,
                completionMoMPct: kpi.completionMoMPct,
                inProgress: kpi.inProgressCount,
                backlog: kpi.backlogCount,
                avgBacklogAgeDays: kpi.avgBacklogAgeDays,
                notInStandardStatusCount: kpi.notInStandardStatusCount,
                stories: kpi.stories,
                bugsHotfix: kpi.bugsHotfix,
                tasks: kpi.tasks,
                other: kpi.other,
                topStatuses: dto.allStatuses.slice(0, 6),
                topInvestment: dto.byInvestment.slice(0, 5),
            }
            const res = await fetch('/api/phase4/analyze', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(payload),
            })
            if (!res.ok) {
                const err = await res.json().catch(() => ({}))
                throw new Error((err as { error?: string }).error ?? `API error ${res.status}`)
            }
            const json = await res.json() as { analysis?: string }
            setAiResult(json.analysis ?? 'No analysis returned.')
        } catch (e: unknown) {
            setAiError(e instanceof Error ? e.message : 'Unknown error')
        } finally {
            setAiLoading(false)
        }
    }, [dto, kpi])

    // ── Sprint Health ─────────────────────────────────────────────────────────
    const [sprintMode, setSprintMode] = useState<'points' | 'issues'>('points')

    const sprintChartData = useMemo(() => {
        // Two stacked bars per sprint:
        //
        // BAR 1 — Scope (stackId="scope"), bottom → top:
        //   Carryover 2x+      = issues in 3+ sprints         (RED)
        //   Carryover           = issues in exactly 2 sprints  (ORANGE)
        //   Committed           = first-sprint issues, NOT added mid-sprint (LIGHT BLUE)
        //   Added Mid-Sprint    = issues added after sprint started (YELLOW) — 0 until counters exist
        //
        // BAR 2 — Output (stackId="output"), bottom → top:
        //   Completed           = done issues   (GREEN)
        //   Removed             = removed mid-sprint (TRANSPARENT YELLOW) — 0 until counters exist
        return dto.sprintHealth.map(s => {
            const isPoints = sprintMode === 'points'
            const newlyCommitted = isPoints ? s.pointsNewlyCommitted : s.issuesNewlyCommitted
            const completed = isPoints ? s.pointsCompleted : s.issuesCompleted
            const carryoverRaw = isPoints ? s.pointsCarryover : s.issuesCarryover
            const carryover2x = isPoints ? s.pointsCarryover2xPlus : s.issuesCarryover2xPlus
            const carryoverOnce = Math.max(0, carryoverRaw - carryover2x)
            // TODO: replace 0 with real data when counters are available
            const addedMidSprint = 0
            const removed = 0
            const scopeTotal = carryover2x + carryoverOnce + newlyCommitted + addedMidSprint
            const outputTotal = completed + removed
            return {
                sprint: s.sprintState === 'active' ? `★ ${s.sprintLabel}` : s.sprintLabel,
                'Carryover 2x+': carryover2x,
                'Carryover': carryoverOnce,
                'Committed': newlyCommitted,
                'Added Mid-Sprint': addedMidSprint,
                'Completed': completed,
                'Removed': removed,
                _scopeTotal: scopeTotal > 0 ? scopeTotal : null,
                _outputTotal: outputTotal > 0 ? outputTotal : null,
            }
        })
    }, [dto.sprintHealth, sprintMode])

    // ── Workstream breakdown (contributors proxy) ─────────────────────────────
    const wsBreakdown = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const i of devIssues) {
            const ws = i.workstream || 'Unassigned'
            counts[ws] = (counts[ws] || 0) + 1
        }
        const entries = Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
        const total = entries.reduce((s, [, n]) => s + n, 0)
        return { entries, total }
    }, [devIssues])

    // ─────────────────────────────────────────────────────────────────────────
    return (
        <div className="space-y-5">

            {/* ═══════════════════════════════════════════════════════════════
                ROW 1 — KPI Cards (7 cards)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-7 gap-3">

                {/* A) Completion Rate */}
                <DashboardCard
                    id="ov-completion"
                    label="Completion Rate"
                    icon={CheckCircle2}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50"
                    accentHex="#10b981"
                    value={kpi.workItemsDone}
                    valueSuffix={kpi.completionRate}
                    deltaAbsolute={kpi.completionWoWDelta}
                    deltaPercent={kpi.completionWoWPct}
                    onClick={() => setModal({
                        title: 'Completed Work Items',
                        issues: devIssues.filter(i => i.statusCategory === 'Done'),
                    })}
                    metrics={[
                        {
                            label: 'Completed',
                            value: `${kpi.workItemsDone} / ${kpi.workItemsTotal}`,
                        },
                        {
                            label: 'MoM',
                            value: `${kpi.completionMoMDelta >= 0 ? '+' : ''}${kpi.completionMoMDelta} (${kpi.completionMoMPct >= 0 ? '+' : ''}${kpi.completionMoMPct}%)`,
                        },
                    ]}
                />

                {/* B) In Progress */}
                <DashboardCard
                    id="ov-inprogress"
                    label="In Progress"
                    icon={Clock}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50"
                    accentHex="#6366f1"
                    value={kpi.inProgressCount}
                    valueSuffix={kpi.workItemsTotal > 0 ? Math.round((kpi.inProgressCount / kpi.workItemsTotal) * 100) : 0}
                    deltaAbsolute={kpi.inProgressWoWDelta}
                    deltaPercent={kpi.inProgressWoWPct}
                    onClick={() => setModal({
                        title: 'Work Items In Progress',
                        issues: devIssues.filter(i => i.statusCategory === 'In Progress'),
                    })}
                    metrics={[
                        { label: 'In active sprint', value: '—' },
                        { label: 'Avg sprints to resolve', value: '—' },
                    ]}
                />

                {/* C) Backlog */}
                <DashboardCard
                    id="ov-backlog"
                    label="Backlog"
                    icon={Circle}
                    iconColor="text-slate-500"
                    iconBg="bg-slate-100"
                    accentHex="#94a3b8"
                    value={kpi.backlogCount}
                    valueSuffix={kpi.workItemsTotal > 0 ? Math.round((kpi.backlogCount / kpi.workItemsTotal) * 100) : 0}
                    deltaAbsolute={kpi.backlogWoWDelta}
                    deltaPercent={kpi.backlogWoWPct}
                    inverseGood
                    onClick={() => setModal({
                        title: 'Backlog Work Items',
                        issues: devIssues.filter(i => i.statusCategory === 'To Do'),
                    })}
                    metrics={[
                        {
                            label: 'Non-standard status',
                            value: kpi.notInStandardStatusCount,
                            isAlert: kpi.notInStandardStatusCount > 0,
                        },
                        {
                            label: 'Avg age (days)',
                            value: kpi.avgBacklogAgeDays !== null ? kpi.avgBacklogAgeDays : '—',
                        },
                    ]}
                />

                {/* D) Stories */}
                <DashboardCard
                    id="ov-stories"
                    label="Stories"
                    icon={BookOpen}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50"
                    accentHex="#10b981"
                    value={kpi.stories.total}
                    valueSuffix={kpi.stories.pct}
                    deltaAbsolute={kpi.stories.wowDelta}
                    deltaPercent={kpi.stories.wowPct}
                    onClick={() => setModal({
                        title: 'Stories',
                        issues: devIssues.filter(i => i.issueType.toLowerCase() === 'story'),
                    })}
                    metrics={[
                        {
                            label: 'Completed',
                            value: `${kpi.stories.completedCount} (${kpi.stories.completedPct}%)`,
                        },
                        {
                            label: 'Avg age to complete',
                            value: kpi.stories.avgAgeDays !== null ? `${kpi.stories.avgAgeDays}d` : '—',
                        },
                    ]}
                />

                {/* E) Bugs / Hot Fix */}
                <DashboardCard
                    id="ov-bugs"
                    label="Bugs / Hot Fix"
                    icon={Bug}
                    iconColor="text-rose-600"
                    iconBg="bg-rose-50"
                    accentHex="#ef4444"
                    value={kpi.bugsHotfix.total}
                    valueSuffix={kpi.bugsHotfix.pct}
                    deltaAbsolute={kpi.bugsHotfix.wowDelta}
                    deltaPercent={kpi.bugsHotfix.wowPct}
                    inverseGood
                    onClick={() => setModal({
                        title: 'Bugs & Hot Fixes',
                        issues: devIssues.filter(i => i.issueType.toLowerCase() === 'bug' || i.issueType.toLowerCase() === 'hot fix' || i.issueType.toLowerCase() === 'hotfix'),
                    })}
                    metrics={[
                        {
                            label: 'Completed',
                            value: `${kpi.bugsHotfix.completedCount} (${kpi.bugsHotfix.completedPct}%)`,
                        },
                        {
                            label: 'Avg age to complete',
                            value: kpi.bugsHotfix.avgAgeDays !== null ? `${kpi.bugsHotfix.avgAgeDays}d` : '—',
                        },
                    ]}
                />

                {/* F) Task */}
                <DashboardCard
                    id="ov-task"
                    label="Task"
                    icon={ListTodo}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-50"
                    accentHex="#f59e0b"
                    value={kpi.tasks.total}
                    valueSuffix={kpi.tasks.pct}
                    deltaAbsolute={kpi.tasks.wowDelta}
                    deltaPercent={kpi.tasks.wowPct}
                    onClick={() => setModal({
                        title: 'Tasks',
                        issues: devIssues.filter(i => i.issueType.toLowerCase() === 'task'),
                    })}
                    metrics={[
                        {
                            label: 'Completed',
                            value: `${kpi.tasks.completedCount} (${kpi.tasks.completedPct}%)`,
                        },
                        {
                            label: 'Avg age to complete',
                            value: kpi.tasks.avgAgeDays !== null ? `${kpi.tasks.avgAgeDays}d` : '—',
                        },
                    ]}
                />

                {/* G) Other */}
                <DashboardCard
                    id="ov-other"
                    label="Other"
                    icon={MoreHorizontal}
                    iconColor="text-purple-600"
                    iconBg="bg-purple-50"
                    accentHex="#8b5cf6"
                    value={kpi.other.total}
                    valueSuffix={kpi.other.pct}
                    deltaAbsolute={kpi.other.wowDelta}
                    deltaPercent={kpi.other.wowPct}
                    onClick={() => setModal({
                        title: 'Other Issue Types',
                        issues: devIssues.filter(i => {
                            const t = i.issueType.toLowerCase()
                            return t !== 'story' && t !== 'bug' && t !== 'hot fix' && t !== 'hotfix' && t !== 'task'
                        }),
                    })}
                    metrics={[
                        {
                            label: 'Completed',
                            value: `${kpi.other.completedCount} (${kpi.other.completedPct}%)`,
                        },
                        {
                            label: 'Avg age to complete',
                            value: kpi.other.avgAgeDays !== null ? `${kpi.other.avgAgeDays}d` : '—',
                        },
                    ]}
                />
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW 2 — Not Completed Donut + Status Breakdown
            ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-5 gap-4">

                {/* 2A) Donut — not-done dev items by type */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
                    <div className="flex items-center justify-between mb-1 shrink-0">
                        <SectionTitle>
                            <Layers className="w-4 h-4 text-indigo-500" />
                            Issue Type Distribution
                        </SectionTitle>
                        {donutTypeFilter && (
                            <button
                                onClick={() => setDonutTypeFilter(null)}
                                className="flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 bg-indigo-50 px-2 py-0.5 rounded-full transition-colors"
                            >
                                <X className="w-3 h-3" /> {donutTypeFilter}
                            </button>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-400 mb-6 shrink-0">
                        All statuses included &nbsp;·&nbsp; Click to filter Status Breakdown &nbsp;·&nbsp; Double-click to view tickets
                    </p>

                    {donutData.length > 0 ? (
                        <div className="flex-1 flex items-center justify-between min-h-[160px] pr-4">
                            {/* Donut Chart (Left) */}
                            <div className="relative w-[180px] h-[180px] shrink-0">
                                <ResponsiveContainer width="100%" height="100%">
                                    <PieChart>
                                        <Pie
                                            data={donutData}
                                            cx="50%"
                                            cy="50%"
                                            innerRadius={55}
                                            outerRadius={75}
                                            paddingAngle={5}
                                            dataKey="count"
                                            nameKey="label"
                                            cornerRadius={8}
                                            stroke="none"
                                            onClick={(entry) => handleDonutClick({ label: entry.label as string })}
                                            className="cursor-pointer outline-none hover:opacity-80 transition-opacity"
                                        >
                                            {donutData.map((entry, idx) => (
                                                <Cell
                                                    key={idx}
                                                    fill={TYPE_COLORS[idx % TYPE_COLORS.length]}
                                                    opacity={donutTypeFilter && donutTypeFilter !== entry.label ? 0.3 : 1}
                                                />
                                            ))}
                                        </Pie>
                                        <RTooltip
                                            formatter={(v) => [`${v} tickets`, 'Count']}
                                            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                        />
                                    </PieChart>
                                </ResponsiveContainer>
                                {/* Center total */}
                                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                    <span className="text-2xl font-bold text-slate-800 leading-none">{donutTotal}</span>
                                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-1">Total</span>
                                </div>
                            </div>

                            {/* Custom Legend (Right) */}
                            <div className="flex-1 grid grid-cols-1 gap-y-2.5 pl-10">
                                {donutData.map((d, idx) => (
                                    <div
                                        key={d.label}
                                        onClick={() => handleDonutClick({ label: d.label })}
                                        className={`flex items-center justify-between group cursor-pointer transition-all ${donutTypeFilter === d.label ? 'scale-[1.02]' : ''
                                            }`}
                                    >
                                        <div className="flex items-center gap-2.5 overflow-hidden">
                                            <span
                                                className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                                                style={{ backgroundColor: TYPE_COLORS[idx % TYPE_COLORS.length] }}
                                            />
                                            <span className={`text-[12px] whitespace-nowrap transition-colors ${donutTypeFilter === d.label ? 'text-indigo-600 font-bold' : 'text-slate-600 group-hover:text-slate-900 group-hover:font-medium'
                                                }`}>
                                                {d.label}
                                            </span>
                                        </div>
                                        <span className={`text-[12px] font-semibold tabular-nums ml-auto pl-4 ${donutTypeFilter === d.label ? 'text-indigo-700' : 'text-slate-700'
                                            }`}>
                                            {d.count}
                                        </span>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div className="flex items-center justify-center py-12 text-slate-400 text-sm flex-1">
                            All work items completed — nothing to show
                        </div>
                    )}
                </div>

                {/* 2B) Status Breakdown */}
                <div className="lg:col-span-2 bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <SectionTitle className="mb-1">
                        Status Breakdown
                        {donutTypeFilter && (
                            <span className="text-[10px] font-normal text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded-full border border-indigo-200 ml-1">
                                {donutTypeFilter}
                            </span>
                        )}
                    </SectionTitle>
                    <p className="text-[11px] text-slate-400 mb-3">Click to open · Double-click to see tickets</p>

                    <div className="space-y-2.5">
                        {statusBreakdownData.slice(0, 12).map(s => {
                            const barWidth = statusTotal > 0 ? Math.round((s.count / statusTotal) * 100) : 0
                            const barColor = STATUS_COLOR[s.category] ?? '#6366f1'
                            return (
                                <button
                                    key={s.status}
                                    className="w-full text-left group"
                                    onClick={() => handleStatusRowClick(s.status, s.rawStatuses)}
                                    onDoubleClick={() => handleStatusClick(s.status, s.rawStatuses, true)}
                                >
                                    <div className="flex justify-between text-xs mb-1">
                                        <span className="font-medium text-slate-700 group-hover:text-indigo-700 transition-colors truncate max-w-[65%]">
                                            {s.status}
                                        </span>
                                        <span className="text-slate-500 shrink-0">{s.count} · {barWidth}%</span>
                                    </div>
                                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                                        <div
                                            className="h-full rounded-full transition-all duration-500"
                                            style={{ width: `${barWidth}%`, background: barColor }}
                                        />
                                    </div>
                                </button>
                            )
                        })}
                        {statusBreakdownData.length === 0 && (
                            <p className="text-sm text-slate-400 text-center py-6">No data</p>
                        )}
                    </div>

                    <div className="mt-3 pt-3 border-t border-slate-100 text-xs text-slate-500 flex justify-between">
                        <span>Total</span>
                        <span className="font-semibold text-slate-700">{statusTotal}</span>
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW 3 — Investment Allocation (stacked monthly bars)
            ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                <SectionTitle className="mb-0.5">
                    <Layers className="w-4 h-4 text-indigo-500" />
                    Investment Allocations
                </SectionTitle>
                <p className="text-[11px] text-slate-400 mb-4">
                    % allocation by month · Click a segment to view matching tickets
                </p>

                {investmentByMonth.length > 0 ? (
                    <ResponsiveContainer width="100%" height={280}>
                        <BarChart
                            data={investmentChartData.map(m => ({
                                ...m,
                                month: m.monthLabel,
                            }))}
                            margin={{ top: 4, right: 8, left: 0, bottom: 4 }}
                            barCategoryGap="15%"
                        >
                            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                            <XAxis
                                dataKey="month"
                                tick={{ fontSize: 10, fill: '#64748b' }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <YAxis
                                tickFormatter={v => `${v}%`}
                                domain={[0, 100]}
                                ticks={[0, 25, 50, 75, 100]}
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                width={36}
                            />
                            <RTooltip
                                formatter={(value, name, props) => {
                                    const count = props.payload[`${name}_count`] || 0
                                    return [`${count} tickets (${value}%)`, String(name)]
                                }}
                                contentStyle={{
                                    fontSize: 11,
                                    borderRadius: 12,
                                    border: 'none',
                                    boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)'
                                }}
                                cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                            />
                            <Legend
                                layout="vertical"
                                align="right"
                                verticalAlign="middle"
                                iconType="square"
                                iconSize={10}
                                formatter={value => (
                                    <span style={{ fontSize: 11, color: '#475569' }}>{value}</span>
                                )}
                                wrapperStyle={{ paddingLeft: 20 }}
                            />
                            {allInvCategories.map((cat, idx) => {
                                const isUnassigned = cat.toLowerCase() === 'unassigned' || cat.toLowerCase() === 'uncategorized'
                                return (
                                    <Bar
                                        key={cat}
                                        dataKey={cat}
                                        stackId="inv"
                                        fill={INVESTMENT_CATEGORY_COLORS[cat] || (isUnassigned ? '#AEB7BC' : INV_COLORS[idx % INV_COLORS.length])}
                                        name={cat}
                                        onClick={(data) => {
                                            // Ensure we extract the monthKey correctly from the entry payload
                                            const payload = (data as any)?.payload || data
                                            const mk = payload?.monthKey
                                            if (mk) handleInvBarClick(mk, cat)
                                        }}
                                        className="cursor-pointer transition-opacity hover:opacity-90"
                                    >
                                        <LabelList
                                            dataKey={cat}
                                            position="center"
                                            style={{ fill: 'white', fontSize: 11, fontWeight: 600 }}
                                            formatter={(v) => (typeof v === 'number' && v >= 7) ? `${v}%` : ''}
                                        />
                                    </Bar>
                                )
                            })}
                        </BarChart>
                    </ResponsiveContainer>
                ) : (
                    <div className="flex items-center justify-center py-12 text-slate-400 text-sm">
                        No investment allocation data available
                    </div>
                )}
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW 4 — Sprint Health + Contributors
            ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 lg:grid-cols-10 gap-4">

                {/* 4A) Sprint Health */}
                <div className="lg:col-span-7 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col">
                    {/* Header */}
                    <div className="flex items-center justify-between mb-1 shrink-0">
                        <SectionTitle>
                            <Zap className="w-4 h-4 text-amber-500" />
                            Sprint Health
                        </SectionTitle>
                        {dto.sprintHealth.length > 0 && (
                            <div className="flex rounded-lg border border-slate-200 overflow-hidden text-[11px]">
                                <button
                                    onClick={() => setSprintMode('points')}
                                    className={`px-3 py-1.5 font-medium transition-colors ${sprintMode === 'points'
                                        ? 'bg-slate-700 text-white'
                                        : 'bg-white text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    Points
                                </button>
                                <button
                                    onClick={() => setSprintMode('issues')}
                                    className={`px-3 py-1.5 font-medium transition-colors border-l border-slate-200 ${sprintMode === 'issues'
                                        ? 'bg-slate-700 text-white'
                                        : 'bg-white text-slate-500 hover:bg-slate-50'
                                        }`}
                                >
                                    Issues
                                </button>
                            </div>
                        )}
                    </div>
                    <p className="text-[11px] text-slate-400 mb-2 shrink-0">
                        {sprintMode === 'points' ? 'Story Points' : 'Issue count'} per sprint · Active + 5 previous
                    </p>

                    {dto.sprintHealth.length === 0 ? (
                        <DataBanner message="Sprint snapshot data not available. Ensure phase4_sprint_health_snapshot is populated." />
                    ) : (
                        <div className="flex-1 min-h-0" style={{ minHeight: 340 }}>
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart
                                    data={sprintChartData}
                                    margin={{ top: 28, right: 8, left: 18, bottom: 8 }}
                                    barCategoryGap="18%"
                                    barGap={2}
                                >
                                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                                    <XAxis
                                        dataKey="sprint"
                                        tick={{ fontSize: 12, fill: '#334155' }}
                                        axisLine={false}
                                        tickLine={false}
                                        interval={0}
                                        height={28}
                                    />
                                    <YAxis
                                        tick={{ fontSize: 10, fill: '#94a3b8' }}
                                        axisLine={false}
                                        tickLine={false}
                                        width={36}
                                        label={{
                                            value: sprintMode === 'points' ? 'Story Points' : 'Issues',
                                            angle: -90,
                                            position: 'insideLeft',
                                            offset: 4,
                                            style: { fontSize: 10, fill: '#94a3b8' },
                                        }}
                                    />
                                    <RTooltip
                                        contentStyle={{
                                            fontSize: 11,
                                            borderRadius: 8,
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.07)',
                                        }}
                                        cursor={{ fill: 'rgba(99,102,241,0.04)' }}
                                    />
                                    <Legend
                                        layout="horizontal"
                                        align="center"
                                        verticalAlign="bottom"
                                        iconType="square"
                                        iconSize={10}
                                        formatter={value => (
                                            <span style={{ fontSize: 11, color: '#475569' }}>{value}</span>
                                        )}
                                        wrapperStyle={{ paddingTop: 4 }}
                                    />

                                    {/* ── BAR 1: Scope stack (bottom → top) ────────── */}
                                    {/* Carryover 2x+ — RED */}
                                    <Bar dataKey="Carryover 2x+" stackId="scope" fill="#ef4444" name="Carryover 2x+" maxBarSize={56} cursor="pointer"
                                        onClick={(d: any) => d?.sprint && handleSprintBarClick(d.sprint, 'carryover2x', 'Carryover 2x+')}
                                    >
                                        <LabelList
                                            dataKey="Carryover 2x+"
                                            position="center"
                                            style={{ fill: 'white', fontSize: 9, fontWeight: 700 }}
                                            formatter={(v: unknown) => (typeof v === 'number' && v >= 2) ? String(v) : ''}
                                        />
                                    </Bar>
                                    {/* Carryover — ORANGE */}
                                    <Bar dataKey="Carryover" stackId="scope" fill="#f97316" name="Carryover" maxBarSize={56} cursor="pointer"
                                        onClick={(d: any) => d?.sprint && handleSprintBarClick(d.sprint, 'carryover', 'Carryover')}
                                    >
                                        <LabelList
                                            dataKey="Carryover"
                                            position="center"
                                            style={{ fill: 'white', fontSize: 9, fontWeight: 700 }}
                                            formatter={(v: unknown) => (typeof v === 'number' && v >= 2) ? String(v) : ''}
                                        />
                                    </Bar>
                                    {/* Committed — LIGHT BLUE */}
                                    <Bar dataKey="Committed" stackId="scope" fill="#93c5fd" name="Committed" maxBarSize={56} cursor="pointer"
                                        onClick={(d: any) => d?.sprint && handleSprintBarClick(d.sprint, 'committed', 'Committed')}
                                    >
                                        <LabelList
                                            dataKey="Committed"
                                            position="center"
                                            style={{ fill: '#1e3a8a', fontSize: 9, fontWeight: 700 }}
                                            formatter={(v: unknown) => (typeof v === 'number' && v >= 2) ? String(v) : ''}
                                        />
                                    </Bar>
                                    {/* Added Mid-Sprint — YELLOW (topmost scope bar, carries total label) */}
                                    <Bar dataKey="Added Mid-Sprint" stackId="scope" fill="#facc15" name="Added Mid-Sprint" maxBarSize={56} radius={[3, 3, 0, 0]} cursor="pointer"
                                        onClick={(d: any) => d?.sprint && handleSprintBarClick(d.sprint, 'addedMidSprint', 'Added Mid-Sprint')}
                                    >
                                        <LabelList
                                            dataKey="Added Mid-Sprint"
                                            position="center"
                                            style={{ fill: '#713f12', fontSize: 9, fontWeight: 700 }}
                                            formatter={(v: unknown) => (typeof v === 'number' && v >= 2) ? String(v) : ''}
                                        />
                                        <LabelList
                                            dataKey="_scopeTotal"
                                            position="top"
                                            style={{ fill: '#0f172a', fontSize: 10, fontWeight: 800 }}
                                            formatter={(v: unknown) => (typeof v === 'number' && v > 0) ? String(v) : ''}
                                        />
                                    </Bar>

                                    {/* ── BAR 2: Output stack (bottom → top) ────────── */}
                                    {/* Completed — GREEN */}
                                    <Bar dataKey="Completed" stackId="output" fill="#22c55e" name="Completed" maxBarSize={56} cursor="pointer"
                                        onClick={(d: any) => d?.sprint && handleSprintBarClick(d.sprint, 'completed', 'Completed')}
                                    >
                                        <LabelList
                                            dataKey="Completed"
                                            position="center"
                                            style={{ fill: 'white', fontSize: 9, fontWeight: 700 }}
                                            formatter={(v: unknown) => (typeof v === 'number' && v >= 2) ? String(v) : ''}
                                        />
                                    </Bar>
                                    {/* Removed — TRANSPARENT YELLOW (topmost output bar, carries total label) */}
                                    <Bar dataKey="Removed" stackId="output" fill="rgba(250, 204, 21, 0.4)" name="Removed" maxBarSize={56} radius={[3, 3, 0, 0]} cursor="pointer"
                                        onClick={(d: any) => d?.sprint && handleSprintBarClick(d.sprint, 'removed', 'Removed')}
                                    >
                                        <LabelList
                                            dataKey="Removed"
                                            position="center"
                                            style={{ fill: '#713f12', fontSize: 9, fontWeight: 700 }}
                                            formatter={(v: unknown) => (typeof v === 'number' && v >= 2) ? String(v) : ''}
                                        />
                                        <LabelList
                                            dataKey="_outputTotal"
                                            position="top"
                                            style={{ fill: '#15803d', fontSize: 10, fontWeight: 800 }}
                                            formatter={(v: unknown) => (typeof v === 'number' && v > 0) ? String(v) : ''}
                                        />
                                    </Bar>
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* 4B) Contributors */}
                <div className="lg:col-span-3 bg-white border border-slate-200 rounded-xl p-4 shadow-sm flex flex-col max-h-[420px]">
                    <SectionTitle className="mb-3 shrink-0">
                        <Users className="w-4 h-4 text-indigo-500" />
                        Contributors
                    </SectionTitle>

                    {dto.contributors && dto.contributors.length > 0 ? (
                        <div className="flex-1 overflow-y-auto pr-2 -mr-2 custom-scrollbar">
                            <table className="w-full text-left border-collapse pb-2">
                                <thead className="sticky top-0 bg-white z-10 shadow-sm border-b border-slate-100">
                                    <tr>
                                        <th className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider py-2 font-inter bg-white">Assignee</th>
                                        <th className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider py-2 text-right bg-white">Tickets</th>
                                        <th className="font-semibold text-[11px] text-slate-400 uppercase tracking-wider py-2 text-right pr-2 bg-white">SP</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-slate-50">
                                    {dto.contributors.map((c) => (
                                        <tr key={c.accountId} className="group hover:bg-slate-50/80 transition-colors">
                                            <td className="py-2.5">
                                                <div className="flex items-center gap-2.5">
                                                    {c.avatarUrl ? (
                                                        <img src={c.avatarUrl} alt={c.displayName || 'Avatar'} className="w-7 h-7 rounded-full object-cover shadow-sm bg-white border border-slate-100 shrink-0" />
                                                    ) : (
                                                        <div className="w-7 h-7 rounded-full bg-indigo-50 flex items-center justify-center text-[10px] font-bold text-indigo-600 border border-indigo-100 shrink-0">
                                                            {(c.displayName || '?').charAt(0).toUpperCase()}
                                                        </div>
                                                    )}
                                                    <span className="text-slate-700 font-medium text-xs truncate max-w-[130px]" title={c.displayName || 'Unknown'}>
                                                        {c.displayName || 'Unknown'}
                                                    </span>
                                                </div>
                                            </td>
                                            <td className="py-2.5 text-right font-medium text-slate-600 text-[11px]">
                                                {c.ticketsCount > 0 ? c.ticketsCount : '—'}
                                            </td>
                                            <td className="py-2.5 text-right pr-2">
                                                <span className="text-slate-800 text-xs font-bold">
                                                    {c.storyPointsTotal > 0 ? c.storyPointsTotal : '—'}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <div className="flex flex-col flex-1 items-center justify-center text-slate-400 text-sm py-8">
                            <Users className="w-8 h-8 text-slate-200 mb-2" />
                            <p>No contributors found</p>
                        </div>
                    )}
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW 5 — Sprint to Solve + PR Metrics
            ═══════════════════════════════════════════════════════════════ */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

                {/* 5A) Sprint to Solve */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <SectionTitle className="mb-3">
                        <Zap className="w-4 h-4 text-amber-500" />
                        Sprint to Solve
                    </SectionTitle>
                    <DataBanner message="Sprint membership required. Add sprint_name to jira_issues to compute avg sprints to resolve." />
                    <div className="mt-4 grid grid-cols-2 gap-3">
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center">
                            <div className="text-2xl font-bold text-slate-300">—</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">Avg sprints to resolve</div>
                        </div>
                        <div className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center">
                            <div className="text-2xl font-bold text-slate-800">
                                {kpi.stories.avgAgeDays !== null ? `${kpi.stories.avgAgeDays}d` : '—'}
                            </div>
                            <div className="text-[10px] text-slate-500 mt-0.5">Avg age to complete (Stories)</div>
                        </div>
                    </div>
                </div>

                {/* 5B) PR Metrics */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-sm">
                    <SectionTitle className="mb-3">
                        <GitPullRequest className="w-4 h-4 text-indigo-500" />
                        Pull Request Metrics
                    </SectionTitle>
                    <DataBanner message="Development field (PR links) not stored in jira_issues. GitHub integration or development field sync required to enable PR metrics." />
                    <div className="mt-4 grid grid-cols-3 gap-3">
                        {['Tickets w/ PR', 'Open PRs', 'Avg commits'].map(label => (
                            <div key={label} className="bg-slate-50 rounded-lg border border-slate-200 p-3 text-center">
                                <div className="text-xl font-bold text-slate-300">—</div>
                                <div className="text-[10px] text-slate-400 mt-0.5">{label}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* ═══════════════════════════════════════════════════════════════
                ROW 6 — AI Analysis
            ═══════════════════════════════════════════════════════════════ */}
            <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm">
                <div className="flex items-center justify-between mb-3">
                    <SectionTitle>
                        <Sparkles className="w-4 h-4 text-violet-500" />
                        AI Analysis
                    </SectionTitle>
                    <button
                        onClick={handleAnalyze}
                        disabled={aiLoading}
                        className="flex items-center gap-2 px-4 py-1.5 text-sm font-medium bg-violet-600 hover:bg-violet-700 disabled:opacity-60 disabled:cursor-not-allowed text-white rounded-lg transition-colors"
                    >
                        <Sparkles className="w-3.5 h-3.5" />
                        {aiLoading ? 'Analyzing…' : 'Analyze'}
                    </button>
                </div>

                {!aiLoading && !aiResult && !aiError && (
                    <p className="text-sm text-slate-400 text-center py-8">
                        Click &ldquo;Analyze&rdquo; to generate an AI-powered analysis of current metrics,
                        sprint hygiene risks, and recommended actions.
                    </p>
                )}

                {aiLoading && (
                    <div className="flex items-center justify-center py-10 gap-3 text-slate-500">
                        <div className="w-5 h-5 border-2 border-violet-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Generating analysis…</span>
                    </div>
                )}

                {aiError && (
                    <div className="flex items-center gap-2 p-3 bg-rose-50 border border-rose-200 rounded-lg text-rose-700 text-sm">
                        <AlertTriangle className="w-4 h-4 shrink-0" />
                        {aiError}
                    </div>
                )}

                {aiResult && (
                    <div className="prose prose-sm max-w-none text-slate-700 leading-relaxed whitespace-pre-wrap text-sm border border-violet-100 rounded-lg p-4 bg-violet-50/30">
                        {aiResult}
                    </div>
                )}
            </div>

            {/* ─── Global ticket modal ──────────────────────────────────────── */}
            {modal && (
                <IssueListModal
                    key={modal.title}
                    open
                    onOpenChange={(op) => { if (!op) setModal(null) }}
                    title={modal.title}
                    data={modal.issues}
                    columns={phase4Columns}
                    statusKey="statusName"
                />
            )}

            {/* ─── Sprint Health drill-down modal ─────────────────────────────── */}
            {sprintModal && (
                <IssueListModal
                    key={sprintModal.title}
                    open
                    onOpenChange={(op) => { if (!op) setSprintModal(null) }}
                    title={sprintModalLoading ? `${sprintModal.title} (loading…)` : sprintModal.title}
                    data={sprintModal.issues}
                    columns={sprintHealthColumns}
                    statusKey="status"
                    workstreamKey="workstream"
                />
            )}
        </div>
    )
}
