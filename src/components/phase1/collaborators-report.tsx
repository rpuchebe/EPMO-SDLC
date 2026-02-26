'use client'

import { useState } from 'react'

import { TrendingUp, TrendingDown, User, Users } from 'lucide-react'

interface Collaborator {
    name: string
    avatar: string | null
    ticketCount: number
    avgRoi?: number | null
    avgOriginalRoi?: number | null
}

interface CollaboratorsReportProps {
    reportersData: Collaborator[]
    assigneesData: Collaborator[]
    onReporterClick?: (name: string) => void
    onAssigneeClick?: (name: string) => void
}

export function CollaboratorsReport({
    reportersData,
    assigneesData,
    onReporterClick,
    onAssigneeClick
}: CollaboratorsReportProps) {
    const [activeTab, setActiveTab] = useState<'reporters' | 'assignees'>('reporters')

    const data = activeTab === 'reporters' ? reportersData : assigneesData
    const onClick = activeTab === 'reporters' ? onReporterClick : onAssigneeClick

    const maxTickets = data.length > 0 ? Math.max(...data.map((c) => c.ticketCount)) : 1

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden h-full flex flex-col">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex-shrink-0">
                <div className="w-[3px] h-5 rounded-full bg-[#3b82f6] flex-shrink-0" />
                <Users className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-800">Contributors Report</h3>
                <div className="ml-auto flex bg-slate-100 p-0.5 rounded-lg space-x-1">
                    <button
                        onClick={() => setActiveTab('reporters')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'reporters' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Reporters
                    </button>
                    <button
                        onClick={() => setActiveTab('assignees')}
                        className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${activeTab === 'assignees' ? 'bg-white text-blue-600 shadow-sm' : 'text-slate-500 hover:text-slate-700'}`}
                    >
                        Assignees
                    </button>
                </div>
            </div>

            <div className="p-6 flex-1 overflow-hidden">
            <div className="space-y-1 max-h-[750px] overflow-y-auto pr-1 hide-scrollbar">
                {data.length === 0 && (
                    <p className="text-sm text-slate-400 text-center py-8">No reporters found</p>
                )}

                {data.map((collaborator, index) => (
                    <button
                        key={collaborator.name}
                        onClick={() => onClick?.(collaborator.name)}
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
                            {collaborator.avatar && !collaborator.avatar.startsWith('https://secure.gravatar.com/avatar/') ? (
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
                                {collaborator.avgRoi !== undefined && collaborator.avgRoi !== null && (
                                    <div className="flex items-center gap-1.5">
                                        <span className="inline-flex items-center gap-1 text-xs text-violet-600 font-medium">
                                            <TrendingUp className="w-3 h-3" />
                                            ROI {collaborator.avgRoi}
                                        </span>
                                        {collaborator.avgOriginalRoi !== undefined && collaborator.avgOriginalRoi !== null && Math.abs(collaborator.avgRoi - collaborator.avgOriginalRoi) > 0.1 && (
                                            <span className={`inline-flex items-center gap-0.5 text-[10px] font-medium ${collaborator.avgRoi >= collaborator.avgOriginalRoi ? 'text-emerald-500' : 'text-rose-500'}`}>
                                                {collaborator.avgRoi >= collaborator.avgOriginalRoi ? (
                                                    <>+{Math.round(collaborator.avgRoi - collaborator.avgOriginalRoi)}% <TrendingUp className="w-2.5 h-2.5" /></>
                                                ) : (
                                                    <>{Math.round(collaborator.avgRoi - collaborator.avgOriginalRoi)}% <TrendingDown className="w-2.5 h-2.5" /></>
                                                )}
                                            </span>
                                        )}
                                    </div>
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
        </div>
    )
}
