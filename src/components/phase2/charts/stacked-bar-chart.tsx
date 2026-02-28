'use client'

import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts'

interface StackedBarChartProps {
    data: { name: string; items: { key: string; value: number; color: string }[] }[]
    height?: number
}

export function StackedBarChart({ data, height = 40 }: StackedBarChartProps) {
    if (!data || data.length === 0) return null

    // Transform data for Recharts
    // We expect [{ name: 'Row 1', items: [{ key: 'done', value: 10, color: '#...' }] }]
    const transformedData = data.map(d => {
        const row: any = { name: d.name }
        d.items.forEach(item => {
            row[item.key] = item.value
            row[`${item.key}Color`] = item.color
        })
        return row
    })

    // Extract all unique keys to render stack bars
    const keys = new Set<string>()
    data.forEach(d => d.items.forEach(item => keys.add(item.key)))
    const keysArray = Array.from(keys)

    return (
        <div style={{ height: `${height}px`, width: '100%' }}>
            <ResponsiveContainer width="100%" height="100%">
                <BarChart data={transformedData} layout="vertical" margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" hide />
                    <Tooltip cursor={{ fill: 'transparent' }} contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', zIndex: 50 }} allowEscapeViewBox={{ x: true, y: true }} />
                    {keysArray.map((key, index) => {
                        // We need to dynamically get the color from the item definition
                        // Recharts Bar fill prop can take a function but it's easier to just pick the first matching color from our raw data.
                        let color = '#ccc'
                        for (const row of data) {
                            const match = row.items.find(i => i.key === key)
                            if (match) {
                                color = match.color
                                break
                            }
                        }

                        // Apply radius only to first and last items for a smooth pill shape
                        const isFirst = index === 0
                        const isLast = index === keysArray.length - 1
                        const radius: [number, number, number, number] = [
                            isLast ? 4 : 0,
                            isLast ? 4 : 0,
                            isLast ? 4 : 0,
                            isLast ? 4 : 0
                        ] // right, right, left, left for horizontal

                        // For fully rounded corners we need to be careful with Recharts stack radius
                        const leftRadius = isFirst ? 4 : 0
                        const rightRadius = isLast ? 4 : 0

                        return (
                            <Bar
                                key={key}
                                dataKey={key}
                                stackId="a"
                                fill={color}
                                radius={[rightRadius, rightRadius, leftRadius, leftRadius]}
                            />
                        )
                    })}
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}
