'use client'

import { LineChart, Line, XAxis, YAxis, ResponsiveContainer, Tooltip, ReferenceLine } from 'recharts'
import { Activity, TrendingUp, TrendingDown, Eye, Wrench, AlertTriangle } from 'lucide-react'

interface IncidentData {
    totalIncidents: number
    totalIncidentsPrev: number
    incidentsPerRelease: number
    incidentsPerReleasePrev: number
    avgMTTD: number
    avgMTTDPrev: number
    avgMTTR: number
    avgMTTRPrev: number
    trend: { release: string; incidents: number }[]
    tolerancePerRelease: number
}

interface IncidentStabilitySectionProps {
    data: IncidentData
}

function MetricCard({
    label,
    value,
    unit,
    previous,
    icon: Icon,
    higherIsWorse = true,
}: {
    label: string
    value: number | string
    unit: string
    previous: number
    icon: React.ElementType
    higherIsWorse?: boolean
}) {
    const numVal = typeof value === 'number' ? value : parseFloat(value)
    const diff = numVal - previous
    const improved = higherIsWorse ? diff <= 0 : diff >= 0

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 hover:shadow-md transition-all duration-300">
            <div className="flex items-center gap-2 mb-2">
                <div className="bg-slate-100 p-2 rounded-lg">
                    <Icon className="w-4 h-4 text-slate-600" />
                </div>
                <span className="text-xs font-semibold text-slate-600">{label}</span>
            </div>
            <div className="flex items-baseline gap-1.5">
                <span className="text-2xl font-bold text-slate-900">{value}</span>
                <span className="text-xs text-slate-400 font-medium">{unit}</span>
            </div>
            <div className="flex items-center gap-1 mt-1.5">
                {improved ? (
                    <TrendingDown className="w-3 h-3 text-emerald-500" />
                ) : (
                    <TrendingUp className="w-3 h-3 text-red-500" />
                )}
                <span className={`text-[10px] font-semibold ${improved ? 'text-emerald-600' : 'text-red-500'}`}>
                    {improved ? 'Improved' : 'Worsened'} vs prev Q ({previous}{unit})
                </span>
            </div>
        </div>
    )
}

export function IncidentStabilitySection({ data }: IncidentStabilitySectionProps) {
    const exceedsTolerance = data.incidentsPerRelease > data.tolerancePerRelease

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-red-500 rounded-full" />
                <h3 className="text-sm font-bold text-slate-800">Incident & Stability Metrics</h3>
                {exceedsTolerance && (
                    <div className="flex items-center gap-1 bg-red-50 border border-red-100 rounded-full px-2 py-0.5 ml-2">
                        <AlertTriangle className="w-3 h-3 text-red-500" />
                        <span className="text-[10px] font-semibold text-red-600">
                            Incident rate exceeds tolerance ({data.tolerancePerRelease}/release)
                        </span>
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
                <MetricCard
                    label="Post-Deploy Incidents"
                    value={data.totalIncidents}
                    unit=""
                    previous={data.totalIncidentsPrev}
                    icon={Activity}
                />
                <MetricCard
                    label="Incidents / Release"
                    value={data.incidentsPerRelease}
                    unit=""
                    previous={data.incidentsPerReleasePrev}
                    icon={AlertTriangle}
                />
                <MetricCard
                    label="Mean Time to Detect"
                    value={data.avgMTTD}
                    unit=" min"
                    previous={data.avgMTTDPrev}
                    icon={Eye}
                />
                <MetricCard
                    label="Mean Time to Resolve"
                    value={data.avgMTTR}
                    unit=" min"
                    previous={data.avgMTTRPrev}
                    icon={Wrench}
                />
            </div>

            {/* Trend Chart */}
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
                <h4 className="text-xs font-semibold text-slate-600 mb-3">Incidents per Release — Last 6 Releases</h4>
                <div className="h-40">
                    <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={data.trend} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                            <XAxis
                                dataKey="release"
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                interval={0}
                                angle={-15}
                                textAnchor="end"
                                height={40}
                            />
                            <YAxis
                                tick={{ fontSize: 10, fill: '#94a3b8' }}
                                axisLine={false}
                                tickLine={false}
                                allowDecimals={false}
                                width={25}
                            />
                            <Tooltip
                                contentStyle={{
                                    background: '#1e293b',
                                    border: 'none',
                                    borderRadius: '8px',
                                    fontSize: '11px',
                                    color: '#e2e8f0',
                                    padding: '6px 10px'
                                }}
                            />
                            <ReferenceLine
                                y={data.tolerancePerRelease}
                                stroke="#ef4444"
                                strokeDasharray="4 4"
                                strokeWidth={1}
                                label={{ value: 'Tolerance', position: 'insideTopRight', fontSize: 10, fill: '#ef4444' }}
                            />
                            <Line
                                type="monotone"
                                dataKey="incidents"
                                stroke="#6366f1"
                                strokeWidth={2}
                                dot={{ r: 4, fill: '#6366f1', strokeWidth: 2, stroke: '#fff' }}
                                activeDot={{ r: 6 }}
                            />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            </div>
        </div>
    )
}
