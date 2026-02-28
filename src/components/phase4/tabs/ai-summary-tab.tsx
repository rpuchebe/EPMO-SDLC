'use client'

import React, { useMemo } from 'react'
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, CheckCircle2, ArrowRight, BarChart2, Zap } from 'lucide-react'
import type { Phase4DTO, Phase4Issue, Phase4Filters } from '../phase4-content'

// ─── Types ────────────────────────────────────────────────────────────────────

type InsightSeverity = 'positive' | 'warning' | 'critical' | 'neutral'

interface Insight {
    severity: InsightSeverity
    category: string
    headline: string
    detail: string
    metric?: string
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function severityConfig(s: InsightSeverity) {
    return {
        positive: {
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            badge: 'bg-emerald-100 text-emerald-700',
            icon: CheckCircle2,
            iconColor: 'text-emerald-500',
        },
        warning: {
            bg: 'bg-amber-50',
            border: 'border-amber-200',
            badge: 'bg-amber-100 text-amber-700',
            icon: AlertTriangle,
            iconColor: 'text-amber-500',
        },
        critical: {
            bg: 'bg-rose-50',
            border: 'border-rose-200',
            badge: 'bg-rose-100 text-rose-700',
            icon: TrendingDown,
            iconColor: 'text-rose-500',
        },
        neutral: {
            bg: 'bg-slate-50',
            border: 'border-slate-200',
            badge: 'bg-slate-100 text-slate-600',
            icon: BarChart2,
            iconColor: 'text-slate-400',
        },
    }[s]
}

function InsightCard({ insight }: { insight: Insight }) {
    const cfg = severityConfig(insight.severity)
    const Icon = cfg.icon
    return (
        <div className={`rounded-xl border p-4 ${cfg.bg} ${cfg.border}`}>
            <div className="flex items-start gap-3">
                <div className="shrink-0 mt-0.5">
                    <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className={`text-[10px] font-semibold uppercase tracking-wider px-1.5 py-0.5 rounded ${cfg.badge}`}>
                            {insight.category}
                        </span>
                        {insight.metric && (
                            <span className="text-xs font-bold text-slate-700">{insight.metric}</span>
                        )}
                    </div>
                    <p className="text-sm font-semibold text-slate-800 leading-snug">{insight.headline}</p>
                    <p className="text-xs text-slate-600 mt-1 leading-relaxed">{insight.detail}</p>
                </div>
                <ArrowRight className="w-4 h-4 text-slate-300 shrink-0 mt-1" />
            </div>
        </div>
    )
}

function ScoreRing({ score, label }: { score: number; label: string }) {
    const color = score >= 75 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444'
    const pct = score * 0.974
    return (
        <div className="flex flex-col items-center gap-2">
            <div className="relative w-24 h-24">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                    <circle cx="18" cy="18" r="15.5" fill="none" strokeWidth="3" stroke="#e2e8f0" />
                    <circle
                        cx="18" cy="18" r="15.5" fill="none" strokeWidth="3"
                        stroke={color}
                        strokeDasharray={`${pct} 100`}
                        strokeLinecap="round"
                    />
                </svg>
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-xl font-bold text-slate-800">{score}</span>
                    <span className="text-[9px] text-slate-400 uppercase tracking-wide">/ 100</span>
                </div>
            </div>
            <span className="text-xs font-medium text-slate-600 text-center">{label}</span>
        </div>
    )
}

// ─── Insight generation ───────────────────────────────────────────────────────

function generateInsights(dto: Phase4DTO, filteredIssues: Phase4Issue[]): Insight[] {
    const insights: Insight[] = []
    const total = filteredIssues.length
    if (total === 0) return [{ severity: 'neutral', category: 'Data', headline: 'No issues match current filters', detail: 'Adjust the filters above to see insights for a different set of issues.', metric: '0 issues' }]

    const done = filteredIssues.filter(i => i.statusCategory === 'Done').length
    const inProgress = filteredIssues.filter(i => i.statusCategory === 'In Progress').length
    const toDo = filteredIssues.filter(i => i.statusCategory === 'To Do').length
    const completionRate = Math.round(done / total * 100)
    const wipPct = Math.round(inProgress / total * 100)
    const backlodPct = Math.round(toDo / total * 100)

    const bugs = filteredIssues.filter(i =>
        i.issueType.toLowerCase().includes('bug') ||
        i.issueType.toLowerCase().includes('defect') ||
        i.issueType.toLowerCase().includes('hotfix'),
    )
    const bugRatio = Math.round(bugs.length / total * 100)
    const openBugs = bugs.filter(i => i.statusCategory !== 'Done').length
    const bugResolution = bugs.length > 0 ? Math.round((bugs.length - openBugs) / bugs.length * 100) : 100

    const hasInvestment = filteredIssues.filter(i => i.investmentCategory).length
    const fieldCompleteness = Math.round(hasInvestment / total * 100)

    const staleWip = filteredIssues.filter(i => {
        if (i.statusCategory !== 'In Progress') return false
        const start = i.startDate || i.dueDate
        if (!start) return false
        const age = Math.round((Date.now() - new Date(start).getTime()) / 86400000)
        return age > 30
    }).length

    // ── Completion rate insight
    if (completionRate >= 70) {
        insights.push({
            severity: 'positive',
            category: 'Delivery',
            headline: 'Strong delivery performance',
            detail: `${completionRate}% of issues are closed — well above the 70% target threshold. The team is executing effectively on the backlog.`,
            metric: `${completionRate}%`,
        })
    } else if (completionRate >= 40) {
        insights.push({
            severity: 'warning',
            category: 'Delivery',
            headline: 'Completion rate is below target',
            detail: `Only ${completionRate}% of issues are marked done (${done}/${total}). Consider reviewing blockers and ensuring done criteria are clear and consistently applied.`,
            metric: `${completionRate}%`,
        })
    } else {
        insights.push({
            severity: 'critical',
            category: 'Delivery',
            headline: 'Low completion rate — delivery at risk',
            detail: `Only ${completionRate}% of issues are done. With ${toDo} items not started and ${inProgress} in flight, the team risks significant scope carryover. A backlog grooming session is recommended.`,
            metric: `${completionRate}%`,
        })
    }

    // ── WIP insight
    if (wipPct > 50) {
        insights.push({
            severity: 'critical',
            category: 'Flow',
            headline: 'Critical WIP overload',
            detail: `${inProgress} issues (${wipPct}% of total) are simultaneously in progress. High WIP is the leading cause of slow cycle times and context-switching costs. Apply WIP limits to unblock flow.`,
            metric: `${wipPct}% WIP`,
        })
    } else if (wipPct > 35) {
        insights.push({
            severity: 'warning',
            category: 'Flow',
            headline: 'WIP is elevated',
            detail: `${inProgress} issues in progress (${wipPct}%). Aim to keep WIP below 35% of total. Consider stopping new work until existing items are closed.`,
            metric: `${wipPct}% WIP`,
        })
    } else {
        insights.push({
            severity: 'positive',
            category: 'Flow',
            headline: 'WIP is well-controlled',
            detail: `Only ${wipPct}% of issues are in progress (${inProgress} items). Healthy WIP levels reduce cycle time and improve throughput predictability.`,
            metric: `${wipPct}% WIP`,
        })
    }

    // ── Bug ratio insight
    if (bugRatio > 30) {
        insights.push({
            severity: 'critical',
            category: 'Quality',
            headline: 'High bug density — quality risk',
            detail: `${bugs.length} bugs/hotfixes (${bugRatio}% of all issues) with ${openBugs} still open. A ratio above 30% indicates significant quality debt. Prioritize bug resolution over new feature work.`,
            metric: `${bugRatio}% bugs`,
        })
    } else if (bugRatio > 15) {
        insights.push({
            severity: 'warning',
            category: 'Quality',
            headline: 'Bug ratio is above ideal threshold',
            detail: `${bugs.length} bugs/hotfixes (${bugRatio}%) with ${openBugs} open. Aim to keep bug ratio below 15%. Consider root cause analysis on recurring defect patterns.`,
            metric: `${bugRatio}% bugs`,
        })
    } else if (bugs.length > 0) {
        insights.push({
            severity: 'positive',
            category: 'Quality',
            headline: 'Bug ratio is healthy',
            detail: `Only ${bugRatio}% of issues are bugs/hotfixes. Bug resolution rate is ${bugResolution}%. Quality is being maintained well.`,
            metric: `${bugRatio}% bugs`,
        })
    }

    // ── Stale WIP insight
    if (staleWip > 0) {
        insights.push({
            severity: staleWip > 5 ? 'critical' : 'warning',
            category: 'Flow',
            headline: staleWip > 5 ? 'Many stale in-progress items' : 'Some items stuck in progress',
            detail: `${staleWip} issue(s) have been in progress for over 30 days. Stale WIP indicates blocked work, unclear ownership, or scope creep. Review each item and either close, escalate, or reassign.`,
            metric: `${staleWip} stale`,
        })
    }

    // ── Backlog insight
    if (backlodPct > 60) {
        insights.push({
            severity: 'warning',
            category: 'Planning',
            headline: 'Large backlog — prioritization needed',
            detail: `${toDo} issues (${backlodPct}%) haven't been started. A large backlog dilutes focus and makes sprint planning harder. Consider pruning or re-prioritizing low-value items.`,
            metric: `${toDo} items`,
        })
    }

    // ── Field completeness
    if (fieldCompleteness < 50) {
        insights.push({
            severity: 'warning',
            category: 'Data Quality',
            headline: 'Low investment category coverage',
            detail: `Only ${fieldCompleteness}% of issues have an investment category assigned. Without this data, capacity allocation reporting is unreliable. Improve Jira field hygiene during backlog grooming.`,
            metric: `${fieldCompleteness}% complete`,
        })
    } else if (fieldCompleteness >= 85) {
        insights.push({
            severity: 'positive',
            category: 'Data Quality',
            headline: 'Good investment category coverage',
            detail: `${fieldCompleteness}% of issues have investment categories filled in. This enables accurate capacity allocation analysis across strategic themes.`,
            metric: `${fieldCompleteness}% complete`,
        })
    }

    // ── Summary positive if overall clean
    const criticalCount = insights.filter(i => i.severity === 'critical').length
    if (criticalCount === 0 && insights.filter(i => i.severity === 'positive').length >= 2) {
        insights.push({
            severity: 'positive',
            category: 'Summary',
            headline: 'Team health looks good overall',
            detail: `No critical issues detected. The team is showing healthy delivery velocity, manageable WIP, and good code quality signals. Continue tracking cycle time and throughput for continuous improvement.`,
        })
    }

    return insights
}

function computeHealthScore(filteredIssues: Phase4Issue[]): { delivery: number; quality: number; flow: number } {
    const total = filteredIssues.length
    if (total === 0) return { delivery: 0, quality: 0, flow: 0 }

    const done = filteredIssues.filter(i => i.statusCategory === 'Done').length
    const inProgress = filteredIssues.filter(i => i.statusCategory === 'In Progress').length
    const bugs = filteredIssues.filter(i =>
        i.issueType.toLowerCase().includes('bug') ||
        i.issueType.toLowerCase().includes('defect') ||
        i.issueType.toLowerCase().includes('hotfix'),
    ).length
    const openBugs = filteredIssues.filter(i =>
        (i.issueType.toLowerCase().includes('bug') ||
            i.issueType.toLowerCase().includes('defect') ||
            i.issueType.toLowerCase().includes('hotfix')) &&
        i.statusCategory !== 'Done',
    ).length

    const completionRate = done / total
    const wipRatio = inProgress / total
    const bugRatio = bugs / total
    const bugResolution = bugs > 0 ? (bugs - openBugs) / bugs : 1

    // Delivery: weighted completion rate
    const delivery = Math.min(100, Math.round(completionRate * 100 * 1.2))

    // Quality: inverse bug ratio + bug resolution
    const quality = Math.round((1 - Math.min(bugRatio * 2, 1)) * 70 + bugResolution * 30)

    // Flow: inverse WIP ratio
    const flow = Math.round((1 - Math.min(wipRatio * 1.5, 1)) * 100)

    return {
        delivery: Math.max(0, Math.min(100, delivery)),
        quality: Math.max(0, Math.min(100, quality)),
        flow: Math.max(0, Math.min(100, flow)),
    }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

interface Props {
    dto: Phase4DTO
    filters: Phase4Filters
    filteredIssues: Phase4Issue[]
}

export function AISummaryTab({ dto, filteredIssues }: Props) {
    const insights = useMemo(() => generateInsights(dto, filteredIssues), [dto, filteredIssues])
    const scores = useMemo(() => computeHealthScore(filteredIssues), [filteredIssues])

    const overallScore = Math.round((scores.delivery + scores.quality + scores.flow) / 3)

    const criticalCount = insights.filter(i => i.severity === 'critical').length
    const warningCount = insights.filter(i => i.severity === 'warning').length
    const positiveCount = insights.filter(i => i.severity === 'positive').length

    const sortedInsights = [
        ...insights.filter(i => i.severity === 'critical'),
        ...insights.filter(i => i.severity === 'warning'),
        ...insights.filter(i => i.severity === 'positive'),
        ...insights.filter(i => i.severity === 'neutral'),
    ]

    return (
        <div className="space-y-5">

            {/* ── Header ────────────────────────────────────────────────────── */}
            <div className="bg-gradient-to-r from-indigo-600 to-violet-600 rounded-xl p-5 text-white">
                <div className="flex items-start gap-3">
                    <div className="w-9 h-9 bg-white/20 rounded-lg flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-white" />
                    </div>
                    <div>
                        <h3 className="text-sm font-semibold">AI Engineering Summary</h3>
                        <p className="text-xs text-indigo-200 mt-0.5">
                            Deterministic insights derived from {filteredIssues.length} Jira issues.
                            Analysis updates automatically as you change filters.
                        </p>
                    </div>
                    <div className="ml-auto text-right shrink-0">
                        <div className="text-3xl font-bold">{overallScore}</div>
                        <div className="text-[10px] text-indigo-200 uppercase tracking-wide">Health Score</div>
                    </div>
                </div>

                {/* Alert summary */}
                <div className="mt-4 flex items-center gap-3 flex-wrap">
                    {criticalCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-rose-500/30 text-rose-100 border border-rose-400/30">
                            <TrendingDown className="w-3 h-3" /> {criticalCount} Critical
                        </span>
                    )}
                    {warningCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-amber-500/30 text-amber-100 border border-amber-400/30">
                            <AlertTriangle className="w-3 h-3" /> {warningCount} Warning
                        </span>
                    )}
                    {positiveCount > 0 && (
                        <span className="inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full bg-emerald-500/30 text-emerald-100 border border-emerald-400/30">
                            <CheckCircle2 className="w-3 h-3" /> {positiveCount} Positive
                        </span>
                    )}
                </div>
            </div>

            {/* ── Health Score Rings ────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-5">
                <h3 className="text-sm font-semibold text-slate-700 mb-4 flex items-center gap-2">
                    <Zap className="w-4 h-4 text-indigo-500" />
                    Health Scores
                </h3>
                <div className="flex items-center justify-around flex-wrap gap-6">
                    <ScoreRing score={scores.delivery} label="Delivery" />
                    <ScoreRing score={scores.quality} label="Quality" />
                    <ScoreRing score={scores.flow} label="Flow" />
                    <ScoreRing score={overallScore} label="Overall" />
                </div>
                <div className="mt-4 grid grid-cols-3 gap-2 text-[10px] text-slate-500">
                    <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                        <div className="font-semibold text-slate-700 mb-0.5">Delivery</div>
                        Based on completion rate
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                        <div className="font-semibold text-slate-700 mb-0.5">Quality</div>
                        Based on bug ratio & resolution
                    </div>
                    <div className="bg-white rounded-lg border border-slate-200 p-2 text-center">
                        <div className="font-semibold text-slate-700 mb-0.5">Flow</div>
                        Based on WIP ratio & stale items
                    </div>
                </div>
            </div>

            {/* ── Insights ──────────────────────────────────────────────────── */}
            <div>
                <h3 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Key Insights & Recommendations
                </h3>
                <div className="space-y-3">
                    {sortedInsights.map((insight, idx) => (
                        <InsightCard key={idx} insight={insight} />
                    ))}
                </div>
            </div>

            {/* ── Disclaimer ────────────────────────────────────────────────── */}
            <div className="flex items-start gap-2.5 p-3 bg-slate-50 rounded-lg border border-slate-200">
                <Sparkles className="w-3.5 h-3.5 text-indigo-400 mt-0.5 shrink-0" />
                <p className="text-[11px] text-slate-500 leading-relaxed">
                    These insights are generated deterministically from your Jira issue data — no LLM is called.
                    Connect additional data sources (sprint history, GitHub, cycle-time data) to unlock deeper analysis,
                    true velocity trends, and predictive delivery forecasts.
                </p>
            </div>
        </div>
    )
}
