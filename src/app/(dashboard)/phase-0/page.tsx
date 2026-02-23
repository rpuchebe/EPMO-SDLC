import { Lightbulb } from 'lucide-react'

export default function Phase0Page() {
    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="bg-blue-50 text-blue-600 p-4 rounded-full mb-4">
                    <Lightbulb className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Phase 0 – Ideation</h1>
                <p className="text-slate-500 text-center max-w-md">
                    This section is currently under construction. Phase details, documentation, and specific workflows will be available soon.
                </p>
            </div>
        </div>
    )
}
