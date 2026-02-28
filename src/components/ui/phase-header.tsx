'use client'

import { Clock } from 'lucide-react'
import { type LucideIcon } from 'lucide-react'

interface PhaseHeaderProps {
    icon: LucideIcon
    title: string
    description: string
    lastSync: string | null
    workstream?: string
}

export function PhaseHeader({ icon: Icon, title, description, lastSync, workstream }: PhaseHeaderProps) {
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

    const displayTitle = workstream && workstream !== 'All Workstreams'
        ? `${title.split(' – ')[0]} – ${workstream}`
        : title

    return (
        <div
            className="rounded-2xl p-6 shadow-lg mb-4"
            style={{
                background: 'linear-gradient(135deg, #0a2622 0%, #0f3530 30%, #143d37 60%, #1a4a42 100%)',
            }}
        >
            <div className="flex items-start justify-between">
                <div className="flex items-start gap-4">
                    <div className="p-3 rounded-xl" style={{ background: 'rgba(166, 215, 195, 0.12)' }}>
                        <Icon className="w-6 h-6" style={{ color: '#8dd4b0' }} />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">
                            {displayTitle}
                        </h1>
                        <p className="text-sm mt-1.5 max-w-2xl leading-relaxed" style={{ color: '#9dbfb3' }}>
                            {description}
                        </p>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1 shrink-0">
                    <span
                        className="inline-flex items-center gap-1.5 text-[11px] rounded-md px-2 py-0.5"
                        style={{ background: 'rgba(166, 215, 195, 0.06)', color: '#6b9e8a' }}
                    >
                        <span className="w-1.5 h-1.5 rounded-full animate-pulse" style={{ background: '#5ec492' }} />
                        Auto-sync daily at 2:00 AM (EST)
                    </span>
                    <div
                        className="flex items-center gap-1.5 rounded-lg px-3 py-1.5"
                        style={{ background: 'rgba(166, 215, 195, 0.08)', border: '1px solid rgba(166, 215, 195, 0.12)' }}
                    >
                        <Clock className="w-3.5 h-3.5" style={{ color: '#6b9e8a' }} />
                        <span className="text-xs" style={{ color: '#8bb8a3' }}>
                            Last sync: {formattedDate}
                        </span>
                    </div>
                </div>
            </div>
        </div>
    )
}
