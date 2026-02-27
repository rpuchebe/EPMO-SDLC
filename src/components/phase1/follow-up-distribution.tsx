'use client'

import { FollowUpTicket } from '@/types/incidents'
import { useMemo } from 'react'
import { PieChart, Pie, Cell, Tooltip, Legend, ResponsiveContainer } from 'recharts'

interface FollowUpDistributionProps {
    data: FollowUpTicket[]
}

const COLORS = ['#3b82f6', '#f97316', '#10b981', '#6366f1', '#f43f5e', '#8b5cf6', '#eab308']

export function FollowUpDistribution({ data }: FollowUpDistributionProps) {
    const chartData = useMemo(() => {
        const projectMap: Record<string, { total: number, completed: number }> = {}

        for (const ticket of data) {
            if (ticket.linked_tickets && Array.isArray(ticket.linked_tickets)) {
                for (const linked of ticket.linked_tickets) {
                    const proj = linked.key ? linked.key.split('-')[0] : 'Unknown'
                    if (!projectMap[proj]) projectMap[proj] = { total: 0, completed: 0 }
                    projectMap[proj].total += 1

                    const status = (linked.status || '').toLowerCase()
                    if (status.includes('done') || status.includes('closed') || status.includes('complete')) {
                        projectMap[proj].completed += 1
                    }
                }
            }
        }

        const formatted = Object.entries(projectMap).map(([name, stats]) => ({
            name,
            value: stats.total,
            completed: stats.completed,
            total: stats.total
        }))
        return formatted.sort((a, b) => b.value - a.value).slice(0, 10) // Top 10 to fit cleanly
    }, [data])

    const totalFollowUps = useMemo(() => {
        return chartData.reduce((acc, curr) => acc + curr.value, 0)
    }, [chartData])

    const CustomTooltip = ({ active, payload }: any) => {
        if (active && payload && payload.length) {
            const data = payload[0].payload
            return (
                <div className="bg-white rounded-xl border border-slate-200 shadow-lg p-3 text-xs min-w-[140px] z-50">
                    <div className="font-semibold text-slate-800 mb-2 truncate flex items-center gap-2">
                        <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: payload[0].color }}></div>
                        {data.name}
                    </div>
                    <div className="flex justify-between items-center mb-1">
                        <span className="text-slate-500">Total:</span>
                        <span className="font-bold text-slate-700">{data.total}</span>
                    </div>
                    <div className="flex justify-between items-center">
                        <span className="text-slate-500">Completed:</span>
                        <span className="font-bold text-emerald-600">{data.completed}</span>
                    </div>
                </div>
            )
        }
        return null
    }

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full h-full min-h-[400px] flex flex-col">
                <h3 className="text-sm font-semibold text-slate-900 mb-6">Follow-up Distribution by Project</h3>
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    No linked projects data available
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full h-full min-h-[400px] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-6">Follow-up Distribution by Project</h3>
            <div className="flex-1 min-h-0 relative">

                {/* Center Label for Donut Chart */}
                <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none z-10" style={{ paddingBottom: '36px' }}>
                    <span className="text-3xl font-bold text-slate-800 leading-none">{totalFollowUps}</span>
                    <span className="text-[11px] font-semibold text-slate-400 mt-1 uppercase tracking-wider">Total</span>
                </div>

                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={chartData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={70}
                            paddingAngle={5}
                            dataKey="value"
                            cornerRadius={8}
                            stroke="none"
                        >
                            {chartData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                            ))}
                        </Pie>
                        <Tooltip content={<CustomTooltip />} />
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
