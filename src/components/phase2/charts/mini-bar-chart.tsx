'use client'

import { BarChart, Bar, ResponsiveContainer, Cell } from 'recharts'

interface MiniBarChartProps {
    data: { name: string; value: number }[]
    color?: string
}

export function MiniBarChart({ data, color = '#93c5fd' }: MiniBarChartProps) {
    if (!data || data.length === 0) return null

    // Find the max value to scale the bars proportionally
    const maxVal = Math.max(...data.map(d => d.value))

    return (
        <div className="h-12 w-24">
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <Bar dataKey="value" radius={[2, 2, 0, 0]}>
                        {data.map((entry, index) => {
                            // Highlight the last bar
                            const isLast = index === data.length - 1
                            return <Cell key={`cell-${index}`} fill={isLast ? color : `${color}80`} />
                        })}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
