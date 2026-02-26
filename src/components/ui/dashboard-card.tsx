'use client'

import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { AreaChart, Area, ResponsiveContainer, YAxis } from 'recharts'
import { type LucideIcon } from 'lucide-react'

// ── Types ──────────────────────────────────────────────

export interface DashboardCardMetric {
    label: string
    value: string | number
    isAlert?: boolean
}

export interface DashboardCardProps {
    /** Unique key used for gradient IDs — must be unique per card on page */
    id: string
    /** Card title shown next to the icon */
    label: string
    /** Lucide icon component */
    icon: LucideIcon
    /** Tailwind text color class for the icon (e.g. 'text-indigo-600') */
    iconColor: string
    /** Tailwind bg class for the icon wrapper (e.g. 'bg-indigo-50') */
    iconBg: string
    /** Hex color used for the sparkline and gradient (e.g. '#4f46e5') */
    accentHex: string
    /** The main KPI number displayed large */
    value: string | number
    /** Absolute change vs previous period */
    deltaAbsolute: number
    /** Percentage change vs previous period */
    deltaPercent: number
    /** When true, a decrease is good (green) and increase is bad (red) */
    inverseGood?: boolean
    /** Two additional sub-metrics shown below the divider */
    metrics?: DashboardCardMetric[]
    /** Array of numbers for the background sparkline */
    sparkline?: number[]
    /** Click handler — makes the card clickable */
    onClick?: () => void
}

// ── Internals ──────────────────────────────────────────

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
        sign = ''
    }

    const pctDisplay = deltaPct === Infinity ? '∞' : `${sign}${deltaPct}`
    const absDisplay = deltaAbs === 0 ? '0' : `${sign}${deltaAbs}`

    return { absDisplay, pctDisplay, color, Icon, isZero: deltaAbs === 0 }
}

// ── Component ──────────────────────────────────────────

export function DashboardCard({
    id,
    label,
    icon: CardIcon,
    iconColor,
    iconBg,
    accentHex,
    value,
    deltaAbsolute,
    deltaPercent,
    inverseGood = false,
    metrics = [],
    sparkline = [],
    onClick,
}: DashboardCardProps) {
    const delta = getDeltaInfo(deltaAbsolute, deltaPercent, inverseGood)
    const sparkData = sparkline.map((val, i) => ({ index: i, value: val }))
    const minVal = sparkline.length > 0 ? Math.min(...sparkline) : 0
    const sparkMin = Math.max(0, minVal - minVal * 0.1)
    const gradientId = `dc-grad-${id}`

    return (
        <div
            onClick={onClick}
            className={`bg-white rounded-2xl border border-slate-200 shadow-sm
                        hover:shadow-md hover:border-slate-300 transition-all duration-200
                        p-4 pt-3.5 flex flex-col h-[155px] relative overflow-hidden
                        ${onClick ? 'cursor-pointer' : 'cursor-default'}`}
        >
            {/* Row 1 — Icon + Title */}
            <div className="flex items-center gap-1.5 mb-2 relative z-10">
                <div className={`flex items-center justify-center w-[22px] h-[22px] rounded-lg ${iconBg} ${iconColor}`}>
                    <CardIcon className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <span className="text-[12px] font-medium text-slate-600 truncate">{label}</span>
            </div>

            {/* Row 2 — Main Value + Trend */}
            <div className="flex items-end justify-between mb-3 relative z-10">
                <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight">
                    {value}
                </div>
                <div className="flex flex-col items-end">
                    <span className={`flex items-center text-[13px] font-bold leading-none ${delta.color}`}>
                        {!delta.isZero && <delta.Icon className="w-3 h-3 mr-[2px]" strokeWidth={3} />}
                        {delta.isZero ? '-' : delta.absDisplay}
                    </span>
                    {!delta.isZero && (
                        <span className={`text-[10px] font-semibold mt-[2px] opacity-90 ${delta.color}`}>
                            ({delta.pctDisplay}%)
                        </span>
                    )}
                </div>
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-slate-100 mb-2 relative z-10" />

            {/* Row 3 — Additional KPIs */}
            <div className="flex flex-col gap-[3px] z-10 relative">
                {metrics.map((m, i) => (
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

            {/* Background Sparkline */}
            {sparkline.length > 0 && (
                <div className="absolute bottom-0 left-0 right-0 h-[36px] pointer-events-none opacity-50 z-0">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={sparkData} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
                            <defs>
                                <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="0%" stopColor={accentHex} stopOpacity={0.15} />
                                    <stop offset="100%" stopColor={accentHex} stopOpacity={0.0} />
                                </linearGradient>
                            </defs>
                            <YAxis domain={[sparkMin, 'dataMax']} hide />
                            <Area
                                type="monotone"
                                dataKey="value"
                                stroke={accentHex}
                                strokeWidth={1.5}
                                strokeOpacity={0.5}
                                fill={`url(#${gradientId})`}
                                isAnimationActive={false}
                            />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            )}
        </div>
    )
}
