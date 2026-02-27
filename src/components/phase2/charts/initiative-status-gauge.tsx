'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface GaugeData {
    name: string
    value: number
    color: string
}

interface InitiativeStatusGaugeProps {
    data: GaugeData[]
    total: number
}

function GaugeTooltip({ active, payload }: any) {
    if (!active || !payload || !payload.length) return null
    const { name, value, color } = payload[0].payload
    return (
        <div className="bg-slate-800 text-white px-3 py-2 rounded-lg shadow-lg text-xs flex items-center gap-2">
            <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: color }} />
            <span className="font-semibold">{name}:</span>
            <span>{value}</span>
        </div>
    )
}

export function InitiativeStatusGauge({ data, total }: InitiativeStatusGaugeProps) {
    const sum = data.reduce((acc, curr) => acc + curr.value, 0)
    const pieData = data

    return (
        <div className="flex flex-row items-center justify-between w-full h-full relative pt-0 pl-2">
            {/* Legends (Left) */}
            <div className="flex flex-col items-start justify-center gap-4">
                {data.map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                        <span
                            className="w-3 h-3 rounded-full flex-shrink-0"
                            style={{ backgroundColor: item.color }}
                        />
                        <span className="text-xs font-medium text-slate-600 whitespace-nowrap">
                            {item.name}
                        </span>
                    </div>
                ))}
            </div>

            {/* Gauge (Right) */}
            <div className="relative flex-1 min-h-[160px] flex items-end justify-center -mt-10">
                <div className="absolute inset-x-0 inset-y-0 h-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Tooltip content={<GaugeTooltip />} />
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="100%"
                                startAngle={180}
                                endAngle={0}
                                innerRadius="78%"
                                outerRadius="120%"
                                paddingAngle={2}
                                dataKey="value"
                                stroke="none"
                                cornerRadius={sum > 0 ? 8 : 0}
                            >
                                {pieData.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                </div>
                {/* Center Text */}
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center pointer-events-none translate-y-3">
                    <span className="text-2xl font-bold text-slate-800 leading-none tracking-tight">{total}</span>
                    <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium mt-1">Created</span>
                </div>
            </div>
        </div>
    )
}
