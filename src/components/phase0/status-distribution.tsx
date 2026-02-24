'use client'

import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell
} from 'recharts'

interface StatusData {
    status: string
    count: number
    avgRoi: number | null
    avgDaysInStatus: number | null
}

interface StatusDistributionProps {
    data: StatusData[]
}

const STATUS_COLORS: Record<string, string> = {
    'Backlog': '#94a3b8',
    'To Do': '#64748b',
    'Open': '#64748b',
    'Discovery': '#38bdf8',
    'In Progress': '#f59e0b',
    'In Review': '#a78bfa',
    'Moved to Workstream': '#8b5cf6',
    'Done': '#10b981',
    'Closed': '#6b7280',
}

function getBarColor(status: string): string {
    return STATUS_COLORS[status] || '#6366f1'
}

export function StatusDistribution({ data }: StatusDistributionProps) {
    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="mb-6">
                <h3 className="text-sm font-semibold text-slate-900">Ticket Distribution by Status</h3>
                <p className="text-xs text-slate-400 mt-0.5">Current ticket spread with ROI and duration metrics</p>
            </div>

            <ResponsiveContainer width="100%" height={320}>
                <BarChart data={data} margin={{ top: 5, right: 10, left: -10, bottom: 60 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                        dataKey="status"
                        tick={<CustomXAxisTick data={data} />}
                        axisLine={{ stroke: '#e2e8f0' }}
                        tickLine={false}
                        interval={0}
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
                        cursor={{ fill: 'rgba(99, 102, 241, 0.04)' }}
                        formatter={(value: number | undefined) => [value ?? 0, 'Tickets']}
                    />
                    <Bar
                        dataKey="count"
                        radius={[6, 6, 0, 0]}
                        animationDuration={800}
                        maxBarSize={48}
                    >
                        {data.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={getBarColor(entry.status)} />
                        ))}
                    </Bar>
                </BarChart>
            </ResponsiveContainer>
        </div>
    )
}

// Custom X-axis tick that renders status + Avg ROI + Avg Time
function CustomXAxisTick({ x, y, payload, data }: {
    x?: number
    y?: number
    payload?: { value: string }
    data: StatusData[]
}) {
    if (!payload || x === undefined || y === undefined) return null
    const item = data.find((d) => d.status === payload.value)

    return (
        <g transform={`translate(${x},${y})`}>
            <text x={0} y={0} dy={12} textAnchor="middle" fill="#334155" fontSize={11} fontWeight={600}>
                {payload.value}
            </text>
            <text x={0} y={0} dy={26} textAnchor="middle" fill="#8b5cf6" fontSize={10}>
                ROI: {item?.avgRoi !== null && item?.avgRoi !== undefined ? item.avgRoi : '—'}
            </text>
            <text x={0} y={0} dy={40} textAnchor="middle" fill="#94a3b8" fontSize={10}>
                {item?.avgDaysInStatus !== null && item?.avgDaysInStatus !== undefined
                    ? `${item.avgDaysInStatus}d avg`
                    : '— avg'}
            </text>
        </g>
    )
}
