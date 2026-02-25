'use client'

import { useEffect, useRef } from 'react'
import { X, ExternalLink } from 'lucide-react'

export interface Phase1Ticket {
    id: string
    jira_key: string
    summary: string
    status: string
    status_category: string
    workstream: string | null
    team: string | null
    ticket_type: string | null
    created_at: string
    completed_at: string | null
    roi_score: number | null
    reporter_display_name: string | null
    reporter_avatar_url: string | null
    assignee_avatar_url: string | null
    linked_work_item_count: number | null
    linked_work_items?: { key: string; status: string; issue_type: string; summary?: string }[] | null
}

interface TicketListModalProps {
    open: boolean
    title: string
    tickets: Phase1Ticket[]
    onClose: () => void
}

const JIRA_BASE = 'https://prioritycommerce.atlassian.net'

const statusColors: Record<string, string> = {
    'To Do': 'bg-slate-100 text-slate-700',
    'In Progress': 'bg-blue-50 text-blue-700',
    'Done': 'bg-emerald-50 text-emerald-700',
}

function getStatusColor(category: string) {
    return statusColors[category] || 'bg-slate-100 text-slate-600'
}

export function TicketListModal({ open, title, tickets, onClose }: TicketListModalProps) {
    const overlayRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, onClose])

    if (!open) return null

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            <div
                ref={overlayRef}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />
            <div className="relative z-10 w-full max-w-5xl mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[80vh] flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <div>
                        <h2 className="text-base font-bold text-slate-900">{title}</h2>
                        <p className="text-xs text-slate-400 mt-0.5">
                            {tickets.length} ticket{tickets.length !== 1 ? 's' : ''}
                        </p>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Table */}
                <div className="overflow-auto flex-1">
                    {tickets.length === 0 ? (
                        <div className="flex items-center justify-center py-12 text-sm text-slate-400">
                            No tickets found
                        </div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50 sticky top-0 z-10">
                                <tr>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[110px]">Key</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider">Summary</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[120px]">Type</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[80px]">ROI</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[130px]">Status</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[130px]">Reporter</th>
                                    <th className="text-left px-4 py-2.5 font-semibold text-slate-500 text-xs uppercase tracking-wider w-[90px]">Created</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {tickets.map((t) => (
                                    <tr key={t.id} className="hover:bg-slate-50/60 transition-colors">
                                        <td className="px-4 py-2.5">
                                            <a
                                                href={`${JIRA_BASE}/browse/${t.jira_key}`}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 font-medium text-xs transition-colors"
                                            >
                                                {t.jira_key}
                                                <ExternalLink className="w-3 h-3" />
                                            </a>
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-700 max-w-[250px] truncate" title={t.summary}>{t.summary}</td>
                                        <td className="px-4 py-2.5 text-slate-600 text-xs">
                                            {t.ticket_type || '—'}
                                        </td>
                                        <td className="px-4 py-2.5 text-slate-600 text-xs font-medium">
                                            {t.roi_score !== null && t.roi_score !== undefined ? (
                                                <span className="text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-full inline-block">
                                                    {t.roi_score}
                                                </span>
                                            ) : '—'}
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(t.status_category)}`} title={t.status}>
                                                <span className="max-w-[100px] truncate block">{t.status}</span>
                                            </span>
                                        </td>
                                        <td className="px-4 py-2.5">
                                            <div className="flex items-center gap-1.5">
                                                {t.reporter_avatar_url ? (
                                                    <img src={t.reporter_avatar_url} alt="" className="w-5 h-5 rounded-full" />
                                                ) : (
                                                    <div className="w-5 h-5 rounded-full bg-slate-200 flex items-center justify-center text-[10px] font-bold text-slate-500">
                                                        {(t.reporter_display_name || '?')[0]}
                                                    </div>
                                                )}
                                                <span className="text-xs text-slate-600 truncate max-w-[90px]">
                                                    {t.reporter_display_name || 'Unknown'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-4 py-2.5 text-xs text-slate-500">
                                            {new Date(t.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>
        </div>
    )
}
