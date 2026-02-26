'use client'

import { useState, useMemo } from 'react'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from 'recharts'
import { Incident } from '@/types/incidents'

type Granularity = 'daily' | 'weekly' | 'monthly' | 'quarterly'

interface IncidentsTimelineChartProps {
    data: Incident[]
}

const IMPACT_COLORS = {
    1: '#ef4444', // Red for Impact 1
    2: '#eab308', // Yellow for Impact 2
}

function aggregateByGranularity(
    data: Incident[],
    granularity: Granularity
) {
    const periodMap: Record<string, Record<string, number>> = {}

    for (const incident of data) {
        if (!incident.created_at) continue
        const dateStr = incident.created_at.substring(0, 10)
        const key = getGranularityKey(dateStr, granularity)
        const impactKey = `impact${incident.impact || 4}`

        if (!periodMap[key]) {
            periodMap[key] = { impact1: 0, impact2: 0 }
        }
        periodMap[key][impactKey] = (periodMap[key][impactKey] || 0) + 1
    }

    const keys = Object.keys(periodMap).sort()

    return keys.map((key) => ({
        period: key,
        ...periodMap[key]
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
    if (!period) return ''
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

export function IncidentsTimelineChart({ data }: IncidentsTimelineChartProps) {
    const [granularity, setGranularity] = useState<Granularity>('monthly')

    const chartData = useMemo(() => {
        return aggregateByGranularity(data, granularity)
    }, [data, granularity])

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex-1 h-full min-h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h3 className="text-sm font-semibold text-slate-900">Incidents received over time</h3>
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

            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart
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
                        />
                        <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '12px', paddingTop: '10px' }} />

                        <Bar dataKey="impact1" name="Impact 1" stackId="a" fill={IMPACT_COLORS[1]} radius={[0, 0, 4, 4]} />
                        <Bar dataKey="impact2" name="Impact 2" stackId="a" fill={IMPACT_COLORS[2]} radius={[4, 4, 0, 0]} />
                    </BarChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
