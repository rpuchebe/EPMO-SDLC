'use client'

import { useState } from 'react'
import { Lightbulb, Info } from 'lucide-react'
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
                icon={Lightbulb}
                title="Phase 0 – Ideation & Intake"
                description="Track idea submissions, discovery pipeline, workstream allocation, and innovation metrics. Governing the intake funnel from ideation to prioritized backlog."
                lastSync={lastSync}
            />

            <InfoModal open={infoOpen} onClose={() => setInfoOpen(false)} />
        </>
    )
}
