'use client'

import { useState, useMemo } from 'react'
import { TrendingUp } from 'lucide-react'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Area
} from 'recharts'

type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly'

interface DailyCount {
    count_date: string
    workstream: string
    ticket_count: number
}

interface TimelineChartProps {
    data: DailyCount[]
    selectedWorkstream: string | null
    onPeriodClick?: (period: string, granularity: Granularity) => void
}

function aggregateByGranularity(
    data: DailyCount[],
    granularity: Granularity,
    workstream: string | null
) {
    const allMap: Record<string, number> = {}
    const wsMap: Record<string, number> = {}

    for (const d of data) {
        const key = getGranularityKey(d.count_date, granularity)
        allMap[key] = (allMap[key] || 0) + d.ticket_count
        if (workstream && d.workstream === workstream) {
            wsMap[key] = (wsMap[key] || 0) + d.ticket_count
        }
    }

    const keys = [...new Set([...Object.keys(allMap), ...Object.keys(wsMap)])].sort()

    return keys.map((key) => ({
        period: key,
        all: allMap[key] || 0,
        selected: workstream ? (wsMap[key] || 0) : (allMap[key] || 0),
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

export function TimelineChart({ data, selectedWorkstream, onPeriodClick }: TimelineChartProps) {
    const [granularity, setGranularity] = useState<Granularity>('weekly')

    const chartData = useMemo(
        () => aggregateByGranularity(data, granularity, selectedWorkstream),
        [data, granularity, selectedWorkstream]
    )

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handleDotClick = (_: any, payload: any) => {
        if (payload?.payload?.period && onPeriodClick) {
            onPeriodClick(payload.payload.period, granularity)
        }
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                <div className="w-[3px] h-5 rounded-full bg-[#6366f1] flex-shrink-0" />
                <TrendingUp className="w-4 h-4 text-slate-500" />
                <h3 className="text-sm font-semibold text-slate-800">Ticket Creation Timeline</h3>
                <div className="ml-auto flex bg-slate-100 rounded-lg p-0.5">
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

            <div className="p-6">
            <ResponsiveContainer width="100%" height={300}>
                <LineChart
                    data={chartData}
                    margin={{ top: 5, right: 10, left: -10, bottom: 5 }}
                >
                    <defs>
                        <linearGradient id="colorAll" x1="0" y1="0" x2="0" y2="1">
                            <stop offset="5%" stopColor="#6366f1" stopOpacity={0.1} />
                            <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                        </linearGradient>
                    </defs>
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
                            name === 'all' ? 'All Workstreams' : 'Selected Workstream',
                        ]}
                    />
                    <Area
                        type="monotone"
                        dataKey="all"
                        stroke="transparent"
                        fill="url(#colorAll)"
                    />
                    <Line
                        type="monotone"
                        dataKey="all"
                        stroke="#cbd5e1"
                        strokeWidth={2}
                        strokeDasharray="6 4"
                        dot={false}
                        activeDot={{ r: 4, strokeWidth: 1, stroke: '#cbd5e1', fill: '#fff' }}
                        name="all"
                        animationDuration={800}
                    />
                    <Line
                        type="monotone"
                        dataKey="selected"
                        stroke="#6366f1"
                        strokeWidth={2.5}
                        dot={{ fill: '#6366f1', r: 3, strokeWidth: 0 }}
                        activeDot={{ fill: '#6366f1', r: 5, strokeWidth: 2, stroke: '#fff', onClick: handleDotClick, cursor: 'pointer' }}
                        name="selected"
                        animationDuration={800}
                    />
                </LineChart>
            </ResponsiveContainer>
            </div>
        </div>
    )
}
