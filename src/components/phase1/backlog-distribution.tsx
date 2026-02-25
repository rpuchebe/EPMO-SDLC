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
    if (!data || data.length === 0) {
        return (
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full">
                <div className="flex items-center gap-2 mb-6 shrink-0">
                    <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                        <PieChartIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h3 className="text-base font-bold text-slate-900">Workstream Backlog Distribution</h3>
                        <p className="text-xs text-slate-500">Linked issue types for backlog tickets</p>
                    </div>
                </div>
                <div className="flex-1 flex items-center justify-center min-h-[250px] text-sm text-slate-400">
                    No backlog breakdown data yet
                </div>
            </div>
        )
    }

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 flex flex-col h-full min-h-[280px]">
            <div className="flex items-center gap-2 mb-2 shrink-0">
                <div className="p-2 bg-blue-50 text-blue-600 rounded-lg">
                    <PieChartIcon className="w-5 h-5" />
                </div>
                <div>
                    <h3 className="text-base font-bold text-slate-900">Workstream Backlog Distribution</h3>
                    <p className="text-xs text-slate-500">Linked issue types for backlog tickets</p>
                </div>
            </div>

            <div className="flex-1 h-full min-h-[240px] mt-4 relative">
                <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                        <Pie
                            data={data}
                            cx="50%"
                            cy="45%"
                            innerRadius={50}
                            outerRadius={80}
                            paddingAngle={3}
                            dataKey="count"
                            nameKey="type"
                            stroke="none"
                            onClick={(entry) => onItemClick?.(entry.type)}
                            className={onItemClick ? "cursor-pointer" : ""}
                        >
                            {data.map((entry, index) => (
                                <Cell
                                    key={`cell-${index}`}
                                    fill={COLORS[index % COLORS.length]}
                                    className="hover:opacity-80 transition-opacity outline-none"
                                />
                            ))}
                        </Pie>
                        <RechartsTooltip
                            content={({ active, payload }) => {
                                if (!active || !payload?.length) return null
                                const data = payload[0].payload
                                return (
                                    <div className="bg-white p-3 rounded-lg shadow-lg border border-slate-100 min-w-[150px]">
                                        <p className="font-semibold text-slate-900 text-sm mb-1">{data.type}</p>
                                        <p className="text-slate-600 text-xs">
                                            {data.count} items ({data.percentage}%)
                                        </p>
                                    </div>
                                )
                            }}
                        />
                        <Legend
                            verticalAlign="bottom"
                            height={36}
                            content={(props) => {
                                const { payload } = props;
                                if (!payload) return null;
                                return (
                                    <ul className="flex flex-wrap justify-center gap-4 mt-8">
                                        {payload.map((entry, index) => (
                                            <li
                                                key={`item-${index}`}
                                                className="flex items-center text-xs text-slate-600"
                                            >
                                                <span
                                                    className="w-3 h-3 rounded-full mr-2"
                                                    style={{ backgroundColor: entry.color }}
                                                />
                                                <span className="font-medium">{entry.value}</span>
                                                <span className="ml-1 text-slate-400">({data[index].count})</span>
                                            </li>
                                        ))}
                                    </ul>
                                );
                            }}
                        />
                    </PieChart>
                </ResponsiveContainer>

                {/* Center label */}
                <div className="absolut inset-0 pointer-events-none flex flex-col items-center justify-center text-center pb-8 absolute top-0 left-0 right-0 bottom-0 h-[90%]">
                    <span className="text-3xl font-bold tracking-tight text-slate-900">
                        {data.reduce((sum, item) => sum + item.count, 0)}
                    </span>
                    <span className="text-xs text-slate-500 font-medium tracking-wide uppercase mt-0.5">
                        Linked Items
                    </span>
                </div>
            </div>
        </div>
    )
}
