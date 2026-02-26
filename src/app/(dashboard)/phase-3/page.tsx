'use client'

import { PenTool } from 'lucide-react'
import { PhaseHeader } from '@/components/ui/phase-header'

export default function Phase3Page() {
    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            <PhaseHeader
                icon={PenTool}
                title="Phase 3 – Design"
                description="Track design deliverables, UX reviews, and technical design specification workflows. Ensuring design readiness before development begins."
                lastSync={null}
            />
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 flex flex-col items-center justify-center min-h-[300px]">
                <div className="bg-slate-50 text-slate-400 p-4 rounded-full mb-4">
                    <PenTool className="w-8 h-8" />
                </div>
                <h2 className="text-lg font-semibold text-slate-700 mb-2">Dashboard Coming Soon</h2>
                <p className="text-slate-400 text-center max-w-md text-sm">
                    Phase 3 details, documentation, and specific workflows will be available soon.
                </p>
            </div>
        </div>
    )
}
