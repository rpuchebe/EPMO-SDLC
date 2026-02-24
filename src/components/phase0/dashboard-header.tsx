'use client'

import { useState } from 'react'
import { RefreshCw, Info } from 'lucide-react'
import { InfoModal } from './info-modal'

interface DashboardHeaderProps {
    lastSync: string | null
    onRefresh: () => void
    isRefreshing: boolean
}

export function DashboardHeader({ lastSync, onRefresh, isRefreshing }: DashboardHeaderProps) {
    const [infoOpen, setInfoOpen] = useState(false)

    const formattedDate = lastSync
        ? new Date(lastSync).toLocaleString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
            timeZone: 'America/Bogota',
        })
        : 'Never'

    return (
        <>
            <div className="flex items-center justify-between mb-4">
                <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                        Dashboard
                    </h1>
                    <button
                        onClick={() => setInfoOpen(true)}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                                   p-1.5 rounded-lg transition-all duration-200"
                        title="About Phase 0"
                    >
                        <Info className="w-4.5 h-4.5" />
                    </button>
                </div>
                <div className="flex items-center gap-4 shrink-0">
                    <span className="text-xs text-slate-400">
                        Last updated: {formattedDate}
                    </span>
                    <button
                        onClick={onRefresh}
                        disabled={isRefreshing}
                        className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-white
                                   bg-indigo-600 hover:bg-indigo-700 rounded-lg shadow-sm
                                   transition-all duration-200 disabled:opacity-60 disabled:cursor-not-allowed
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2"
                    >
                        <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
                        {isRefreshing ? 'Syncing…' : 'Refresh Data'}
                    </button>
                </div>
            </div>

            <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
        </>
    )
}
