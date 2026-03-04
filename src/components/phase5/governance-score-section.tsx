'use client'

import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts'
import { ShieldCheck, AlertTriangle } from 'lucide-react'

interface GovernanceDimension {
    name: string
    score: number
    weight: number
}

interface GovernanceData {
    overallScore: number
    dimensions: GovernanceDimension[]
}

interface GovernanceScoreSectionProps {
    data: GovernanceData
}

function getScoreColor(score: number): string {
    if (score >= 80) return '#10b981'
    if (score >= 60) return '#f59e0b'
    return '#ef4444'
}

function getScoreLabel(score: number): string {
    if (score >= 80) return 'Strong'
    if (score >= 60) return 'Moderate'
    return 'At Risk'
}

function getScoreBadge(score: number) {
    if (score >= 80) return { bg: 'bg-emerald-100', text: 'text-emerald-700' }
    if (score >= 60) return { bg: 'bg-amber-100', text: 'text-amber-700' }
    return { bg: 'bg-red-100', text: 'text-red-700' }
}

export function GovernanceScoreSection({ data }: GovernanceScoreSectionProps) {
    const color = getScoreColor(data.overallScore)
    const label = getScoreLabel(data.overallScore)
    const trackColor = '#f1f5f9'
    const lowestDim = [...data.dimensions].sort((a, b) => a.score - b.score)[0]

    const gaugeData = [
        { name: 'Score', value: data.overallScore },
        { name: 'Remaining', value: 100 - data.overallScore },
    ]

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-orange-500 rounded-full" />
                <h3 className="text-sm font-bold text-slate-800">Governance Compliance Score</h3>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                {/* Gauge */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col items-center justify-center">
                    <div className="relative w-44 h-24 overflow-hidden">
                        <ResponsiveContainer width="100%" height="200%">
                            <PieChart>
                                <Pie
                                    data={gaugeData}
                                    cx="50%"
                                    cy="50%"
                                    startAngle={180}
                                    endAngle={0}
                                    innerRadius="68%"
                                    outerRadius="100%"
                                    dataKey="value"
                                    stroke="none"
                                >
                                    <Cell fill={color} />
                                    <Cell fill={trackColor} />
                                </Pie>
                            </PieChart>
                        </ResponsiveContainer>
                        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center pb-0">
                            <span className="text-3xl font-extrabold text-slate-900 leading-none">
                                {data.overallScore}
                            </span>
                            <span className="text-[10px] text-slate-400 font-medium mt-0.5">/ 100</span>
                        </div>
                    </div>
                    <div className="flex items-center gap-2 mt-3">
                        <ShieldCheck className="w-4 h-4" style={{ color }} />
                        <span className="text-sm font-bold" style={{ color }}>{label}</span>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-1 text-center">
                        Composite score based on 5 governance dimensions
                    </p>
                </div>

                {/* Breakdown Table */}
                <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 lg:col-span-2">
                    <h4 className="text-xs font-semibold text-slate-600 mb-3">Dimension Breakdown</h4>
                    <div className="space-y-2.5">
                        {data.dimensions.map((dim, i) => {
                            const dimColor = getScoreColor(dim.score)
                            const badge = getScoreBadge(dim.score)
                            const isLowest = dim.name === lowestDim.name
                            return (
                                <div
                                    key={i}
                                    className={`flex items-center gap-3 p-2.5 rounded-xl transition-all ${isLowest
                                        ? 'bg-red-50/60 border border-red-100'
                                        : 'hover:bg-slate-50'
                                        }`}
                                >
                                    {isLowest && (
                                        <AlertTriangle className="w-3.5 h-3.5 text-red-500 shrink-0" />
                                    )}
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center justify-between mb-1">
                                            <span className={`text-xs font-medium ${isLowest ? 'text-red-700' : 'text-slate-700'}`}>
                                                {dim.name}
                                            </span>
                                            <div className="flex items-center gap-2">
                                                <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${badge.bg} ${badge.text}`}>
                                                    {dim.score}%
                                                </span>
                                                <span className="text-[10px] text-slate-400">
                                                    w: {(dim.weight * 100).toFixed(0)}%
                                                </span>
                                            </div>
                                        </div>
                                        <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                            <div
                                                className="h-full rounded-full transition-all duration-700"
                                                style={{
                                                    width: `${dim.score}%`,
                                                    backgroundColor: dimColor,
                                                }}
                                            />
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {lowestDim && (
                        <div className="mt-3 p-2.5 bg-red-50 rounded-lg border border-red-100 flex items-start gap-2">
                            <AlertTriangle className="w-3.5 h-3.5 text-red-500 mt-0.5 shrink-0" />
                            <p className="text-xs text-red-700 leading-relaxed">
                                <span className="font-semibold">{lowestDim.name}</span> is the lowest-performing dimension at {lowestDim.score}%. Focus improvement efforts here to boost the overall governance score.
                            </p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
