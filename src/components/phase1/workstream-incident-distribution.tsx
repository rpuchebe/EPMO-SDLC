'use client'

import { WorkstreamIncidentTicket } from '@/types/incidents'
import React, { useMemo } from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'

interface WorkstreamIncidentDistributionProps {
    data: WorkstreamIncidentTicket[]
    onClickSlice?: (projectKey: string) => void
    title?: string
}

const COLORS = ['#ef4444', '#f97316', '#eab308', '#22c55e', '#3b82f6', '#8b5cf6', '#ec4899', '#14b8a6']

export function WorkstreamIncidentDistribution({
    data,
    onClickSlice,
    title = 'Workstream Incident Distribution',
}: WorkstreamIncidentDistributionProps) {
    const { chartData, total } = useMemo(() => {
        const projectMap: Record<string, number> = {}

        for (const ticket of data) {
            const proj = ticket.project_key || 'Unknown'
            projectMap[proj] = (projectMap[proj] || 0) + 1
        }

        const formatted = Object.entries(projectMap)
            .map(([name, value]) => ({ name, value }))
            .sort((a, b) => b.value - a.value)
            .slice(0, 10) // Top 10

        const totalCount = formatted.reduce((acc, cur) => acc + cur.value, 0)

        // add colors (like your InvestmentCategoryDonut input)
        const withColors = formatted.map((d, idx) => ({
            ...d,
            color: COLORS[idx % COLORS.length],
        }))

        return { chartData: withColors, total: totalCount }
    }, [data])

    if (chartData.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full h-full min-h-[260px] flex flex-col">
                <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>
                <div className="flex-1 flex items-center justify-center text-slate-500 text-sm">
                    No workstream incident data available
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full h-full min-h-[260px] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-4">{title}</h3>

            <div className="flex flex-col h-full relative border-none">
                <div className="flex-1 flex items-center justify-between min-h-[180px]">
                    {/* Donut (left) */}
                    <div className="relative w-1/2 h-full min-h-[180px]">
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
                                    onClick={(entry: any) => onClickSlice?.(entry?.name)}
                                    className="cursor-pointer outline-none hover:opacity-80 transition-opacity"
                                    startAngle={90}
                                    endAngle={-270}
                                >
                                    {chartData.map((entry, index) => (
                                        <Cell key={`cell-${index}`} fill={entry.color} />
                                    ))}
                                </Pie>

                                <Tooltip
                                    cursor={false}
                                    contentStyle={{
                                        borderRadius: '8px',
                                        border: '1px solid #e2e8f0',
                                        boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                        fontSize: '12px',
                                    }}
                                />
                            </PieChart>
                        </ResponsiveContainer>

                        {/* Center Text */}
                        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                            <span className="text-2xl font-bold text-slate-800 leading-none">{total}</span>
                            <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Total</span>
                        </div>
                    </div>

                    {/* Legend (right) */}
                    <div className="w-1/2 flex flex-col justify-center gap-2 pl-4">
                        {chartData.map((item, idx) => (
                            <div
                                key={idx}
                                onClick={() => onClickSlice?.(item.name)}
                                className="flex items-center justify-between group cursor-pointer"
                            >
                                <div className="flex items-center gap-2 overflow-hidden">
                                    <span
                                        className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                                        style={{ backgroundColor: item.color }}
                                    />
                                    <span className="text-xs text-slate-600 truncate group-hover:text-slate-900 transition-colors">
                                        {item.name}
                                    </span>
                                </div>

                                <span className="text-xs font-semibold text-slate-700 ml-2 tabular-nums">
                                    {item.value}
                                </span>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="mt-4 pt-4 border-t border-slate-50">
                <p className="text-[10px] text-red-500 text-center italic font-medium">
                    * Note: This report contains fake data. We are currently working on building it.
                </p>
            </div>
        </div>
    )
}