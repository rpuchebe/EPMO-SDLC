'use client'

import React from 'react'
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'

interface CategoryData {
    name: string
    value: number
    color: string
}

interface InvestmentCategoryDonutProps {
    data: CategoryData[]
    total: number
    trendPercentage?: number // Positive for increase, negative for decrease
    onClickSlice: (name: string) => void
}

export function InvestmentCategoryDonut({ data, total, trendPercentage = 0, onClickSlice }: InvestmentCategoryDonutProps) {
    return (
        <div className="flex flex-col h-full relative border-none">
            <div className="flex-1 flex items-center justify-between min-h-[140px]">
                <div className="flex-shrink-0 w-[140px] h-[140px] relative">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={data}
                                cx="50%"
                                cy="50%"
                                innerRadius={42}
                                outerRadius={55}
                                paddingAngle={5}
                                dataKey="value"
                                cornerRadius={8}
                                stroke="none"
                                onClick={(entry) => onClickSlice(entry.name)}
                                className="cursor-pointer outline-none hover:opacity-80 transition-opacity"
                            >
                                {data.map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip
                                contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)', fontSize: '12px' }}
                                cursor={false}
                                allowEscapeViewBox={{ x: true, y: true }}
                            />
                        </PieChart>
                    </ResponsiveContainer>
                    {/* Center Text */}
                    <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className="text-2xl font-bold text-slate-800 leading-none">{total}</span>
                        <span className="text-[10px] uppercase tracking-wider text-slate-400 font-medium">Total</span>
                    </div>
                </div>

                {/* Legend positioned to the right */}
                <div className="flex-1 flex flex-col justify-center gap-1.5 pl-6 min-w-0">
                    {data.map((item, idx) => (
                        <div
                            key={idx}
                            onClick={() => onClickSlice(item.name)}
                            className="flex items-center justify-between group cursor-pointer"
                        >
                            <div className="flex items-center gap-2 min-w-0">
                                <span
                                    className="w-2.5 h-2.5 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                                    style={{ backgroundColor: item.color }}
                                />
                                <span className="text-xs text-slate-600 whitespace-nowrap group-hover:text-slate-900 transition-colors">
                                    {item.name}
                                </span>
                            </div>
                            <span className="text-xs font-semibold text-slate-700 ml-auto pl-2">
                                {item.value}
                            </span>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    )
}
