import { Server } from 'lucide-react'

export default function StabilityOverviewPage() {
    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 flex flex-col items-center justify-center min-h-[400px]">
                <div className="bg-purple-50 text-purple-600 p-4 rounded-full mb-4">
                    <Server className="w-8 h-8" />
                </div>
                <h1 className="text-2xl font-bold text-slate-900 mb-2">Stability & Scalability - Overview</h1>
                <p className="text-slate-500 text-center max-w-md">
                    This section is currently under construction. Infrastructure health, scaling metrics, and stability reports will be available soon.
                </p>
            </div>
        </div>
    )
}
