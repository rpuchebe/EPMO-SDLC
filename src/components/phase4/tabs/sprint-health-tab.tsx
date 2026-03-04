'use client'

import React, { useState, useMemo } from 'react'
import { Search, Download, AlertTriangle, ChevronUp, ChevronDown, X } from 'lucide-react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, Cell,
} from 'recharts'
import type { Phase4DTO, Phase4Issue, Phase4Filters } from '../phase4-content'

// ─── Palette ──────────────────────────────────────────────────────────────────

const TYPE_COLORS = [
    '#6366f1', '#ef4444', '#f59e0b', '#10b981',
    '#3b82f6', '#f97316', '#8b5cf6', '#06b6d4',
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function ConnectBanner({ title, description }: { title: string; description: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-12 gap-3 text-center">
            <div className="w-12 h-12 bg-indigo-50 rounded-xl flex items-center justify-center">
                <AlertTriangle className="w-6 h-6 text-indigo-400" />
            </div>
            <p className="text-sm font-semibold text-slate-700">{title}</p>
            <p className="text-xs text-slate-400 max-w-xs">{description}</p>
        </div>
    )
}

function StatusChip({ status }: { status: string }) {
    const s = status.toLowerCase()
    const cls = s.includes('done') || s.includes('closed')
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

function downloadCSV(issues: Phase4Issue[]) {
    const header = 'Key,Summary,Type,Status,Workstream,Investment Category,Start Date,Due Date'
    const rows = issues.map(i =>
        [i.key, `"${i.summary.replace(/"/g, '""')}"`, i.issueType, i.statusName, i.workstream ?? '', i.investmentCategory ?? '', i.startDate ?? '', i.dueDate ?? ''].join(',')
    )
    const csv = [header, ...rows].join('\n')
    const blob = new Blob([csv], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `phase4-issues-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
}

type SortKey = 'key' | 'summary' | 'issueType' | 'statusName' | 'investmentCategory'

import { FilterRow } from '../phase4-ui'

interface Props {
    dto: Phase4DTO
    filters: Phase4Filters
    setFilter: <K extends keyof Phase4Filters>(key: K, value: Phase4Filters[K]) => void
    filteredIssues: Phase4Issue[]
}

export function SprintHealthTab({ dto, filters, setFilter, filteredIssues }: Props) {
    const [tableSearch, setTableSearch] = useState('')
    const [sortKey, setSortKey] = useState<SortKey>('key')
    const [sortAsc, setSortAsc] = useState(true)
    const [page, setPage] = useState(0)
    const PAGE_SIZE = 25

    // Issue type bar chart data
    const typeChartData = useMemo(() => {
        const counts: Record<string, number> = {}
        for (const i of filteredIssues) counts[i.issueType] = (counts[i.issueType] || 0) + 1
        return Object.entries(counts)
            .map(([name, count]) => ({ name, count, pct: filteredIssues.length > 0 ? Math.round(count / filteredIssues.length * 100) : 0 }))
            .sort((a, b) => b.count - a.count)
    }, [filteredIssues])

    // Table data
    const tableIssues = useMemo(() => {
        let result = filteredIssues
        const term = tableSearch.trim().toLowerCase()
        if (term) {
            result = result.filter(i =>
                i.key.toLowerCase().includes(term) ||
                i.summary.toLowerCase().includes(term),
            )
        }
        return [...result].sort((a, b) => {
            const av = a[sortKey] ?? ''
            const bv = b[sortKey] ?? ''
            return sortAsc ? av.localeCompare(bv) : bv.localeCompare(av)
        })
    }, [filteredIssues, tableSearch, sortKey, sortAsc])

    const totalPages = Math.ceil(tableIssues.length / PAGE_SIZE)
    const pageIssues = tableIssues.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE)

    const handleSort = (key: SortKey) => {
        if (sortKey === key) setSortAsc(v => !v)
        else { setSortKey(key); setSortAsc(true) }
        setPage(0)
    }

    const SortIcon = ({ k }: { k: SortKey }) => {
        if (sortKey !== k) return <ChevronUp className="w-3 h-3 opacity-20" />
        return sortAsc
            ? <ChevronUp className="w-3 h-3 text-indigo-600" />
            : <ChevronDown className="w-3 h-3 text-indigo-600" />
    }

    return (
        <div className="space-y-5">
            <FilterRow filters={filters} setFilter={setFilter} />

            {/* ── Sprint Overview (placeholder) ──────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-1">Sprint Snapshot</h3>
                <p className="text-xs text-slate-400 mb-4">Connect your sprint board (Jira sprint fields) to see committed vs completed, carryover, scope changes, and burn-down.</p>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {[
                        { label: 'Committed', value: '—' },
                        { label: 'Completed', value: `${dto.totalDone}`, note: 'Done issues' },
                        { label: 'Incomplete', value: `${dto.totalInProgress + dto.totalToDo}`, note: 'Open issues' },
                        { label: 'Carryover', value: '—' },
                        { label: 'Added', value: '—' },
                    ].map(m => (
                        <div key={m.label} className="bg-white rounded-lg border border-slate-200 p-3 text-center">
                            <div className={`text-xl font-bold ${m.value === '—' ? 'text-slate-300' : 'text-slate-800'}`}>{m.value}</div>
                            <div className="text-[10px] text-slate-500 mt-0.5">{m.label}</div>
                            {m.note && <div className="text-[9px] text-slate-400">{m.note}</div>}
                        </div>
                    ))}
                </div>
            </div>

            {/* ── Issue Type Distribution (horizontal bars) ──────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 p-4">
                <h3 className="text-sm font-semibold text-slate-700 mb-4">Issue Distribution by Type</h3>
                {typeChartData.length > 0 ? (
                    <div className="space-y-2.5">
                        {typeChartData.map((d, idx) => (
                            <div key={d.name}>
                                <div className="flex justify-between text-xs mb-1">
                                    <span className="font-medium text-slate-700 flex items-center gap-1.5">
                                        <span
                                            className="w-2 h-2 rounded-full inline-block"
                                            style={{ background: TYPE_COLORS[idx % TYPE_COLORS.length] }}
                                        />
                                        {d.name}
                                    </span>
                                    <span className="text-slate-500">{d.count} &middot; {d.pct}%</span>
                                </div>
                                <div className="h-2 bg-slate-200 rounded-full overflow-hidden">
                                    <div
                                        className="h-full rounded-full"
                                        style={{
                                            width: `${d.pct}%`,
                                            background: TYPE_COLORS[idx % TYPE_COLORS.length],
                                            transition: 'width 0.6s ease',
                                        }}
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                ) : (
                    <ConnectBanner title="No issues" description="No issues match the current filters." />
                )}

                {/* Bar chart view */}
                {typeChartData.length > 0 && (
                    <div className="mt-5">
                        <ResponsiveContainer width="100%" height={160}>
                            <BarChart data={typeChartData} layout="vertical" margin={{ left: 0, right: 30 }}>
                                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                                <XAxis type="number" tick={{ fontSize: 10 }} />
                                <YAxis type="category" dataKey="name" width={110} tick={{ fontSize: 10 }} />
                                <Tooltip
                                    formatter={(v: number | undefined) => [v ?? 0, 'Issues']}
                                    contentStyle={{ fontSize: 11, borderRadius: 8, border: '1px solid #e2e8f0' }}
                                />
                                <Bar dataKey="count" radius={[0, 4, 4, 0]} maxBarSize={16}>
                                    {typeChartData.map((_, idx) => (
                                        <Cell key={idx} fill={TYPE_COLORS[idx % TYPE_COLORS.length]} />
                                    ))}
                                </Bar>
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                )}
            </div>

            {/* ── Issue Table ───────────────────────────────────────────────── */}
            <div className="bg-slate-50 rounded-xl border border-slate-200 overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-slate-200 bg-white gap-3 flex-wrap">
                    <h3 className="text-sm font-semibold text-slate-700">
                        Issue List
                        <span className="ml-2 text-xs text-slate-400 font-normal">{tableIssues.length} issues</span>
                    </h3>
                    <div className="flex items-center gap-2">
                        <div className="relative">
                            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                            <input
                                type="text"
                                placeholder="Search…"
                                value={tableSearch}
                                onChange={e => { setTableSearch(e.target.value); setPage(0) }}
                                className="pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 w-44"
                            />
                            {tableSearch && (
                                <button onClick={() => { setTableSearch(''); setPage(0) }} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400">
                                    <X className="w-3 h-3" />
                                </button>
                            )}
                        </div>
                        <button
                            onClick={() => downloadCSV(tableIssues)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                        >
                            <Download className="w-3.5 h-3.5" />
                            CSV
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                        <thead>
                            <tr className="bg-slate-50 border-b border-slate-200">
                                {[
                                    { key: 'key' as SortKey, label: 'Key', w: 'w-24' },
                                    { key: 'summary' as SortKey, label: 'Summary', w: '' },
                                    { key: 'issueType' as SortKey, label: 'Type', w: 'w-28' },
                                    { key: 'statusName' as SortKey, label: 'Status', w: 'w-32' },
                                    { key: 'investmentCategory' as SortKey, label: 'Investment', w: 'w-36' },
                                ].map(col => (
                                    <th
                                        key={col.key}
                                        onClick={() => handleSort(col.key)}
                                        className={`px-3 py-2.5 text-left font-semibold text-slate-500 uppercase tracking-wider cursor-pointer hover:text-slate-700 select-none ${col.w}`}
                                    >
                                        <span className="flex items-center gap-1">
                                            {col.label} <SortIcon k={col.key} />
                                        </span>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {pageIssues.length === 0 ? (
                                <tr>
                                    <td colSpan={5} className="px-4 py-10 text-center text-slate-400">No issues match</td>
                                </tr>
                            ) : (
                                pageIssues.map((issue, idx) => (
                                    <tr
                                        key={issue.id}
                                        className={`border-b border-slate-100 hover:bg-indigo-50/30 transition-colors ${idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/50'}`}
                                    >
                                        <td className="px-3 py-2">
                                            <span className="font-mono text-xs text-indigo-600 font-semibold">{issue.key}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-slate-700 line-clamp-1" title={issue.summary}>{issue.summary}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-slate-600">{issue.issueType}</span>
                                        </td>
                                        <td className="px-3 py-2">
                                            <StatusChip status={issue.statusName} />
                                        </td>
                                        <td className="px-3 py-2">
                                            <span className="text-slate-500">{issue.investmentCategory ?? '—'}</span>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between px-4 py-2.5 border-t border-slate-200 bg-white text-xs text-slate-500">
                        <span>{page * PAGE_SIZE + 1}–{Math.min((page + 1) * PAGE_SIZE, tableIssues.length)} of {tableIssues.length}</span>
                        <div className="flex gap-1">
                            <button disabled={page === 0} onClick={() => setPage(p => p - 1)}
                                className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                                Prev
                            </button>
                            <button disabled={page >= totalPages - 1} onClick={() => setPage(p => p + 1)}
                                className="px-2.5 py-1 rounded border border-slate-200 disabled:opacity-40 hover:bg-slate-50">
                                Next
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    )
}
