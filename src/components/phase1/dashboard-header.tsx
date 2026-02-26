'use client'

import { useState } from 'react'
import { Compass, Info } from 'lucide-react'
import { InfoModal } from './info-modal'
import { PhaseHeader } from '@/components/ui/phase-header'

interface DashboardHeaderProps {
    lastSync: string | null
}

export function DashboardHeader({ lastSync }: DashboardHeaderProps) {
    const [infoOpen, setInfoOpen] = useState(false)

    return (
        <>
            <PhaseHeader
                icon={Compass}
                title="Phase 1 – Discovery & Analysis"
                description="Monitor discovery workflows, triage efficiency, and workstream backlog distribution. Tracking items from intake through definition gate to workstream allocation."
                lastSync={lastSync}
            />

            <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
        </>
    )
}
