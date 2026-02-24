'use client'

import { useState } from 'react'
import { Info } from 'lucide-react'
import { InfoModal } from './info-modal'

interface DashboardHeaderProps {
    lastSync: string | null
}

export function DashboardHeader({ lastSync }: DashboardHeaderProps) {
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
                        Dashboard - Discovery
                    </h1>
                    <button
                        onClick={() => setInfoOpen(true)}
                        className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50
                                   p-1.5 rounded-lg transition-all duration-200"
                        title="About Phase 1"
                    >
                        <Info className="w-4.5 h-4.5" />
                    </button>
                </div>
                <span className="text-xs text-slate-400">
                    Last updated: {formattedDate}
                </span>
            </div>

            <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
        </>
    )
}
