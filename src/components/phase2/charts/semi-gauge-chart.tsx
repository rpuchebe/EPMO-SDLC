'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface SemiGaugeChartProps {
    value: number
    total: number
    color?: string
    trackColor?: string
}

export function SemiGaugeChart({ value, total, color = '#f43f5e', trackColor = '#fee2e2' }: SemiGaugeChartProps) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0
    const data = [
        { name: 'Value', value: value },
        { name: 'Remaining', value: Math.max(0, total - value) },
    ]

    return (
        <div className="relative h-12 w-24 overflow-hidden pt-2">
            <ResponsiveContainer width="100%" height="200%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        startAngle={180}
                        endAngle={0}
                        innerRadius="75%"
                        outerRadius="100%"
                        dataKey="value"
                        stroke="none"
                    >
                        <Cell key="cell-0" fill={color} />
                        <Cell key="cell-1" fill={trackColor} />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-x-0 bottom-0 flex items-end justify-center pb-1 lg:pb-0">
                <span className="text-sm font-bold text-slate-900 leading-none">{percentage}<span className="text-[10px] text-slate-500 font-medium">%</span></span>
            </div>
        </div>
    )
}
