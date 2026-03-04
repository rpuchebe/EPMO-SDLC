'use client'

import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

// ─── Types ───────────────────────────────────────────────────────────────────

export interface TrendBadge {
    label: string
    /** Absolute change vs previous period */
    deltaAbsolute: number
    /** Percentage change vs previous period */
    deltaPct: number
}

export interface ProgressCircleProps {
    totalCount: number
    completedCount: number
    /** Short label shown inside the ring (e.g. "Done") */
    label: string
    /** Diameter of the SVG in px (default 130) */
    size?: number
    strokeWidth?: number
    /** Hex accent colour for the arc (default emerald) */
    accentColor?: string
    /** Tooltip on hover */
    tooltip?: string
    /** Optional trend badges rendered below the ring */
    trends?: TrendBadge[]
}

// ─── Component ───────────────────────────────────────────────────────────────

export function ProgressCircle({
    totalCount,
    completedCount,
    label,
    size = 130,
    strokeWidth = 11,
    accentColor = '#10b981',
    tooltip,
    trends = [],
}: ProgressCircleProps) {
    const pct = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0
    const r = (size - strokeWidth) / 2
    const circumference = 2 * Math.PI * r
    const dash = (pct / 100) * circumference

    return (
        <div className="flex flex-col items-center gap-3">
            {/* Ring */}
            <div
                className="relative"
                style={{ width: size, height: size }}
                title={tooltip}
            >
                <svg
                    width={size}
                    height={size}
                    viewBox={`0 0 ${size} ${size}`}
                    className="-rotate-90"
                >
                    {/* Track */}
                    <circle
                        cx={size / 2} cy={size / 2} r={r}
                        fill="none"
                        strokeWidth={strokeWidth}
                        stroke="#e2e8f0"
                    />
                    {/* Progress arc */}
                    <circle
                        cx={size / 2} cy={size / 2} r={r}
                        fill="none"
                        strokeWidth={strokeWidth}
                        stroke={accentColor}
                        strokeDasharray={`${dash} ${circumference}`}
                        strokeLinecap="round"
                        className="transition-all duration-700"
                    />
                </svg>

                {/* Center text */}
                <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <span className="text-[22px] font-bold text-slate-800 leading-none">{pct}%</span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wide mt-1">{label}</span>
                </div>
            </div>

            {/* Sub-count */}
            <div className="text-xs text-slate-500 text-center">
                <span className="font-semibold text-slate-700">{completedCount.toLocaleString()}</span>
                {' / '}
                {totalCount.toLocaleString()} items
            </div>

            {/* Trend badges */}
            {trends.length > 0 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                    {trends.map((t, i) => {
                        const isPos = t.deltaAbsolute > 0
                        const isNeg = t.deltaAbsolute < 0
                        const colorCls = isPos
                            ? 'text-emerald-700 bg-emerald-50 border-emerald-200'
                            : isNeg
                                ? 'text-rose-700 bg-rose-50 border-rose-200'
                                : 'text-slate-500 bg-slate-50 border-slate-200'
                        const Icon = isPos ? TrendingUp : isNeg ? TrendingDown : Minus
                        const sign = isPos ? '+' : ''
                        return (
                            <div
                                key={i}
                                className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorCls}`}
                            >
                                <Icon className="w-3 h-3" />
                                <span>{t.label}: {sign}{t.deltaPct.toFixed(1)}%</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}
