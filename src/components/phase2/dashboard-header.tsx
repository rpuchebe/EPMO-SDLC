'use client'

import { ListTodo } from 'lucide-react'
import { PhaseHeader } from '@/components/ui/phase-header'

interface DashboardHeaderProps {
    lastSync: string | null
}

export function DashboardHeader({ lastSync }: DashboardHeaderProps) {
    return (
        <PhaseHeader
            icon={ListTodo}
            title="Phase 2 – Portfolio Governance"
            description="Monitor initiative health, project hierarchy compliance, and backlog work item governance. Ensuring portfolio alignment, traceability, and data quality across workstreams."
            lastSync={lastSync}
        />
    )
}
