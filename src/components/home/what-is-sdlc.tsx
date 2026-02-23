import { Target, CheckCircle2, RefreshCw, BarChart3, Users } from 'lucide-react'

export function WhatIsSDLC() {
    const benefits = [
        { text: 'Standardized intake & prioritization', icon: Target },
        { text: 'Cross-functional alignment', icon: Users },
        { text: 'Quality-controlled delivery', icon: CheckCircle2 },
        { text: 'Transparent release management', icon: RefreshCw },
        { text: 'Measurable value delivery', icon: BarChart3 },
    ]

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            <div className="p-6 border-b border-slate-100 bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900">What is the SDLC?</h2>
            </div>
            <div className="p-6 flex flex-col md:flex-row gap-8">
                <div className="flex-1">
                    <p className="text-slate-700 leading-relaxed text-sm md:text-base">
                        <strong className="text-slate-900 font-semibold">SDLC</strong> is our enterprise framework that governs how ideas move from intake to production in a structured, measurable, and accountable way. It provides a standardized path for all technology initiatives to ensure alignment with business goals and quality execution.
                    </p>

                    {/* Mini Visual Pipeline */}
                    <div className="mt-8 flex items-center w-full overflow-x-auto pb-4 hide-scrollbar">
                        {['Ideation', 'Discovery', 'Planning', 'Design', 'Development', 'Deployment'].map((phase, idx, arr) => (
                            <div key={phase} className="flex items-center shrink-0">
                                <div className="bg-slate-100 border border-slate-200 text-slate-600 text-xs px-3 py-1.5 rounded-full font-medium whitespace-nowrap">
                                    {phase}
                                </div>
                                {idx < arr.length - 1 && (
                                    <div className="w-6 h-px bg-slate-300 mx-1"></div>
                                )}
                            </div>
                        ))}
                    </div>
                </div>

                <div className="w-full md:w-1/3 bg-slate-50 rounded-lg p-5 border border-slate-100">
                    <h3 className="text-sm font-semibold text-slate-900 mb-4 tracking-tight">Core Benefits</h3>
                    <ul className="space-y-3">
                        {benefits.map((benefit, idx) => (
                            <li key={idx} className="flex items-start gap-3">
                                <div className="mt-0.5 bg-blue-100 p-1 rounded-md text-blue-600">
                                    <benefit.icon className="w-3.5 h-3.5" />
                                </div>
                                <span className="text-sm text-slate-700">{benefit.text}</span>
                            </li>
                        ))}
                    </ul>
                </div>
            </div>
        </div>
    )
}
