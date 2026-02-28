'use client'

import { useSearchParams } from 'next/navigation'
import { Map } from 'lucide-react'
import { PhaseHeader } from '@/components/ui/phase-header'
import { RoadmapClient } from './roadmap-client'

export function Phase3Content({ isAdmin }: { isAdmin: boolean }) {
    const searchParams = useSearchParams()
    const workstream = searchParams.get('workstream') || 'All Workstreams'

    return (
        <div className="flex flex-col gap-0 w-full animate-in fade-in duration-500">
            <PhaseHeader
                icon={Map}
                title="Phase 3 – Roadmap"
                description="Full hierarchy Gantt view: Workstream Initiatives → Projects → BWIs → Tasks. Track start/due dates, completion progress, and surface missing-date warnings."
                lastSync={null}
                workstream={workstream}
            />
            <RoadmapClient isAdmin={isAdmin} workstream={workstream} />
        </div>
    )
}
