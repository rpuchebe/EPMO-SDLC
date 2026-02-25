'use client'

import { useState } from 'react'

interface DashboardHeaderProps {
    lastSync: string | null
}

export function DashboardHeader({ lastSync }: DashboardHeaderProps) {
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
        <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
                <h1 className="text-2xl font-bold text-slate-900 tracking-tight">
                    Phase 2 – Portfolio Governance
                </h1>
            </div>
            <span className="text-xs text-slate-400">
                Last updated: {formattedDate}
            </span>
        </div>
    )
}
