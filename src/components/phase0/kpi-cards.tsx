'use client'

import { Lightbulb, Loader2, Compass, ArrowRightLeft, CheckCircle2, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
export interface BaseKPI {
    value: number
    deltaAbsolute: number
    deltaPercent: number
    sparkline: number[]
}

export interface IdeasSubmittedKPI extends BaseKPI {
    wontDo: number
    wontDoPercent: number
    conversionToDiscovery: number
}

export interface ReadyForDiscoveryKPI extends BaseKPI {
    avgAgeDays: number
    over14DaysCount: number
}

export interface OnDiscoveryKPI extends BaseKPI {
    avgDaysToStart: number
    conversionFromSubmitted: number
}

export interface AtWorkstreamKPI extends BaseKPI {
    avgDaysToWorkstream: number
    conversionFromDiscovery: number
}

export interface CompletedIdeasKPI extends BaseKPI {
    completionRate: number
    avgDaysToCompletion: number
}

export interface AvgRoiScoringKPI extends BaseKPI {
    medianRoi: number
    top10Roi: number
}

export interface KPIs {
    ideasSubmitted: IdeasSubmittedKPI
    readyForDiscoveryIdeas: ReadyForDiscoveryKPI
    onDiscovery: OnDiscoveryKPI
    atWorkstream: AtWorkstreamKPI
    completedIdeas: CompletedIdeasKPI
    avgRoiScoring: AvgRoiScoringKPI
}

type CardMetric = { label: string; value: string | number; isAlert?: boolean }

interface KpiCardsProps {
    kpis: KPIs
    onDrillDown?: (kpiKey: string, label: string) => void
}

function getDeltaInfo(deltaAbs: number, deltaPct: number, inverseGood = false) {
    const isPositive = deltaAbs > 0
    const isNegative = deltaAbs < 0

    let color = 'text-slate-400'
    let Icon = Minus
    let sign = ''

    if (isPositive) {
        color = inverseGood ? 'text-red-500' : 'text-emerald-500'
        Icon = TrendingUp
        sign = '+'
    } else if (isNegative) {
        color = inverseGood ? 'text-emerald-500' : 'text-red-500'
        Icon = TrendingDown
        sign = '' // negative built in
    }

    return {
        abs: `${sign}${deltaAbs}`,
        pct: `${sign}${deltaPct}`,
        color,
        Icon,
    }
}

export function KpiCards({ kpis, onDrillDown }: KpiCardsProps) {
    if (!kpis || !kpis.ideasSubmitted) return null

    const cards = [
        {
            key: 'ideasSubmitted' as const,
            label: 'Ideas Submitted',
            icon: Lightbulb,
            colorCls: 'text-indigo-600',
            bgCls: 'bg-indigo-50',
            hex: '#4f46e5',
            data: kpis.ideasSubmitted,
            inverseGood: false,
            metrics: [
                { label: "Won't Do", value: `${kpis.ideasSubmitted.wontDo} (${kpis.ideasSubmitted.wontDoPercent}%)` },
                { label: 'Conv. to Discovery', value: `${kpis.ideasSubmitted.conversionToDiscovery}%` },
            ] as CardMetric[]
        },
        {
            key: 'readyForDiscoveryIdeas' as const,
            label: 'Ready for Discovery',
            icon: Loader2,
            colorCls: 'text-amber-600',
            bgCls: 'bg-amber-50',
            hex: '#d97706',
            data: kpis.readyForDiscoveryIdeas,
            inverseGood: true,
            metrics: [
                { label: 'Avg age', value: `${kpis.readyForDiscoveryIdeas.avgAgeDays}d` },
                { label: `${kpis.readyForDiscoveryIdeas.over14DaysCount} over 14d`, value: '', isAlert: kpis.readyForDiscoveryIdeas.over14DaysCount > 0 },
            ] as CardMetric[]
        },
        {
            key: 'onDiscovery' as const,
            label: 'On Discovery',
            icon: Compass,
            colorCls: 'text-sky-600',
            bgCls: 'bg-sky-50',
            hex: '#0284c7',
            data: kpis.onDiscovery,
            inverseGood: false,
            metrics: [
                { label: 'Avg days to start', value: `${kpis.onDiscovery.avgDaysToStart}d` },
                { label: 'Conv. from Subm.', value: `${kpis.onDiscovery.conversionFromSubmitted}%` },
            ] as CardMetric[]
        },
        {
            key: 'atWorkstream' as const,
            label: 'At Workstream',
            icon: ArrowRightLeft,
            colorCls: 'text-violet-600',
            bgCls: 'bg-violet-50',
            hex: '#7c3aed',
            data: kpis.atWorkstream,
            inverseGood: false,
            metrics: [
                { label: 'Conv. from Disc.', value: `${kpis.atWorkstream.conversionFromDiscovery}%` },
                { label: 'Avg days to ws', value: `${kpis.atWorkstream.avgDaysToWorkstream}d` },
            ] as CardMetric[]
        },
        {
            key: 'completedIdeas' as const,
            label: 'Completed Ideas',
            icon: CheckCircle2,
            colorCls: 'text-emerald-600',
            bgCls: 'bg-emerald-50',
            hex: '#10b981',
            data: kpis.completedIdeas,
            inverseGood: false,
            metrics: [
                { label: 'Completion Rate', value: `${kpis.completedIdeas.completionRate}%` },
                { label: 'Avg days to done', value: `${kpis.completedIdeas.avgDaysToCompletion}d` },
            ] as CardMetric[]
        },
        {
            key: 'avgRoiScoring' as const,
            label: 'Avg ROI Scoring',
            icon: TrendingUp,
            colorCls: 'text-rose-600',
            bgCls: 'bg-rose-50',
            hex: '#e11d48',
            data: kpis.avgRoiScoring,
            inverseGood: false,
            metrics: [
                { label: 'Median', value: kpis.avgRoiScoring.medianRoi?.toFixed(1) || '0' },
                { label: 'Top 10% Threshold', value: kpis.avgRoiScoring.top10Roi?.toFixed(1) || '0' },
            ] as CardMetric[]
        },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {cards.map((card) => {
                const isClickable = onDrillDown && card.key !== 'avgRoiScoring'
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
                            <div className={`flex items-center justify-center w-[22px] h-[22px] rounded-lg ${card.bgCls} ${card.colorCls}`}>
                                <card.icon className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[12px] font-medium text-slate-600 truncate">{card.label}</span>
                        </div>

                        {/* Main KPI Value & WoW */}
                        <div className="flex items-end justify-between mb-3 relative z-10">
                            <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight">
                                {card.key === 'avgRoiScoring' ? Number(card.data.value).toFixed(1) : card.data.value}
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
