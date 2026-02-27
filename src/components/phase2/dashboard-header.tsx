'use client'

import { ListTodo } from 'lucide-react'
import { PhaseHeader } from '@/components/ui/phase-header'

interface DashboardHeaderProps {
    lastSync: string | null
    workstream?: string
}

export function DashboardHeader({ lastSync, workstream }: DashboardHeaderProps) {
    const displayTitle = workstream && workstream !== 'All Workstreams'
        ? `Phase 2 – ${workstream}`
        : "Phase 2 – Portfolio Governance"

    return (
        <PhaseHeader
            icon={ListTodo}
            title={displayTitle}
            description="Monitor initiative health, project hierarchy compliance, and backlog work item governance. Ensuring portfolio alignment, traceability, and data quality across workstreams."
            lastSync={lastSync}
        />
    )
}
