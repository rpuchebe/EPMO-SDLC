'use client'
import { useState, useMemo } from 'react'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'
import { CheckCircle2, Circle, Loader2, Calendar, ChevronDown, ChevronRight } from 'lucide-react'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

export function RolloutProgress({ phases }: { phases: any[] }) {
    const sortedPhases = useMemo(() => [...phases].sort((a, b) => a.order_index - b.order_index), [phases])

    // Find the current active index by default (first in_progress, else last completed, else 0)
    const [activeIndex, setActiveIndex] = useState(() => {
        const inProgressIdx = sortedPhases.findIndex(p => p.status === 'in_progress');
        if (inProgressIdx !== -1) return inProgressIdx;
        const lastCompleted = sortedPhases.map(p => p.status).lastIndexOf('completed');
        if (lastCompleted !== -1) return lastCompleted;
        return 0;
    });

    const [isExpanded, setIsExpanded] = useState(true);

    // Calculate overall weighted progress
    const overallProgress = useMemo(() => {
        let totalWeight = 0;
        let weightedCompleted = 0;
        sortedPhases.forEach(p => {
            totalWeight += p.weight || 0;
            weightedCompleted += (p.weight || 0) * (p.completion_percentage || 0);
        });
        return totalWeight > 0 ? Math.round(weightedCompleted / totalWeight) : 0;
    }, [sortedPhases]);

    const activePhase = sortedPhases[activeIndex];

    if (!activePhase) return null;

    // Determine overall start and end dates
    const programStartDate = sortedPhases[0]?.planned_start;
    const programEndDate = sortedPhases[sortedPhases.length - 1]?.planned_end;

    // Format strings carefully
    const formatDate = (dateStr: string) => {
        if (!dateStr) return 'TBD';
        const [year, month, day] = dateStr.split('-');
        const d = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
        return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    }

    // Determine Status
    const today = new Date();
    // find the first phase that is not completed
    const currentPhaseForStatus = sortedPhases.find(p => p.status !== 'completed') || sortedPhases[sortedPhases.length - 1];

    let statusText = "On Track";
    let statusColor = "text-emerald-600 bg-emerald-50";
    if (currentPhaseForStatus && currentPhaseForStatus.planned_end) {
        const [y, m, d] = currentPhaseForStatus.planned_end.split('-');
        const endDate = new Date(parseInt(y), parseInt(m) - 1, parseInt(d));
        // simple logic: if today > planned_end of current phase and it's not complete -> delayed
        if (today > endDate && currentPhaseForStatus.completion_percentage < 100) {
            statusText = "Delayed";
            statusColor = "text-red-600 bg-red-50";
        }
    }

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-4">
            {/* Header Section */}
            <div className="p-6 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div className="flex flex-col gap-2">
                    <div className="flex flex-wrap items-center gap-3">
                        <h2 className="text-xl font-bold text-slate-900">
                            SDLC Rollout Progress
                        </h2>
                        <span className={cn("text-xs font-bold uppercase tracking-wider px-2 py-1 rounded-md", statusColor)}>
                            {statusText}
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-3">
                    <div className="flex flex-col items-end">
                        <span className="text-2xl font-bold tracking-tight text-blue-600">{overallProgress}%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Progress</span>
                    </div>
                </div>
            </div>

            <div className="px-8 pb-8">
                <div className="flex gap-4 w-full mb-6">
                    {sortedPhases.map((phase, idx) => {
                        const isCompleted = phase.status === 'completed';
                        const isInProgress = phase.status === 'in_progress';
                        const isActive = idx === activeIndex;
                        const pct = phase.completion_percentage || 0;

                        return (
                            <button
                                key={phase.id}
                                onClick={() => setActiveIndex(idx)}
                                className={cn(
                                    "flex-1 flex flex-col gap-3 transition-all p-2 -m-2 rounded-lg text-left",
                                    isActive ? "bg-slate-50" : "hover:bg-slate-50 opacity-90 hover:opacity-100"
                                )}
                            >
                                {/* Top Bar Section */}
                                <div className="h-2 w-full bg-slate-200 rounded-full flex relative overflow-hidden">
                                    {isCompleted && (
                                        <div className="absolute inset-0 bg-[#00d084] rounded-full"></div>
                                    )}
                                    {isInProgress && (
                                        <>
                                            {/* Solid part */}
                                            <div
                                                className="h-full bg-[#00d084] relative z-10 rounded-l-full"
                                                style={{ width: `${pct}%` }}
                                            ></div>
                                            {/* Striped remaining part */}
                                            <div
                                                className="h-full absolute inset-0 z-0 opacity-50"
                                                style={{
                                                    backgroundImage: 'repeating-linear-gradient(-45deg, transparent, transparent 4px, #00d084 4px, #00d084 6px)',
                                                    backgroundSize: '14px 14px'
                                                }}
                                            ></div>
                                        </>
                                    )}
                                </div>

                                {/* Label Section */}
                                <div className="flex items-center gap-2">
                                    {isCompleted ? (
                                        <CheckCircle2 className="w-5 h-5 text-[#00d084] fill-[#00d084] text-white shrink-0" />
                                    ) : isInProgress ? (
                                        <Loader2 className="w-5 h-5 text-[#00d084] shrink-0" strokeWidth={3} />
                                    ) : (
                                        <Circle className="w-5 h-5 text-slate-300 shrink-0" strokeWidth={2.5} />
                                    )}
                                    <span className={cn(
                                        "text-sm font-semibold truncate",
                                        isCompleted || isInProgress ? "text-slate-900" : "text-slate-500"
                                    )}>
                                        {/* Usually we just want a short name here as in the image */}
                                        {phase.name.split(' – ')[0]}
                                    </span>
                                </div>
                            </button>
                        )
                    })}
                </div>

                {/* Active Details Section */}
                <div className="pt-2">
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="flex items-center gap-3 mb-1 w-full text-left group cursor-pointer"
                    >
                        {isExpanded ? (
                            <ChevronDown className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 -ml-1" />
                        ) : (
                            <ChevronRight className="w-5 h-5 text-slate-400 group-hover:text-slate-600 transition-colors shrink-0 -ml-1" />
                        )}
                        <h3 className="text-base font-bold text-slate-900 group-hover:text-blue-600 transition-colors">{activePhase.name}</h3>
                        <div className="flex items-center gap-1.5 text-xs font-medium text-slate-400">
                            <Calendar className="w-3 h-3 text-slate-300" />
                            <span>{formatDate(activePhase.planned_start)}</span>
                            <span>-</span>
                            <span>{formatDate(activePhase.planned_end)}</span>
                        </div>
                    </button>
                    {isExpanded && (
                        <div className="pl-7 mt-2">
                            <p className="text-slate-500 leading-relaxed text-sm whitespace-pre-line">
                                {activePhase.description}
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
