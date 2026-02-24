'use client'

import { Lightbulb, Loader2, Compass, ArrowRightLeft, CheckCircle2, TrendingUp } from 'lucide-react'

interface KPIs {
    total: number
    inProgress: number
    discovery: number
    movedToWorkstream: number
    done: number
    avgRoi: number
}

interface KpiCardsProps {
    kpis: KPIs
}

const cards = [
    {
        key: 'total' as const,
        label: 'Ideas Submitted',
        icon: Lightbulb,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        accent: 'border-indigo-100',
    },
    {
        key: 'inProgress' as const,
        label: 'In Progress Ideas',
        icon: Loader2,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        accent: 'border-amber-100',
    },
    {
        key: 'discovery' as const,
        label: 'On Discovery',
        icon: Compass,
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        accent: 'border-sky-100',
    },
    {
        key: 'movedToWorkstream' as const,
        label: 'At Workstream',
        icon: ArrowRightLeft,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        accent: 'border-violet-100',
    },
    {
        key: 'done' as const,
        label: 'Completed Ideas',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        accent: 'border-emerald-100',
    },
    {
        key: 'avgRoi' as const,
        label: 'Avg ROI Scoring',
        icon: TrendingUp,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        accent: 'border-violet-100',
    },
]

export function KpiCards({ kpis }: KpiCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
            {cards.map((card) => {
                const value = kpis[card.key]
                const Icon = card.icon

                return (
                    <div
                        key={card.key}
                        className={`bg-white rounded-2xl border ${card.accent} shadow-sm
                                    hover:shadow-md transition-all duration-300 p-5 flex flex-col gap-3
                                    group cursor-default`}
                    >
                        <div className={`${card.bg} ${card.color} w-9 h-9 rounded-xl flex items-center justify-center
                                         group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">
                                {card.key === 'avgRoi' ? value.toFixed(1) : value}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium">{card.label}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
