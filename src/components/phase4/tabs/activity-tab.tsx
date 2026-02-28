'use client'

import React, { useMemo } from 'react'
import { Activity, GitPullRequest, CalendarDays, TrendingUp } from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, LineChart, Line, Legend, Cell,
} from 'recharts'
import type { Phase4DTO, Phase4Issue, Phase4Filters } from '../phase4-content'

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

// ─── Heat-map calendar ────────────────────────────────────────────────────────

function getIntensityClass(count: number, max: number): string {
    if (count === 0 || max === 0) return 'bg-slate-100'
    const ratio = count / max
    if (ratio < 0.25) return 'bg-indigo-100'
    if (ratio < 0.5) return 'bg-indigo-300'
    if (ratio < 0.75) return 'bg-indigo-500'
    return 'bg-indigo-700'
}

function ActivityCalendar({ issues }: { issues: Phase4Issue[] }) {
    // Build last-90-days heat map
    const { days, max } = useMemo(() => {
        const counts: Record<string, number> = {}
        const now = new Date()
        const startDay = new Date(now)
        startDay.setDate(now.getDate() - 89) // 90 days
        for (const i of issues) {
            const dates = [i.startDate, i.dueDate].filter(Boolean) as string[]
            for (const d of dates) {
                const day = new Date(d)
                if (day >= startDay && day <= now) {
                    const key = d.slice(0, 10)
                    counts[key] = (counts[key] || 0) + 1
                }
            }
        }
        const dayList: { date: string; count: number }[] = []
        const cur = new Date(startDay)
        while (cur <= now) {
            const key = cur.toISOString().slice(0, 10)
            dayList.push({ date: key, count: counts[key] || 0 })
            cur.setDate(cur.getDate() + 1)
        }
        const max = Math.max(...dayList.map(d => d.count), 1)
        return { days: dayList, max }
    }, [issues])

    const weeks: { date: string; count: number }[][] = []
    for (let i = 0; i < days.length; i += 7) {
        weeks.push(days.slice(i, i + 7))
    }

    return (
        <div className="overflow-x-auto">
            <div className="flex gap-1">
                {weeks.map((week, wi) => (
                    <div key={wi} className="flex flex-col gap-1">
                        {week.map(day => (
                            <div
                                key={day.date}
                                title={`${day.date}: ${day.count} issue(s)`}
                                className={`w-3.5 h-3.5 rounded-sm cursor-default transition-colors ${getIntensityClass(day.count, max)}`}
                            />
                        ))}
                    </div>
                ))}
            </div>
            <div className="flex items-center gap-1 mt-2 text-[10px] text-slate-400">
                <span>Less</span>
                {['bg-slate-100', 'bg-indigo-100', 'bg-indigo-300', 'bg-indigo-500', 'bg-indigo-700'].map(cls => (
                    <div key={cls} className={`w-3 h-3 rounded-sm ${cls}`} />
                ))}
                <span>More</span>
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

export function ActivityTab({ filteredIssues }: Props) {
    // Weekly activity (issues with start or due dates)
    const weeklyData = useMemo(() => {
        const weeks: Record<string, { opened: number; closed: number }> = {}
        const now = new Date()
        for (let w = 11; w >= 0; w--) {
            const d = new Date(now)
            d.setDate(now.getDate() - w * 7)
            const year = d.getFullYear()
            const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7)
            const key = `W${week}`
            weeks[key] = { opened: 0, closed: 0 }
        }

        for (const i of filteredIssues) {
            const startDate = i.startDate
            const dueDate = i.dueDate
            if (startDate) {
                const d = new Date(startDate)
                const year = d.getFullYear()
                const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7)
                const key = `W${week}`
                if (weeks[key]) weeks[key].opened++
            }
            if (dueDate && i.statusCategory === 'Done') {
                const d = new Date(dueDate)
                const year = d.getFullYear()
                const week = Math.ceil(((d.getTime() - new Date(year, 0, 1).getTime()) / 86400000 + new Date(year, 0, 1).getDay() + 1) / 7)
                const key = `W${week}`
                if (weeks[key]) weeks[key].closed++
            }
        }
        return Object.entries(weeks).map(([week, v]) => ({ week, ...v }))
    }, [filteredIssues])

    // Status change velocity: issues by status bucket
    const statusVelocity = useMemo(() => {
        const counts = { 'To Do': 0, 'In Progress': 0, 'Done': 0 }
        for (const i of filteredIssues) {
            if (i.statusCategory in counts) counts[i.statusCategory as keyof typeof counts]++
        }
        return [
            { name: 'Opened / To Do', value: counts['To Do'], fill: '#94a3b8' },
            { name: 'In Progress', value: counts['In Progress'], fill: '#6366f1' },
            { name: 'Closed / Done', value: counts['Done'], fill: '#10b981' },
        ]
    }, [filteredIssues])

    // Issues with activity in last 7/30/90 days
    const activityWindow = useMemo(() => {
        const now = Date.now()
        const d7 = now - 7 * 86400000
        const d30 = now - 30 * 86400000
        const d90 = now - 90 * 86400000
        let w7 = 0, w30 = 0, w90 = 0
        for (const i of filteredIssues) {
            const dates = [i.startDate, i.dueDate].filter(Boolean) as string[]
            for (const d of dates) {
                const ts = new Date(d).getTime()
                if (ts >= d7) { w7++; break }
                else if (ts >= d30) { w30++; break }
                else if (ts >= d90) { w90++; break }
            }
        }
        return { w7, w30: w7 + w30, w90: w7 + w30 + w90 }
    }, [filteredIssues])

    const hasDates = filteredIssues.some(i => i.startDate || i.dueDate)

    return (
        <div className="space-y-5">

            {/* ── Activity KPIs ─────────────────────────────────────────────── */}
            <div className="grid grid-cols-3 gap-4">
                {[
                    { label: 'Active (7d)', value: hasDates ? `${activityWindow.w7}` : '—', note: 'Issues with date in last 7 days' },
                    { label: 'Active (30d)', value: hasDates ? `${activityWindow.w30}` : '—', note: 'Issues with date in last 30 days' },
                    { label: 'Active (90d)', value: hasDates ? `${activityWindow.w90}` : '—', note: 'Issues with date in last 90 days' },
                ].map(m => (
                    <div key={m.label} className="bg-white border border-slate-200 rounded-xl p-4 text-center shadow-sm">
                        <div className={`text-2xl font-bold ${m.value === '—' ? 'text-slate-300' : 'text-slate-800'}`}>{m.value}</div>
                        <div className="text-[10px] font-medium text-slate-500 uppercase tracking-wider mt-1">{m.label}</div>
                        <div className="text-[9px] text-slate-400 mt-0.5">{m.note}</div>
                    </div>
                ))}
            </div>

            {/* ── Activity Calendar ─────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <CalendarDays className="w-4 h-4 text-indigo-500" />
                    Activity Heatmap (last 90 days — by issue dates)
                </SectionTitle>
                {hasDates ? (
                    <ActivityCalendar issues={filteredIssues} />
                ) : (
                    <div className="flex items-center justify-center py-8 text-slate-400 text-sm">
                        No date information available on filtered issues
                    </div>
                )}
            </div>

            {/* ── Weekly Trend ──────────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <TrendingUp className="w-4 h-4 text-indigo-500" />
                    Weekly Activity Trend (last 12 weeks)
                </SectionTitle>
                <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={weeklyData} margin={{ right: 8, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="week" tick={{ fontSize: 10 }} interval={1} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }} />
                        <Legend formatter={v => <span className="text-[11px] text-slate-600">{v}</span>} />
                        <Line type="monotone" dataKey="opened" name="Opened" stroke="#6366f1" strokeWidth={2} dot={{ r: 3 }} />
                        <Line type="monotone" dataKey="closed" name="Closed" stroke="#10b981" strokeWidth={2} dot={{ r: 3 }} />
                    </LineChart>
                </ResponsiveContainer>
                <p className="text-[10px] text-slate-400 text-center mt-1">
                    Based on issue start dates (opened) and due dates for Done issues (closed)
                </p>
            </div>

            {/* ── Flow Snapshot ─────────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <Activity className="w-4 h-4 text-indigo-500" />
                    Current Status Snapshot
                </SectionTitle>
                <ResponsiveContainer width="100%" height={120}>
                    <BarChart data={statusVelocity} margin={{ right: 8, left: -20 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 10 }} />
                        <Tooltip
                            formatter={(v: number | undefined) => [v ?? 0, 'Issues']}
                            contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                        />
                        <Bar dataKey="value" maxBarSize={60} radius={[4, 4, 0, 0]}>
                            {statusVelocity.map((s, idx) => (
                                <Cell key={idx} fill={s.fill} />
                            ))}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>

            {/* ── GitHub Activity placeholder ───────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <SectionTitle>
                    <GitPullRequest className="w-4 h-4 text-slate-400" />
                    GitHub Activity
                </SectionTitle>
                <ConnectBanner
                    title="GitHub not connected"
                    description="Connect GitHub to display commits per day, PR open/merge velocity, review throughput, and unreviewed PR age."
                />
                <div className="mt-3 grid grid-cols-4 gap-3">
                    {['Commits (7d)', 'PRs Merged', 'PRs Open', 'Avg Review Time'].map(label => (
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
