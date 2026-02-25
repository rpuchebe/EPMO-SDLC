'use client'

import { LucideIcon } from 'lucide-react'

export interface KpiCardData {
    key: string
    label: string
    value: number | string
    icon: LucideIcon
    color: string
    bg: string
    accent: string
    subIndicator?: React.ReactNode
    onSubIndicatorClick?: (e: React.MouseEvent) => void
}

interface KpiCardsProps {
    cards: KpiCardData[]
    onDrillDown: (kpiKey: string, payload?: any) => void
}

export function KpiCards({ cards, onDrillDown }: KpiCardsProps) {
    return (
        <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-4">
            {cards.map((card) => {
                const Icon = card.icon
                return (
                    <div
                        key={card.key}
                        onClick={() => onDrillDown(card.key)}
                        className={`bg-white rounded-2xl border ${card.accent} shadow-sm
                                    hover:shadow-md transition-all duration-300 p-4 flex flex-col gap-3
                                    group flex-1 cursor-pointer`}
                    >
                        <div className={`${card.bg} ${card.color} w-9 h-9 rounded-xl flex items-center justify-center
                                         group-hover:scale-110 transition-transform duration-300`}>
                            <Icon className="w-4.5 h-4.5" />
                        </div>
                        <div>
                            <p className="text-2xl font-bold text-slate-900 tracking-tight">
                                {card.value}
                            </p>
                            <p className="text-xs text-slate-500 mt-0.5 font-medium leading-tight">{card.label}</p>

                            {card.subIndicator && (
                                <div className="mt-2" onClick={(e) => {
                                    if (card.onSubIndicatorClick) {
                                        e.stopPropagation()
                                        card.onSubIndicatorClick(e)
                                    }
                                }}>
                                    {card.subIndicator}
                                </div>
                            )}
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
