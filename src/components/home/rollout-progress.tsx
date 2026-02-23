import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function RolloutProgress({ phases }: { phases: any[] }) {
    // Sort by order_index just in case
    const sortedPhases = [...phases].sort((a, b) => a.order_index - b.order_index)

    // Calculate overall weighted progress
    let totalWeight = 0;
    let weightedCompleted = 0;

    sortedPhases.forEach(p => {
        totalWeight += p.weight || 0;
        weightedCompleted += (p.weight || 0) * (p.completion_percentage || 0);
    });

    const overallProgress = totalWeight > 0 ? Math.round(weightedCompleted / totalWeight) : 0;

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <div>
                    <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                        SDLC Rollout Progress
                    </h2>
                    <p className="text-sm text-slate-500 mt-1">Overall program execution timeline</p>
                </div>

                <div className="flex flex-col items-end">
                    <span className="text-3xl font-bold tracking-tight text-blue-600">{overallProgress}%</span>
                    <span className="text-xs font-medium text-slate-500 uppercase tracking-wider">Overall Completion</span>
                </div>
            </div>

            <div className="p-6 overflow-x-auto">
                <div className="min-w-[800px]">
                    {/* Main Progress Bar Container */}
                    <div className="w-full bg-slate-100 h-10 rounded-lg flex overflow-hidden mb-6 relative">
                        {sortedPhases.map((phase) => {
                            // Calculate proportion of width based on weight
                            const width = totalWeight > 0 ? `${((phase.weight || 0) / totalWeight) * 100}%` : '0%';

                            // Determine fill level
                            const pct = phase.completion_percentage || 0;
                            const statusColors: Record<string, string> = {
                                'completed': 'bg-emerald-500',
                                'in_progress': 'bg-blue-500',
                                'pending': 'bg-slate-300',
                                'at_risk': 'bg-red-500'
                            }
                            const color = statusColors[phase.status] || 'bg-slate-300';

                            return (
                                <div
                                    key={phase.id}
                                    style={{ width }}
                                    className="h-full border-r border-white/20 last:border-0 relative group"
                                >
                                    {/* Background Track */}
                                    <div className="absolute inset-0 bg-slate-200/50"></div>
                                    {/* Fill progress inside this phase block */}
                                    <div
                                        className={cn("absolute inset-y-0 left-0 transition-all duration-1000", color)}
                                        style={{ width: `${pct}%` }}
                                    ></div>

                                    {/* Label overlay */}
                                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                        <span className={cn(
                                            "text-xs font-semibold px-2 truncate mix-blend-difference text-white"
                                        )}>
                                            {phase.name.split(' – ')[0] /* just the short wave name if possible */}
                                        </span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Details Grid */}
                    <div className="grid grid-cols-5 gap-4">
                        {sortedPhases.map((phase) => (
                            <div key={phase.id} className="flex flex-col gap-1">
                                <h4 className="text-xs font-bold text-slate-800 leading-tight">
                                    {phase.name}
                                </h4>
                                <div className="flex items-center justify-between mt-1">
                                    <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                                        {phase.status.replace('_', ' ')}
                                    </span>
                                    <span className="text-xs font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                                        {phase.completion_percentage}%
                                    </span>
                                </div>
                                <p className="text-[11px] text-slate-500 mt-1 line-clamp-2">
                                    {phase.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}
