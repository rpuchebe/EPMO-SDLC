'use client'

import { WorkstreamIncidentTicket } from '@/types/incidents'
import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface WorkstreamIncidentDistributionProps {
    data: WorkstreamIncidentTicket[]
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export function WorkstreamIncidentDistribution({ data }: WorkstreamIncidentDistributionProps) {
    const chartData = useMemo(() => {
        const projectMap: Record<string, number> = {}

        for (const ticket of data) {
            const proj = ticket.project_key || 'Unknown'
            projectMap[proj] = (projectMap[proj] || 0) + 1
        }

        const formatted = Object.entries(projectMap).map(([name, value]) => ({ name, value }))
        return formatted.sort((a, b) => b.value - a.value).slice(0, 10) // Top 10 to fit cleanly
    }, [data])

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full h-full min-h-[400px] flex flex-col">
                <h3 className="text-sm font-semibold text-slate-900 mb-6">Workstream Incident Distribution</h3>
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    No workstream incident data available
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full h-full min-h-[400px] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-6">Workstream Incident Distribution</h3>
            <div className="flex-1 min-h-0">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={80}
                            outerRadius={120}
                            paddingAngle={2}
                            dataKey="value"
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip
                            contentStyle={{
                                backgroundColor: '#fff',
                                borderRadius: '12px',
                                border: '1px solid #e2e8f0',
                                padding: '8px 12px',
                                boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1)',
                                fontSize: '12px',
                            }}
                            itemStyle={{ color: '#1e293b', fontWeight: 500 }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            iconType="circle"
                            wrapperStyle={{ fontSize: '11px', color: '#64748b' }}
                        />
                    </PieChart>
                </ResponsiveContainer>
            </div>
        </div>
    )
}
