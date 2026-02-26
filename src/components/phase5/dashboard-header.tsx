'use client'

import { Rocket } from 'lucide-react'
import { PhaseHeader } from '@/components/ui/phase-header'

interface DashboardHeaderProps {
    lastSync: string | null
    onRefresh: () => void
    isRefreshing: boolean
}

export function DashboardHeader({ lastSync, onRefresh, isRefreshing }: DashboardHeaderProps) {
    return (
        <PhaseHeader
            icon={Rocket}
            title="Phase 5 – Deployment & Release Governance"
            description="Monitor deployment performance, governance compliance, risk indicators, and operational stability across all workstreams. Ensuring controlled, predictable, and auditable releases."
            lastSync={lastSync}
        />
    )
}
