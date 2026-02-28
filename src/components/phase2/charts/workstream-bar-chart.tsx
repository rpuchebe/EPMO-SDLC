'use client'

import React from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'

interface WorkstreamData {
    name: string
    count: number
    color: string
}

interface WorkstreamBarChartProps {
    data: WorkstreamData[]
    onClickBar?: (workstream: string) => void
}

const COLORS = [
    '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981',
    '#3b82f6', '#f43f5e', '#06b6d4', '#84cc16', '#a855f7'
]

function BarTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null
    const { name, count } = payload[0].payload
    return (
        <div className="bg-slate-800 text-white px-3 py-2 rounded-lg shadow-lg text-xs">
            <span className="font-semibold">{name}:</span> {count}
        </div>
    )
}

export function WorkstreamBarChart({ data, onClickBar }: WorkstreamBarChartProps) {
    // Truncate long workstream names for the Y axis
    const chartData = data.map((d, i) => ({
        ...d,
        shortName: d.name.length > 20 ? d.name.slice(0, 18) + '…' : d.name,
        fill: d.color || COLORS[i % COLORS.length]
    }))

    return (
        <div className="w-full h-full">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart
                    data={chartData}
                    layout="vertical"
                    margin={{ top: 0, right: 12, bottom: 0, left: 0 }}
                    barCategoryGap="20%"
                >
                    <XAxis type="number" hide />
                    <YAxis
                        type="category"
                        dataKey="shortName"
                        width={110}
                        tick={{ fontSize: 10, fill: '#64748b', fontWeight: 500 }}
                        axisLine={false}
                        tickLine={false}
                    />
                    <Tooltip content={<BarTooltip />} cursor={{ fill: 'rgba(0,0,0,0.04)' }} allowEscapeViewBox={{ x: true, y: true }} />
                    <Bar
                        dataKey="count"
                        radius={[6, 6, 6, 6]}
                        cursor={onClickBar ? 'pointer' : 'default'}
                        onClick={(entry: any) => onClickBar?.(entry.name)}
                    >
                        {chartData.map((entry, idx) => (
                            <Cell key={idx} fill={entry.fill} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
