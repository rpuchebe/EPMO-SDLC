'use client'

import { AlertTriangle, ShieldAlert, Activity, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'

export interface IncidentKPI {
    id: string
    label: string
    value: number
    deltaAbsolute: number
    deltaPercent: number
    sparkline: number[]
    completedCount: number
    postmortemCount: number
    type: 'total' | 'impact1' | 'impact2'
}

interface IncidentKpiCardsProps {
    kpis: IncidentKPI[]
    activeFilter?: 'total' | 1 | 2
    onFilterChange?: (filter: 'total' | 1 | 2) => void
}

function getDeltaInfo(deltaAbs: number, deltaPct: number, inverseGood = true) {
    const isPositive = deltaAbs > 0
    const isNegative = deltaAbs < 0

    let color = 'text-slate-400'
    let Icon = Minus
    let sign = ''

    // For incidents, positive delta (more incidents) is bad (red), negative delta is good (emerald)
    if (isPositive) {
        color = inverseGood ? 'text-rose-600' : 'text-emerald-600'
        Icon = TrendingUp
        sign = '+'
    } else if (isNegative) {
        color = inverseGood ? 'text-emerald-600' : 'text-rose-600'
        Icon = TrendingDown
        sign = '-'
    }

    const pct = deltaPct === Infinity ? '∞' : Math.abs(deltaPct)

    return { color, Icon, sign, abs: deltaAbs === 0 ? '0' : Math.abs(deltaAbs).toString(), pct }
}

export function IncidentKpiCards({ kpis, activeFilter = 'total', onFilterChange }: IncidentKpiCardsProps) {
    const handleCardClick = (type: string) => {
        if (!onFilterChange) return
        if (type === 'total') onFilterChange('total')
        else if (type === 'impact1') onFilterChange(activeFilter === 1 ? 'total' : 1)
        else if (type === 'impact2') onFilterChange(activeFilter === 2 ? 'total' : 2)
    }

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2 w-full">
            {kpis.map((card) => {
                const deltaInfo = getDeltaInfo(card.deltaAbsolute, card.deltaPercent, true) // inverted = true because incidents are bad
                const sparkData = card.sparkline.map((val: number, i: number) => ({ index: i, value: val }))

                const minVal = card.sparkline.length > 0 ? Math.min(...card.sparkline) : 0
                const sparkMin = minVal === Infinity ? 0 : Math.max(0, minVal - (minVal * 0.1))

                // Configure colors based on type
                let hex = '#2563eb' // blue for total
                let bgClass = 'bg-blue-50'
                let textClass = 'text-blue-600'
                let IconOption = Activity

                if (card.type === 'impact1') {
                    hex = '#ef4444' // red-500
                    bgClass = 'bg-red-50'
                    textClass = 'text-red-600'
                    IconOption = AlertTriangle
                } else if (card.type === 'impact2') {
                    hex = '#eab308' // yellow-500
                    bgClass = 'bg-yellow-50'
                    textClass = 'text-yellow-600'
                    IconOption = ShieldAlert
                }

                const isClickable = !!onFilterChange
                const isActive = activeFilter === 'total' && card.type === 'total' ||
                    activeFilter === 1 && card.type === 'impact1' ||
                    activeFilter === 2 && card.type === 'impact2'

                // Dim unselected cards
                const opacityClass = (activeFilter !== 'total' && !isActive) ? 'opacity-60 saturate-50' : 'opacity-100'

                // Create a soft glowing shadow based on the card color and a clean colored border
                const activeBorderColor = card.type === 'total' ? 'border-blue-500' : card.type === 'impact1' ? 'border-red-500' : 'border-yellow-500'
                const activeRingColor = card.type === 'total' ? 'ring-blue-500/20' : card.type === 'impact1' ? 'ring-red-500/20' : 'ring-yellow-500/20'

                const activeStyleClass = isActive && isClickable
                    ? `border ${activeBorderColor} ring-4 ${activeRingColor} shadow-lg scale-[1.02]`
                    : 'border border-slate-200 hover:border-slate-300'

                return (
                    <button
                        key={card.id}
                        onClick={() => handleCardClick(card.type)}
                        disabled={!isClickable}
                        className={`w-full bg-white rounded-2xl text-left
                                    transition-all duration-300 ease-out cursor-pointer outline-none focus:outline-none focus:ring-0
                                    ${opacityClass} ${activeStyleClass}
                                    p-4 pt-3.5 flex flex-col h-[155px] relative overflow-hidden`}
                        style={{ outline: 'none' }}
                    >
                        {/* Title Row */}
                        <div className="flex items-center gap-1.5 mb-2 relative z-10">
                            <div className={`flex items-center justify-center w-[22px] h-[22px] rounded-lg ${bgClass} ${textClass}`}>
                                <IconOption className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-xs font-medium text-slate-600 truncate">{card.label}</span>
                        </div>

                        {/* Main KPI Value & WoW */}
                        <div className="flex items-end justify-between mb-3 relative z-10">
                            <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight">
                                {card.value}
                            </div>
                            <div className="flex flex-col items-end">
                                <span className={`flex items-center text-[13px] font-bold leading-none ${deltaInfo.color}`}>
                                    {deltaInfo.abs !== '0' && <deltaInfo.Icon className="w-3 h-3 mr-[2px]" strokeWidth={3} />}
                                    {deltaInfo.abs !== '0' ? deltaInfo.abs : '-'}
                                </span>
                                {deltaInfo.abs !== '0' && (
                                    <span className={`text-[10px] font-semibold mt-[2px] opacity-90 ${deltaInfo.color}`}>
                                        ({deltaInfo.pct}%)
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px bg-slate-100 mb-2 relative z-10" />

                        {/* Data Sub-metrics */}
                        <div className="flex flex-col gap-[3px] z-10 relative">
                            <div className="flex justify-between items-center text-[10.5px] leading-tight">
                                <span className="text-slate-500">Completed</span>
                                <span className="font-semibold text-emerald-600">{card.completedCount}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px] leading-tight">
                                <span className="text-slate-500">Postmortems</span>
                                <span className="font-semibold text-slate-700">{card.postmortemCount}</span>
                            </div>
                        </div>

                        {/* Sparkline */}
                        <div className="absolute bottom-0 left-0 right-0 h-[36px] pointer-events-none opacity-50 z-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`grad-${card.id}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={hex} stopOpacity={0.15} />
                                            <stop offset="100%" stopColor={hex} stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <YAxis domain={[sparkMin, 'dataMax']} hide />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={hex}
                                        strokeWidth={1.5}
                                        strokeOpacity={0.5}
                                        fill={`url(#grad-${card.id})`}
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </button>
                )
            })}
        </div>
    )
}
