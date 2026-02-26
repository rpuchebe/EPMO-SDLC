'use client'

import { Lightbulb, Wrench, Search, Compass, ShieldCheck, ListTodo, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'

export interface BaseKPI {
    value: number
    deltaAbsolute: number
    deltaPercent: number
    sparkline: number[]
    avgAge?: number | string
    unassigned?: number
    declined?: number
    oldestTicket?: number | string
    linkedItems?: number
    avgDaysToDone?: number
    completedThisMonth?: number
    readyForDiscovery?: number
}

export interface LinkedItemBreakdown {
    type: string
    count: number
    percentage: number
}

export interface CardMetric {
    label: string
    value: string | number
    isAlert?: boolean
}

export interface PCBs {
    discoveryItems: BaseKPI
    maintenanceRTB: BaseKPI
    waitingForTriage: BaseKPI
    inDiscovery: BaseKPI
    definitionGate: BaseKPI
    atWorkstreamBacklog: BaseKPI
    completedItems: BaseKPI
    linkedItemsBreakdown?: LinkedItemBreakdown[]
}

interface KpiCardsProps {
    kpis: PCBs
    onDrillDown?: (kpiKey: string, label: string) => void
}

function getDeltaInfo(deltaAbs: number, deltaPct: number, inverseGood = false) {
    const isPositive = deltaAbs > 0
    const isNegative = deltaAbs < 0

    let color = 'text-slate-400'
    let Icon = Minus
    let sign = ''

    if (isPositive) {
        color = inverseGood ? 'text-rose-600' : 'text-emerald-600'
        Icon = TrendingUp
        sign = '+'
    } else if (isNegative) {
        color = inverseGood ? 'text-emerald-600' : 'text-rose-600'
        Icon = TrendingDown
        sign = '-'
    }

    // Instead of forcing a sign here, we'll format the absolute value without a prefixed + in the UI
    const pct = deltaPct === Infinity ? '∞' : Math.abs(deltaPct)

    return { color, Icon, sign, abs: deltaAbs === 0 ? '0' : Math.abs(deltaAbs).toString(), pct }
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
        hex: '#059669', // emerald-600
        inverseGood: false
    },
]

export function KpiCards({ kpis, onDrillDown }: KpiCardsProps) {
    // Inject KPI data into the card definitions
    const cardsWithData = cards.map(c => {
        const kpiData = kpis[c.key as keyof Omit<PCBs, 'linkedItemsBreakdown'>]

        let hex = '#2563eb' // default blue-600
        if (c.key === 'discoveryItems') hex = '#4f46e5' // indigo-600
        else if (c.key === 'maintenanceRTB') hex = '#ea580c' // orange-600
        else if (c.key === 'waitingForTriage') hex = '#d97706' // amber-600
        else if (c.key === 'inDiscovery') hex = '#0284c7' // sky-600
        else if (c.key === 'definitionGate') hex = '#7c3aed' // violet-600
        else if (c.key === 'atWorkstreamBacklog') hex = '#2563eb' // blue-600
        else if (c.key === 'completedItems') hex = '#059669' // emerald-600

        let inverseGood = false
        if (c.key === 'waitingForTriage' || c.key === 'atWorkstreamBacklog') {
            inverseGood = true // assuming you want less items waiting
        }

        // Construct metrics array mapping Phase 0 style
        let metrics: CardMetric[] = []

        if (c.key === 'discoveryItems' || c.key === 'maintenanceRTB') {
            metrics = [
                { label: 'Avg age', value: `${kpiData?.avgAge || 0}d` },
                { label: 'Declined', value: `${kpiData?.declined || 0}` },
            ]
        } else if (c.key === 'inDiscovery') {
            metrics = [
                { label: 'Avg age', value: `${kpiData?.avgAge || 0}d` },
                { label: 'Ready for Disc', value: `${kpiData?.readyForDiscovery || 0}` },
            ]
        } else if (c.key === 'definitionGate') {
            metrics = [
                { label: 'Avg age', value: `${kpiData?.avgAge || 0}d` },
                { label: 'Unassigned', value: `${kpiData?.unassigned || 0}`, isAlert: (kpiData?.unassigned || 0) > 0 },
            ]
        } else if (c.key === 'waitingForTriage') {
            metrics = [
                { label: 'Oldest ticket', value: `${kpiData?.oldestTicket || 0}d` },
                { label: 'Unassigned', value: `${kpiData?.unassigned || 0}`, isAlert: (kpiData?.unassigned || 0) > 0 },
            ]
        } else if (c.key === 'atWorkstreamBacklog') {
            metrics = [
                { label: 'Total Linked', value: `${kpiData?.linkedItems || 0}` },
                { label: 'Workstreams', value: '-' },
            ]
        } else if (c.key === 'completedItems') {
            metrics = [
                { label: 'Avg days to done', value: `${kpiData?.avgDaysToDone || 0}d` },
                { label: 'Completed this mth', value: `${kpiData?.completedThisMonth || 0}` },
            ]
        }

        return {
            ...c,
            hex,
            inverseGood,
            data: kpiData,
            metrics
        }
    })

    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            {cardsWithData.map((card) => {
                const isClickable = !!onDrillDown
                const deltaInfo = getDeltaInfo(card.data.deltaAbsolute, card.data.deltaPercent, card.inverseGood)
                const sparkData = card.data.sparkline.map((val: number, i: number) => ({ index: i, value: val }))

                const minVal = Math.min(...card.data.sparkline)
                const sparkMin = Math.max(0, minVal - (minVal * 0.1))

                return (
                    <div
                        key={card.key}
                        onClick={isClickable ? () => onDrillDown(card.key, card.label) : undefined}
                        className={`bg-white rounded-2xl border border-slate-200 shadow-sm
                                    hover:shadow-md hover:border-slate-300 transition-all duration-200 
                                    p-4 pt-3.5 flex flex-col h-[155px] relative overflow-hidden
                                    ${isClickable ? 'cursor-pointer' : 'cursor-default'}`}
                    >
                        {/* Title Row */}
                        <div className="flex items-center gap-1.5 mb-2 relative z-10">
                            <div className={`flex items-center justify-center w-[22px] h-[22px] rounded-lg ${card.bg} ${card.color}`}>
                                <card.icon className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[12px] font-medium text-slate-600 truncate">{card.label}</span>
                        </div>

                        {/* Main KPI Value & WoW */}
                        <div className="flex items-end justify-between mb-3 relative z-10">
                            <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight">
                                {card.data.value}
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
                                {deltaInfo.abs === '0' && (
                                    <span className="text-[10px] font-medium mt-[2px] text-slate-400">
                                        no change
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Divider */}
                        <div className="w-full h-px bg-slate-100 mb-2 relative z-10 outline-none border-none"></div>

                        {/* Data Sub-metrics */}
                        <div className="flex flex-col gap-[3px] z-10 relative">
                            {card.metrics.map((m, i) => (
                                <div key={i} className="flex justify-between items-center text-[10.5px] leading-tight">
                                    <span className={`flex items-center ${m.isAlert ? 'text-amber-700 font-medium' : 'text-slate-500'}`}>
                                        {m.isAlert && <span className="mr-1 text-sm leading-none">⚠️</span>}
                                        {m.label}
                                    </span>
                                    <span className={`font-semibold ${m.isAlert ? 'text-amber-700' : 'text-slate-700'}`}>
                                        {m.value}
                                    </span>
                                </div>
                            ))}
                        </div>

                        {/* Sparkline chart at very bottom (behind) */}
                        <div className="absolute bottom-0 left-0 right-0 h-[36px] pointer-events-none opacity-50 z-0">
                            <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                                    <defs>
                                        <linearGradient id={`grad-${card.key}`} x1="0" y1="0" x2="0" y2="1">
                                            <stop offset="0%" stopColor={card.hex} stopOpacity={0.15} />
                                            <stop offset="100%" stopColor={card.hex} stopOpacity={0.0} />
                                        </linearGradient>
                                    </defs>
                                    <YAxis domain={[sparkMin, 'dataMax']} hide />
                                    <Area
                                        type="monotone"
                                        dataKey="value"
                                        stroke={card.hex}
                                        strokeWidth={1.5}
                                        strokeOpacity={0.5}
                                        fill={`url(#grad-${card.key})`}
                                        isAnimationActive={false}
                                    />
                                </AreaChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                )
            })}
        </div>
    )
}
