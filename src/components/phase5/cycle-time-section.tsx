'use client'

import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, Cell } from 'recharts'
import { Clock, Zap, ArrowRightLeft, Server, CloudUpload } from 'lucide-react'

interface CycleMetric {
    current: number
    unit: string
    sla: number
    trend: { label: string; value: number }[]
}

interface CycleTimeData {
    regressionToProd: CycleMetric
    dipCreationToApproval: CycleMetric
    sandboxToProdGap: CycleMetric
    sandboxDeployDuration: CycleMetric
    prodDeployDuration: CycleMetric
}

interface CycleTimeSectionProps {
    data: CycleTimeData
}

function getSLAStatus(current: number, sla: number, higherIsBetter = false): 'green' | 'yellow' | 'red' {
    if (higherIsBetter) {
        if (current >= sla) return 'green'
        if (current >= sla * 0.85) return 'yellow'
        return 'red'
    }
    if (current <= sla) return 'green'
    if (current <= sla * 1.15) return 'yellow'
    return 'red'
}

const slaColors = {
    green: { dot: 'bg-emerald-500', text: 'text-emerald-600', bg: 'bg-emerald-50', label: 'Within SLA' },
    yellow: { dot: 'bg-amber-500', text: 'text-amber-600', bg: 'bg-amber-50', label: 'Near Threshold' },
    red: { dot: 'bg-red-500', text: 'text-red-600', bg: 'bg-red-50', label: 'Exceeds SLA' },
}

function CycleMetricCard({
    title,
    icon: Icon,
    metric,
    higherIsBetter = false,
}: {
    title: string
    icon: React.ElementType
    metric: CycleMetric
    higherIsBetter?: boolean
}) {
    const status = getSLAStatus(metric.current, metric.sla, higherIsBetter)
    const colors = slaColors[status]

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all duration-300">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2.5">
                    <div className="bg-slate-100 p-2 rounded-lg">
                        <Icon className="w-4 h-4 text-slate-600" />
                    </div>
                    <h4 className="text-xs font-semibold text-slate-700 leading-tight">{title}</h4>
                </div>
                <div className={`flex items-center gap-1.5 ${colors.bg} ${colors.text} rounded-full px-2 py-0.5`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${colors.dot}`} />
                    <span className="text-[10px] font-semibold">{colors.label}</span>
                </div>
            </div>
            <div className="flex items-baseline gap-1.5 mb-1">
                <span className="text-2xl font-bold text-slate-900">{metric.current}</span>
                <span className="text-xs text-slate-400 font-medium">{metric.unit}</span>
                <span className="text-[10px] text-slate-400 ml-auto">SLA: {metric.sla} {metric.unit}</span>
            </div>
            <div className="h-16 mt-2">
                <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={metric.trend} barCategoryGap="20%">
                        <XAxis dataKey="label" tick={false} axisLine={false} tickLine={false} />
                        <YAxis hide />
                        <Tooltip
                            contentStyle={{
                                background: '#1e293b',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '11px',
                                color: '#e2e8f0',
                                padding: '6px 10px'
                            }}
                            formatter={(val: number | undefined) => [`${val ?? 0} ${metric.unit}`, '']}
                            labelFormatter={(label) => `Week ${label}`}
                        />
                        <Bar dataKey="value" radius={[3, 3, 0, 0]}>
                            {metric.trend.map((entry, idx) => {
                                const s = getSLAStatus(entry.value, metric.sla, higherIsBetter)
                                const fill = s === 'green' ? '#10b981' : s === 'yellow' ? '#f59e0b' : '#ef4444'
                                return <Cell key={idx} fill={fill} fillOpacity={0.7} />
                            })}
                        </Bar>
                    </BarChart>
                </ResponsiveContainer>
            </div>
            <p className="text-[10px] text-slate-400 mt-1">90-day trend (weekly)</p>
        </div>
    )
}

export function CycleTimeSection({ data }: CycleTimeSectionProps) {
    const metrics = [
        { title: 'Avg Regression → Production', icon: ArrowRightLeft, metric: data.regressionToProd },
        { title: 'Avg DIP Creation → Approval', icon: Clock, metric: data.dipCreationToApproval },
        { title: 'Avg Sandbox → Production Gap', icon: Zap, metric: data.sandboxToProdGap, higherIsBetter: true },
        { title: 'Avg Sandbox Deploy Duration', icon: Server, metric: data.sandboxDeployDuration },
        { title: 'Avg Production Deploy Duration', icon: CloudUpload, metric: data.prodDeployDuration },
    ]

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-violet-500 rounded-full" />
                <h3 className="text-sm font-bold text-slate-800">Cycle Time Metrics</h3>
                <span className="text-[10px] text-slate-400 font-medium">Performance & Flow</span>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {metrics.map((m, i) => (
                    <CycleMetricCard
                        key={i}
                        title={m.title}
                        icon={m.icon}
                        metric={m.metric}
                        higherIsBetter={m.higherIsBetter}
                    />
                ))}
            </div>
        </div>
    )
}
