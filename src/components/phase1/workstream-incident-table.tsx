'use client'

import { useState } from 'react'
import { WorkstreamIncidentTicket } from '@/types/incidents'
import { AlertCircle } from 'lucide-react'

interface WorkstreamIncidentTableProps {
    data: WorkstreamIncidentTicket[]
}

export function WorkstreamIncidentTable({ data }: WorkstreamIncidentTableProps) {
    const [removeComplete, setRemoveComplete] = useState(false)

    // Filter and sort
    const processedData = data
        .filter(t => {
            if (!removeComplete) return true
            const status = (t.status || '').toLowerCase()
            return !(status.includes('done') || status.includes('complete') || status.includes('closed'))
        })
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()) // Newest first

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 w-full h-full min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-semibold text-slate-900">Workstream Incident List</h3>
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
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Key</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Impact</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Created Date</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                            <th className="py-3 px-4 text-xs font-semibold text-slate-500 uppercase tracking-wider">Project Key</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                        {processedData.length === 0 ? (
                            <tr>
                                <td colSpan={5} className="py-8 text-center text-sm text-slate-500">
                                    No workstream incident tickets found
                                </td>
                            </tr>
                        ) : null}

                        {processedData.map((ticket) => {
                            const imp = ticket.impact || 4
                            return (
                                <tr key={ticket.id} className="hover:bg-slate-50/50 transition-colors">
                                    <td className="py-3 px-4 text-sm font-medium text-slate-900">{ticket.jira_key}</td>
                                    <td className="py-3 px-4 text-sm">
                                        <span className={`inline-flex items-center gap-1 font-medium bg-slate-50 px-2.5 py-1 rounded-md text-xs
                                            ${imp === 1 ? 'text-red-700 bg-red-50' :
                                                imp === 2 ? 'text-orange-700 bg-orange-50' :
                                                    imp === 3 ? 'text-yellow-700 bg-yellow-50' :
                                                        'text-blue-700 bg-blue-50'
                                            }
                                        `}>
                                            <AlertCircle className="w-3 h-3" /> Impact {imp}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">
                                        {new Date(ticket.created_at).toLocaleDateString()}
                                    </td>
                                    <td className="py-3 px-4 text-sm">
                                        {(() => {
                                            const status = ticket.status || 'Open'
                                            const sLower = status.toLowerCase()
                                            const isDone = sLower.includes('done') || sLower.includes('closed')
                                            const isProg = sLower.includes('progress')
                                            return (
                                                <span className={`text-xs px-2 py-1 rounded-full font-medium ${isDone
                                                    ? 'bg-emerald-100 text-emerald-700'
                                                    : isProg
                                                        ? 'bg-blue-100 text-blue-700'
                                                        : 'bg-slate-100 text-slate-600'
                                                    }`}>
                                                    {status}
                                                </span>
                                            )
                                        })()}
                                    </td>
                                    <td className="py-3 px-4 text-sm text-slate-600">
                                        <span className="bg-slate-100 px-2 py-0.5 rounded-md text-xs">{ticket.project_key || 'N/A'}</span>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
