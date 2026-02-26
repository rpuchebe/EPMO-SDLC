'use client'

import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts'

type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly'

interface DailyCount {
    count_date: string
    workstream: string
    ticket_type: string
    ticket_count: number
}

interface TimelineChartProps {
    data: DailyCount[]
    onPeriodClick?: (period: string, granularity: Granularity) => void
}

function aggregateByGranularity(
    data: DailyCount[],
    granularity: Granularity
) {
    const discoveryMap: Record<string, number> = {}
    const maintenanceMap: Record<string, number> = {}

    for (const d of data) {
        const key = getGranularityKey(d.count_date, granularity)
        const type = d.ticket_type || 'Unknown'

        if (type.toLowerCase().includes('discovery')) {
            discoveryMap[key] = (discoveryMap[key] || 0) + d.ticket_count
        } else if (type.toLowerCase().includes('maintenance') || type.toLowerCase().includes('rtb')) {
            maintenanceMap[key] = (maintenanceMap[key] || 0) + d.ticket_count
        }
    }

    const keys = [...new Set([...Object.keys(discoveryMap), ...Object.keys(maintenanceMap)])].sort()

    return keys.map((key) => ({
        period: key,
        discovery: discoveryMap[key] || 0,
        maintenance: maintenanceMap[key] || 0,
    }))
}

function getGranularityKey(dateStr: string, granularity: Granularity): string {
    const d = new Date(dateStr)
    switch (granularity) {
        case 'daily':
            return dateStr
        case 'weekly': {
            const startOfWeek = new Date(d)
            startOfWeek.setDate(d.getDate() - d.getDay())
            return startOfWeek.toISOString().split('T')[0]
        }
        case 'monthly':
            return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
        case 'quarterly': {
            const q = Math.ceil((d.getMonth() + 1) / 3)
            return `${d.getFullYear()}-Q${q}`
        }
    }
}

function formatPeriodLabel(period: string, granularity: Granularity): string {
    switch (granularity) {
        case 'daily': {
            const d = new Date(period + 'T00:00:00')
            return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
        }
        case 'weekly': {
            const d = new Date(period + 'T00:00:00')
            return `W${getWeekNumber(d)} ${d.toLocaleDateString('en-US', { month: 'short' })}`
        }
        case 'monthly': {
            const [y, m] = period.split('-')
            return new Date(Number(y), Number(m) - 1).toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
        }
        case 'quarterly':
            return period
    }
}

function getWeekNumber(d: Date): number {
    const oneJan = new Date(d.getFullYear(), 0, 1)
    return Math.ceil(((d.getTime() - oneJan.getTime()) / 86400000 + oneJan.getDay() + 1) / 7)
}

const granularities: { label: string; value: Granularity }[] = [
    { label: 'Daily', value: 'daily' },
    { label: 'Weekly', value: 'weekly' },
    { label: 'Monthly', value: 'monthly' },
    { label: 'Quarterly', value: 'quarterly' },
]

export { type Granularity }

export function TimelineChart({ data, onPeriodClick }: TimelineChartProps) {
    const [granularity, setGranularity] = useState<Granularity>('weekly')

    const chartData = useMemo(() => {
        return aggregateByGranularity(data, granularity)
    }, [data, granularity])

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDotClick = (_: any, payload: any) => {
        if (payload?.payload?.period && onPeriodClick) {
            onPeriodClick(payload.payload.period, granularity)
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                <div className="w-[3px] h-5 rounded-full bg-[#3b82f6] flex-shrink-0" />
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-800">Ticket Creation Timeline</h3>
                <div className="ml-auto flex items-center gap-4">
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-blue-500" />
                            <span className="text-xs text-slate-500">Discovery</span>
                        </div>
                        <div className="flex items-center gap-1.5">
                            <div className="w-2 h-2 rounded-full bg-orange-500" />
                            <span className="text-xs text-slate-500">RTB</span>
                        </div>
                    </div>
                    <div className="flex bg-slate-100 rounded-lg p-0.5">
                        {granularities.map((g) => (
                            <button
                                key={g.value}
                                onClick={() => setGranularity(g.value)}
                                className={`px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-200
                                            ${granularity === g.value
                                        ? 'bg-white text-slate-900 shadow-sm'
                                        : 'text-slate-500 hover:text-slate-700'}`}
                            >
                                {g.label}
                            </button>
                        ))}
                    </div>
                </div>
            </div>

            <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                        dataKey="period"
                        tickFormatter={(v) => formatPeriodLabel(v, granularity)}
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                    />
                    <YAxis
                        tick={{ fontSize: 11, fill: '#94a3b8' }}
                        axisLine={false}
                        tickLine={false}
                        allowDecimals={false}
                    />
                    <Tooltip
                        contentStyle={{
                            backgroundColor: '#fff',
                            border: '1px solid #e2e8f0',
                            borderRadius: '12px',
                            padding: '10px 14px',
                            boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                            fontSize: '12px',
                        }}
                        labelFormatter={(v) => formatPeriodLabel(v as string, granularity)}
                        formatter={(value: number | undefined, name: string | undefined) => [
                            value ?? 0,
                            name === 'discovery' ? 'Discovery' : 'Maintenance (RTB)',
                        ]}
                    />

                    {/* Discovery Line (Blue) */}
                    <Line
                        type="monotone"
                        dataKey="discovery"
                        stroke="#3b82f6"
                        strokeWidth={2.5}
                        dot={{ fill: '#3b82f6', r: 3, strokeWidth: 0 }}
                        activeDot={{ fill: '#3b82f6', r: 5, strokeWidth: 2, stroke: '#fff', onClick: handleDotClick, cursor: 'pointer' }}
                        name="discovery"
                        animationDuration={800}
                    />

                    {/* Maintenance Line (Orange) */}
                    <Line
                        type="monotone"
                        dataKey="maintenance"
                        stroke="#f97316"
                        strokeWidth={2.5}
                        dot={{ fill: '#f97316', r: 3, strokeWidth: 0 }}
                        activeDot={{ fill: '#f97316', r: 5, strokeWidth: 2, stroke: '#fff', onClick: handleDotClick, cursor: 'pointer' }}
                        name="maintenance"
                        animationDuration={800}
                    />
                </LineChart>
            </ResponsiveContainer>
            </div>
        </div>
    )
}
