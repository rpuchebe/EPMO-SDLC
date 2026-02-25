'use client'

import { useState } from 'react'
import { FollowUpTicket } from '@/types/incidents'
import { ChevronDown, CheckCircle2, ChevronRight } from 'lucide-react'

interface FollowUpTableProps {
    data: FollowUpTicket[]
}

export function FollowUpTable({ data }: FollowUpTableProps) {
    const [removeComplete, setRemoveComplete] = useState(false)
    const [expandedRows, setExpandedRows] = useState<Set<string>>(new Set())

    // Filter and sort
    const processedData = data
        .filter(t => (removeComplete ? !t.is_complete : true))
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Newest first

    const toggleRow = (id: string) => {
        const newSet = new Set(expandedRows)
        if (newSet.has(id)) newSet.delete(id)
        else newSet.add(id)
        setExpandedRows(newSet)
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full h-full min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Follow-up List</h3>
                <label className="flex items-center gap-2 text-sm text-slate-600 cursor-pointer">
                    <input
                        type="checkbox"
                        checked={removeComplete}
                        onChange={(e) => setRemoveComplete(e.target.checked)}
                        className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                    Remove Complete
                </label>
            </div>

            <div className="flex-1 overflow-auto">
                <table className="w-full text-left border-collapse">
                    <thead>
                        <tr className="border-b border-slate-100">
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider w-8"></th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Key</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Score</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Linked</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Completion</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {processedData.length === 0 ? (
                            <tr>
                                <td colSpan={6} className="py-8 text-center text-sm text-slate-500">
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
                    <span className="inline-flex items-center justify-center px-2 py-1 rounded bg-slate-100 text-slate-700 font-medium">
                        {ticket.score !== null ? ticket.score : '-'}
                    </span>
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
                    <td colSpan={6} className="px-12 py-3 border-l-2 border-l-blue-400">
                        <div className="space-y-2">
                            {ticket.linked_tickets.map((link: any, idx: number) => (
                                <div key={idx} className="flex items-center justify-between bg-white border border-slate-100 p-2.5 rounded-lg shadow-sm">
                                    <div className="flex items-center gap-3">
                                        <span className="text-xs font-semibold text-slate-800">{link.key}</span>
                                        <span className="text-xs text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">{link.project}</span>
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
