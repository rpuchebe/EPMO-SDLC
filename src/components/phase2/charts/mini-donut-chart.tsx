'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'

interface MiniDonutChartProps {
    value: number
    total: number
    color?: string
    trackColor?: string
}

export function MiniDonutChart({ value, total, color = '#10b981', trackColor = '#e2e8f0' }: MiniDonutChartProps) {
    const percentage = total > 0 ? Math.round((value / total) * 100) : 0
    const data = [
        { name: 'Completed', value: value },
        { name: 'Remaining', value: Math.max(0, total - value) },
    ]

    return (
        <div className="relative h-16 w-16 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
                <PieChart margin={{ top: 0, right: 0, bottom: 0, left: 0 }}>
                    <Pie
                        data={data}
                        cx="50%"
                        cy="50%"
                        innerRadius="75%"
                        outerRadius="100%"
                        startAngle={90}
                        endAngle={-270}
                        dataKey="value"
                        stroke="none"
                    >
                        <Cell key="cell-0" fill={color} />
                        <Cell key="cell-1" fill={trackColor} />
                    </Pie>
                </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex items-center justify-center flex-col">
                <span className="text-sm font-bold text-slate-900 leading-none">{percentage}<span className="text-[10px] text-slate-500 font-medium">%</span></span>
            </div>
        </div>
    )
}
