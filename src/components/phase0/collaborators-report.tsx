'use client'

import { TrendingUp, User } from 'lucide-react'

interface Collaborator {
    name: string
    avatar: string | null
    ticketCount: number
    avgRoi: number | null
}

interface CollaboratorsReportProps {
    data: Collaborator[]
    onCollaboratorClick?: (name: string) => void
}

export function CollaboratorsReport({ data, onCollaboratorClick }: CollaboratorsReportProps) {
    const maxTickets = data.length > 0 ? Math.max(...data.map((c) => c.ticketCount)) : 1

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 h-full">
            <div className="mb-5">
                <h3 className="text-sm font-semibold text-slate-900">Collaborators Report</h3>
                <p className="text-xs text-slate-400 mt-0.5">Ranked by ticket contribution</p>
            </div>

            <div className="space-y-1 max-h-[520px] overflow-y-auto pr-1 hide-scrollbar">
                {data.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">No collaborators found</p>
                )}

                {data.map((collaborator, index) => (
                    <button
                        key={collaborator.name}
                        onClick={() => onCollaboratorClick?.(collaborator.name)}
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50
                                   transition-all duration-200 group text-left"
                    >
                        {/* Rank */}
                        <span className="text-xs font-semibold text-slate-300 w-5 text-right shrink-0">
                            {index + 1}
                        </span>

                        {/* Avatar */}
                        <div className="w-9 h-9 rounded-full overflow-hidden bg-slate-100 shrink-0
                                        ring-2 ring-white shadow-sm flex items-center justify-center">
                            {collaborator.avatar ? (
                                <img
                                    src={collaborator.avatar}
                                    alt={collaborator.name}
                                    className="w-full h-full object-cover"
                                    referrerPolicy="no-referrer"
                                />
                            ) : (
                                <User className="w-4 h-4 text-slate-400" />
                            )}
                        </div>

                        {/* Info */}
                        <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-slate-800 truncate
                                          group-hover:text-indigo-600 transition-colors">
                                {collaborator.name}
                            </p>
                            <div className="flex items-center gap-3 mt-1">
                                <span className="text-xs text-slate-500">
                                    {collaborator.ticketCount} ticket{collaborator.ticketCount !== 1 ? 's' : ''}
                                </span>
                                {collaborator.avgRoi !== null && (
                                    <span className="inline-flex items-center gap-1 text-xs text-violet-600 font-medium">
                                        <TrendingUp className="w-3 h-3" />
                                        ROI {collaborator.avgRoi}
                                    </span>
                                )}
                            </div>
                            {/* Progress bar */}
                            <div className="mt-1.5 h-1 bg-slate-100 rounded-full overflow-hidden">
                                <div
                                    className="h-full bg-indigo-500 rounded-full transition-all duration-500"
                                    style={{ width: `${(collaborator.ticketCount / maxTickets) * 100}%` }}
                                />
                            </div>
                        </div>
                    </button>
                ))}
            </div>
        </div>
    )
}
