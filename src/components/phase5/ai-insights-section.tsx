'use client'

import { Brain, AlertTriangle, Link, ClipboardCheck, Lightbulb } from 'lucide-react'

interface Insight {
    category: string
    icon: string
    text: string
}

interface AiInsightsSectionProps {
    data: Insight[]
}

const categoryConfig: Record<string, { icon: React.ElementType; color: string; bg: string; border: string }> = {
    Bottleneck: { icon: AlertTriangle, color: 'text-amber-600', bg: 'bg-amber-50', border: 'border-amber-100' },
    Correlation: { icon: Link, color: 'text-violet-600', bg: 'bg-violet-50', border: 'border-violet-100' },
    Governance: { icon: ClipboardCheck, color: 'text-blue-600', bg: 'bg-blue-50', border: 'border-blue-100' },
    Recommendation: { icon: Lightbulb, color: 'text-emerald-600', bg: 'bg-emerald-50', border: 'border-emerald-100' },
}

export function AiInsightsSection({ data }: AiInsightsSectionProps) {
    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-gradient-to-b from-indigo-500 to-purple-500 rounded-full" />
                <Brain className="w-4 h-4 text-indigo-500" />
                <h3 className="text-sm font-bold text-slate-800">AI Insights</h3>
                <span className="text-[10px] text-slate-400 font-medium">Auto-generated analysis</span>
            </div>
            <div className="bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-900 rounded-2xl p-5 shadow-lg">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    {data.map((insight, i) => {
                        const config = categoryConfig[insight.category] || categoryConfig.Recommendation
                        const Icon = config.icon

                        return (
                            <div
                                key={i}
                                className="bg-white/5 backdrop-blur-sm border border-white/10 rounded-xl p-4
                                           hover:bg-white/10 transition-all duration-300"
                            >
                                <div className="flex items-center gap-2 mb-2">
                                    <div className={`${config.bg} p-1.5 rounded-lg`}>
                                        <Icon className={`w-3.5 h-3.5 ${config.color}`} />
                                    </div>
                                    <span className={`text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
                                        {insight.category}
                                    </span>
                                </div>
                                <p className="text-sm text-slate-200 leading-relaxed">
                                    {insight.text}
                                </p>
                            </div>
                        )
                    })}
                </div>
                <p className="text-[10px] text-slate-500 mt-3 text-center">
                    Insights generated from deployment data patterns • Updated with each data refresh
                </p>
            </div>
        </div>
    )
}
