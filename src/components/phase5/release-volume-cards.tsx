'use client'

import { AreaChart, Area, ResponsiveContainer } from 'recharts'
import { TrendingUp, TrendingDown, Minus, Box, GitBranch, CheckCircle, Repeat } from 'lucide-react'

interface ReleaseVolumeData {
    totalReleases: number
    totalPrevQuarter: number
    plannedPct: number
    hotfixPct: number
    plannedPctPrev: number
    hotfixPctPrev: number
    onSchedulePct: number
    onSchedulePctPrev: number
    avgPerSprint: number
    avgPerSprintPrev: number
    sparklines: {
        total: number[]
        planned: number[]
        onSchedule: number[]
        avgPerSprint: number[]
    }
}

interface ReleaseVolumeCardsProps {
    data: ReleaseVolumeData
}

function TrendBadge({ current, previous, suffix = '' }: { current: number; previous: number; suffix?: string }) {
    const diff = current - previous
    const pctChange = previous > 0 ? Math.round((diff / previous) * 100) : 0

    if (diff === 0) {
        return (
            <span className="inline-flex items-center gap-0.5 text-[10px] font-medium text-slate-400">
                <Minus className="w-3 h-3" /> No change
            </span>
        )
    }

    const isPositive = diff > 0
    return (
        <span className={`inline-flex items-center gap-0.5 text-[10px] font-semibold ${isPositive ? 'text-emerald-600' : 'text-red-500'}`}>
            {isPositive ? <TrendingUp className="w-3 h-3" /> : <TrendingDown className="w-3 h-3" />}
            {isPositive ? '+' : ''}{pctChange}%{suffix} vs prev Q
        </span>
    )
}

function Sparkline({ data, color }: { data: number[]; color: string }) {
    const chartData = data.map((v, i) => ({ v }))
    return (
        <div className="h-8 w-full mt-2">
            <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                    <defs>
                        <linearGradient id={`grad-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
                            <stop offset="0%" stopColor={color} stopOpacity={0.3} />
                            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
                        </linearGradient>
                    </defs>
                    <Area
                        type="monotone"
                        dataKey="v"
                        stroke={color}
                        strokeWidth={1.5}
                        fill={`url(#grad-${color.replace('#', '')})`}
                        dot={false}
                    />
                </AreaChart>
            </ResponsiveContainer>
        </div>
    )
}

export function ReleaseVolumeCards({ data }: ReleaseVolumeCardsProps) {
    const cards = [
        {
            label: 'Total Releases This Quarter',
            value: data.totalReleases,
            icon: Box,
            color: '#6366f1',
            bg: 'bg-indigo-50',
            iconColor: 'text-indigo-600',
            accent: 'border-indigo-100',
            sparkline: data.sparklines.total,
            current: data.totalReleases,
            previous: data.totalPrevQuarter,
        },
        {
            label: 'Planned vs Hotfix Split',
            value: `${data.plannedPct}% / ${data.hotfixPct}%`,
            icon: GitBranch,
            color: '#8b5cf6',
            bg: 'bg-violet-50',
            iconColor: 'text-violet-600',
            accent: 'border-violet-100',
            sparkline: data.sparklines.planned,
            current: data.plannedPct,
            previous: data.plannedPctPrev,
        },
        {
            label: 'On Schedule Deployments',
            value: `${data.onSchedulePct}%`,
            icon: CheckCircle,
            color: '#10b981',
            bg: 'bg-emerald-50',
            iconColor: 'text-emerald-600',
            accent: 'border-emerald-100',
            sparkline: data.sparklines.onSchedule,
            current: data.onSchedulePct,
            previous: data.onSchedulePctPrev,
        },
        {
            label: 'Avg Releases per Sprint',
            value: data.avgPerSprint,
            icon: Repeat,
            color: '#f59e0b',
            bg: 'bg-amber-50',
            iconColor: 'text-amber-600',
            accent: 'border-amber-100',
            sparkline: data.sparklines.avgPerSprint,
            current: data.avgPerSprint,
            previous: data.avgPerSprintPrev,
        },
    ]

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {cards.map((card, i) => {
                const Icon = card.icon
                return (
                    <div
                        key={i}
                        className={`bg-white rounded-2xl border ${card.accent} shadow-sm p-4
                                    hover:shadow-md transition-all duration-300 group`}
                    >
                        <div className="flex items-center justify-between mb-2">
                            <div className={`${card.bg} ${card.iconColor} w-9 h-9 rounded-xl flex items-center justify-center
                                              group-hover:scale-110 transition-transform duration-300`}>
                                <Icon className="w-4.5 h-4.5" />
                            </div>
                            <TrendBadge current={card.current} previous={card.previous} />
                        </div>
                        <p className="text-2xl font-bold text-slate-900 tracking-tight">{card.value}</p>
                        <p className="text-xs text-slate-500 font-medium mt-0.5">{card.label}</p>
                        <Sparkline data={card.sparkline} color={card.color} />
                    </div>
                )
            })}
        </div>
    )
}
