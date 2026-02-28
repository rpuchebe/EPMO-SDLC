import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, Legend } from 'recharts'
import { PieChart as PieChartIcon } from 'lucide-react'

interface LinkedItemBreakdown {
    type: string
    count: number
    percentage: number
}

interface BacklogDistributionProps {
    data: LinkedItemBreakdown[]
    onItemClick?: (type: string) => void
}

const COLORS = [
    '#3b82f6', // blue-500
    '#f59e0b', // amber-500
    '#10b981', // emerald-500
    '#6366f1', // indigo-500
    '#ec4899', // pink-500
    '#8b5cf6', // violet-500
    '#14b8a6', // teal-500
    '#f43f5e', // rose-500
]

export function BacklogDistribution({ data, onItemClick }: BacklogDistributionProps) {
    const header = (
        <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40 flex-shrink-0">
            <div className="w-[3px] h-5 rounded-full bg-[#3b82f6] flex-shrink-0" />
            <PieChartIcon className="w-4 h-4 text-slate-500" />
            <h3 className="text-sm font-semibold text-slate-800">Workstream Backlog Distribution</h3>
            <span className="ml-auto text-xs text-slate-400">Issue type breakdown</span>
        </div>
    )

    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
                {header}
                <div className="flex-1 flex items-center justify-center min-h-[250px] text-sm text-slate-400">
                    No backlog breakdown data yet
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col max-w-[500px] h-[350px]">
            {header}

            <div className="px-6 py-3 flex-1 mx-auto w-full">
                <div className="flex flex-col h-full relative border-none">
                    <div className="flex-1 flex items-center justify-between min-h-[120px]">
                        {/* Donut (left) */}
                        <div className="relative w-1/2 h-full min-h-[120px]">
                            <ResponsiveContainer width="100%" height="100%">
                                <PieChart>
                                    <Pie
                                        data={data}
                                        cx="50%"
                                        cy="50%"
                                        innerRadius={52}
                                        outerRadius={70}
                                        paddingAngle={5}
                                        dataKey="count"
                                        nameKey="type"
                                        cornerRadius={8}
                                        stroke="none"
                                        onClick={(entry) => onItemClick?.(entry.type)}
                                        className="cursor-pointer outline-none hover:opacity-80 transition-opacity"
                                        startAngle={90}
                                        endAngle={-270}
                                    >
                                        {data.map((entry, index) => (
                                            <Cell
                                                key={`cell-${index}`}
                                                fill={COLORS[index % COLORS.length]}
                                            />
                                        ))}
                                    </Pie>

                                    <RechartsTooltip
                                        cursor={false}
                                        allowEscapeViewBox={{ x: true, y: true }}
                                        contentStyle={{
                                            borderRadius: '8px',
                                            border: '1px solid #e2e8f0',
                                            boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
                                            fontSize: '12px',
                                        }}
                                        itemStyle={{ color: '#1e293b', fontWeight: 500 }}
                                    />
                                </PieChart>
                            </ResponsiveContainer>

                            {/* Center Text */}
                            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                                <span className="text-xl font-bold text-slate-800 leading-none">
                                    {data.reduce((sum, item) => sum + item.count, 0)}
                                </span>
                                <span className="text-[9px] uppercase tracking-wider text-slate-400 font-medium">Total</span>
                            </div>
                        </div>

                        {/* Legend (right) */}
                        <div className="w-1/2 flex flex-col justify-center gap-1.5 pl-4">
                            {data.map((item, idx) => (
                                <div
                                    key={idx}
                                    onClick={() => onItemClick?.(item.type)}
                                    className="flex items-center justify-between group cursor-pointer"
                                >
                                    <div className="flex items-center gap-2 overflow-hidden">
                                        <span
                                            className="w-2 h-2 rounded-full shrink-0 group-hover:scale-125 transition-transform"
                                            style={{ backgroundColor: COLORS[idx % COLORS.length] }}
                                        />
                                        <span className="text-[11px] text-slate-600 truncate group-hover:text-slate-900 transition-colors">
                                            {item.type}
                                        </span>
                                    </div>

                                    <span className="text-[11px] font-semibold text-slate-700 ml-2 tabular-nums">
                                        {item.count}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}
