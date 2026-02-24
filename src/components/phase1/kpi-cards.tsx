'use client'

import { Lightbulb, Wrench, Search, Compass, ShieldCheck, ListTodo, CheckCircle2 } from 'lucide-react'

interface LinkedItemBreakdown {
    type: string
    count: number
    percentage: number
}

interface KPIs {
    discoveryItems: number
    maintenanceRTB: number
    waitingForTriage: number
    inDiscovery: number
    definitionGate: number
    atWorkstreamBacklog: number
    completedItems: number
    linkedItemsBreakdown?: LinkedItemBreakdown[]
}

interface KpiCardsProps {
    kpis: KPIs
    onDrillDown?: (kpiKey: string, label: string) => void
}

const cards = [
    {
        key: 'discoveryItems' as const,
        label: 'Discovery Items',
        icon: Lightbulb,
        color: 'text-indigo-600',
        bg: 'bg-indigo-50',
        accent: 'border-indigo-100',
    },
    {
        key: 'maintenanceRTB' as const,
        label: 'Maintenance (RTB)',
        icon: Wrench,
        color: 'text-orange-600',
        bg: 'bg-orange-50',
        accent: 'border-orange-100',
    },
    {
        key: 'waitingForTriage' as const,
        label: 'Waiting for triage',
        icon: Search,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        accent: 'border-amber-100',
    },
    {
        key: 'inDiscovery' as const,
        label: 'In Discovery',
        icon: Compass,
        color: 'text-sky-600',
        bg: 'bg-sky-50',
        accent: 'border-sky-100',
    },
    {
        key: 'definitionGate' as const,
        label: 'Definition Gate',
        icon: ShieldCheck,
        color: 'text-violet-600',
        bg: 'bg-violet-50',
        accent: 'border-violet-100',
    },
    {
        key: 'atWorkstreamBacklog' as const,
        label: 'At workstream backlog',
        icon: ListTodo,
        color: 'text-blue-600',
        bg: 'bg-blue-50',
        accent: 'border-blue-100',
    },
    {
        key: 'completedItems' as const,
        label: 'Completed items',
        icon: CheckCircle2,
        color: 'text-emerald-600',
        bg: 'bg-emerald-50',
        accent: 'border-emerald-100',
    },
]

export function KpiCards({ kpis, onDrillDown }: KpiCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            {cards.map((card) => {
                const value = kpis[card.key]
                const Icon = card.icon
                const isClickable = !!onDrillDown

                return (
                    <div
                        key={card.key}
                        onClick={isClickable ? () => onDrillDown(card.key, card.label) : undefined}
                        className={`bg-white rounded-2xl border ${card.accent} shadow-sm
                                    hover:shadow-md transition-all duration-300 p-4 flex flex-col gap-3
                                    group flex-1 ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                        <div className={`${card.bg} ${card.color} w-9 h-9 rounded-xl flex items-center justify-center
                                         group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">
                                {value}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium leading-tight">{card.label}</p>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
