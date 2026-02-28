import React from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import type { Severity } from '@/lib/server/initiatives'

interface AlertCardProps {
    title: string
    count: number
    severity: Severity
    icon: React.ReactNode
    onClick: () => void
    weeklyTrend: number | null
    monthlyTrend: number | null
}

export function AlertCard({ title, count, severity, icon, onClick, weeklyTrend, monthlyTrend }: AlertCardProps) {
    const colors =
        severity === 'High'
            ? { icon: 'bg-rose-50 text-rose-600', badge: 'bg-rose-100 text-rose-700' }
            : severity === 'Medium'
                ? { icon: 'bg-amber-50 text-amber-600', badge: 'bg-amber-100 text-amber-700' }
                : severity === 'Low'
                    ? { icon: 'bg-yellow-50 text-yellow-600', badge: 'bg-yellow-100 text-yellow-700' }
                    : { icon: 'bg-slate-50 text-slate-500', badge: 'bg-slate-100 text-slate-500' }

    return (
        <div
            onClick={onClick}
            className="bg-white rounded-2xl border border-slate-200 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 p-4 pt-3.5 flex flex-col h-[155px] relative overflow-hidden cursor-pointer group"
        >
            {/* Title row */}
            <div className="flex items-center gap-1.5 mb-2 relative z-10">
                <div className={`w-[22px] h-[22px] flex-shrink-0 flex items-center justify-center rounded-lg ${colors.icon}`}>
                    {icon}
                </div>
                <span className="text-[12px] font-medium text-slate-600 truncate">{title}</span>
            </div>

            {/* Main value & Weekly Trend */}
            <div className="flex items-end justify-between mb-3 relative z-10 w-full min-w-0">
                <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight shrink-0">
                    {count}
                </div>

                {weeklyTrend !== null ? (
                    <div className={`flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded-full font-bold mb-1 shrink-0 ml-2
                        ${weeklyTrend > 0 ? 'bg-rose-50 text-rose-600' : weeklyTrend < 0 ? 'bg-emerald-50 text-emerald-600' : 'bg-slate-50 text-slate-400'}`}>
                        {weeklyTrend > 0 ? <TrendingUp className="w-2.5 h-2.5" /> : weeklyTrend < 0 ? <TrendingDown className="w-2.5 h-2.5" /> : <Minus className="w-2.5 h-2.5" />}
                        {weeklyTrend > 0 ? '+' : ''}{weeklyTrend.toFixed(0)}%
                    </div>
                ) : (
                    <div className="text-[9px] text-slate-300 italic mb-1 shrink-0 ml-2">Weekly pending</div>
                )}
            </div>

            {/* Divider */}
            <div className="w-full h-px bg-slate-100 mb-2 relative z-10" />

            {/* Bottom row: Monthly Trend */}
            <div className="flex flex-col gap-1.5 relative z-10 w-full min-w-0">
                <div className="flex items-center justify-between w-full">
                    <span className="text-[10.5px] text-slate-500 font-medium shrink-0">Severity</span>
                    {count > 0 ? (
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md uppercase tracking-wide shrink-0 ${colors.badge}`}>
                            {severity}
                        </span>
                    ) : (
                        <span className="text-[10px] font-semibold text-emerald-600 bg-emerald-50 px-1.5 py-0.5 rounded-md shrink-0">
                            None
                        </span>
                    )}
                </div>

                <div className="flex items-center justify-end w-full">
                    {monthlyTrend !== null ? (
                        <div className={`flex items-center gap-0.5 text-[9px] font-semibold shrink-0
                            ${monthlyTrend > 0 ? 'text-rose-500' : monthlyTrend < 0 ? 'text-emerald-500' : 'text-slate-400'}`}>
                            {monthlyTrend > 0 ? <TrendingUp className="w-2 h-2" /> : monthlyTrend < 0 ? <TrendingDown className="w-2 h-2" /> : <Minus className="w-2 h-2" />}
                            <span>{monthlyTrend > 0 ? '+' : ''}{monthlyTrend.toFixed(0)}% monthly</span>
                        </div>
                    ) : (
                        <span className="text-[8.5px] text-slate-300 italic shrink-0">Monthly trend pending</span>
                    )}
                </div>
            </div>

            <div className="absolute inset-0 bg-slate-50 opacity-0 group-hover:opacity-100 transition-opacity z-0 pointer-events-none" />
        </div>
    )
}
