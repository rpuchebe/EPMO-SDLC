'use client'

import { useState, useMemo } from 'react'
import { FollowUpTicket } from '@/types/incidents'
import { ChevronDown, CheckCircle2, ChevronRight, Search, Calendar } from 'lucide-react'

interface FollowUpTableProps {
    data: FollowUpTicket[]
}

export function FollowUpTable({ data }: FollowUpTableProps) {
    const [removeComplete, setRemoveComplete] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())
    const [searchQuery, setSearchQuery] = useState('')
    const [dateRange, setDateRange] = useState({ start: '', end: '' })

    // Filter and sort
    const processedData = useMemo(() => {
        return data.filter(t => {
            if (removeComplete && t.is_complete) return false

            const q = searchQuery.toLowerCase()
            if (q) {
                const matchesJiraKey = t.jira_key?.toLowerCase().includes(q)
                const matchesLinked = t.linked_tickets?.some((l: any) => l.key?.toLowerCase().includes(q))
                if (!matchesJiraKey && !matchesLinked) return false
            }

            if (dateRange.start) {
                if (new Date(t.created_at) < new Date(dateRange.start)) return false
            }
            if (dateRange.end) {
                const endDate = new Date(dateRange.end)
                endDate.setHours(23, 59, 59, 999)
                if (new Date(t.created_at) > endDate) return false
            }

            return true
        }).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Newest first
    }, [data, removeComplete, searchQuery, dateRange])

    const toggleRow = (id: string) => {
        const newSet = new Set(expandedRows)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setExpandedRows(newSet)
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full h-[560px] flex flex-col">
            <div className="flex flex-col gap-4 mb-4">
                <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold text-slate-900">Postmortem list</h3>
                    <label className="flex items-center gap-2 text-[11px] font-medium text-slate-600 cursor-pointer bg-slate-50 px-2.5 py-1.5 rounded-lg border border-slate-200">
                        <input
                            type="checkbox"
                            checked={removeComplete}
                            onChange={(e) => setRemoveComplete(e.target.checked)}
                            className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 w-3.5 h-3.5"
                        />
                        Hide Complete
                    </label>
                </div>

                {/* Filters Row */}
                <div className="flex flex-col sm:flex-row items-center gap-3 bg-slate-50 p-2 rounded-xl border border-slate-100">
                    <div className="relative flex-1 w-full">
                        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                        <input
                            type="text"
                            placeholder="Search by key or linked issue..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-9 pr-4 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                        />
                    </div>

                    <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg px-3 py-1.5 w-full sm:w-auto">
                        <Calendar className="w-3.5 h-3.5 text-slate-400" />
                        <input
                            type="date"
                            value={dateRange.start}
                            onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                            className="text-xs text-slate-600 bg-transparent outline-none focus:ring-0 p-0 border-none cursor-pointer"
                        />
                        <span className="text-slate-300 text-[10px] uppercase font-bold">to</span>
                        <input
                            type="date"
                            value={dateRange.end}
                            onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                            className="text-xs text-slate-600 bg-transparent outline-none focus:ring-0 p-0 border-none cursor-pointer"
                        />
                    </div>
                </div>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8"></th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Key</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Completion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {processedData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                                    No follow-ups found
                                </td>
                            </tr>
                        ) : null}

                        {processedData.map((ticket) => {
                            const isExpanded = expandedRows.has(ticket.id)
                            const hasLinked = ticket.linked_tickets && ticket.linked_tickets.length > 0
                            return (
                                <HighlightRow key={ticket.id} isExpanded={isExpanded} ticket={ticket} hasLinked={hasLinked} toggleRow={toggleRow} />
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}

function HighlightRow({ isExpanded, ticket, hasLinked, toggleRow }: any) {
    return (
        <>
            <tr className={`hover:bg-slate-50/50 transition-colors ${isExpanded ? 'bg-slate-50/50' : ''}`}>
                <td className="py-3 px-4">
                    {hasLinked && (
                        <button
                            onClick={() => toggleRow(ticket.id)}
                            className="p-1 rounded-md hover:bg-slate-200 text-slate-400 transition-colors"
                        >
                            {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                        </button>
                    )}
                </td>
                <td className="py-3 px-4 text-sm font-medium text-slate-900">{ticket.jira_key}</td>
                <td className="py-3 px-4 text-sm text-slate-600">
                    {new Date(ticket.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 px-4 text-sm text-slate-600">
                    <span className="inline-flex items-center gap-1">
                        {ticket.linked_tickets_count} ticket(s)
                    </span>
                </td>
                <td className="py-3 px-4 text-sm">
                    {ticket.is_complete ? (
                        <span className="inline-flex items-center gap-1 text-emerald-600 font-medium bg-emerald-50 px-2.5 py-1 rounded-full text-xs">
                            <CheckCircle2 className="w-3 h-3" /> Complete
                        </span>
                    ) : (
                        <span className="inline-flex items-center gap-1 text-amber-600 font-medium bg-amber-50 px-2.5 py-1 rounded-full text-xs">
                            Pending
                        </span>
                    )}
                </td>
            </tr>
            {isExpanded && hasLinked && (
                <tr className="bg-slate-50/50">
                    <td colSpan={5} className="px-12 py-3 border-l-2 border-l-blue-400">
                        <div className="space-y-2">
                            {ticket.linked_tickets.map((link: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-slate-800">{link.key}</span>
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{link.key ? link.key.split('-')[0] : 'Unknown'}</span>
                                    </div>
                                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${link.status.toLowerCase().includes('done') || link.status.toLowerCase().includes('closed')
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : link.status.toLowerCase().includes('progress')
                                            ? 'bg-blue-100 text-blue-700'
                                            : 'bg-slate-100 text-slate-600'
                                        }`}>
                                        {link.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </td>
                </tr>
            )}
        </>
    )
}
