'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle, Clock } from 'lucide-react'

export function WeeklyUpdates({ updates }: { updates: any[] }) {
    const [currentIndex, setCurrentIndex] = useState(0)

    if (!updates || updates.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 p-6 text-center text-slate-500">
                No update recorded.
            </div>
        )
    }

    const currentUpdate = updates[currentIndex]
    const items = currentUpdate.items || []

    const progress = items.filter((i: any) => i.section === 'progress')
    const changes = items.filter((i: any) => i.section === 'changes')
    const risks = items.filter((i: any) => i.section === 'risks')
    const next = items.filter((i: any) => i.section === 'next')

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8">
            {/* Header / Carousel Controls */}
            <div className="p-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                <h2 className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                    Weekly Updates
                    {currentUpdate.overall_status === 'on_track' && (
                        <span className="bg-emerald-100 text-emerald-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <CheckCircle className="w-3 h-3" /> On Track
                        </span>
                    )}
                    {currentUpdate.overall_status === 'at_risk' && (
                        <span className="bg-red-100 text-red-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" /> At Risk
                        </span>
                    )}
                    {currentUpdate.overall_status === 'slight_delay' && (
                        <span className="bg-amber-100 text-amber-700 text-xs px-2 py-0.5 rounded-full font-medium flex items-center gap-1">
                            <Clock className="w-3 h-3" /> Slight Delay
                        </span>
                    )}
                </h2>

                <div className="flex items-center gap-4">
                    <span className="text-sm font-medium text-slate-600">
                        {currentUpdate.date_range_label} <span className="text-slate-400">({currentUpdate.week_id})</span>
                    </span>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={() => setCurrentIndex(Math.min(currentIndex + 1, updates.length - 1))}
                            disabled={currentIndex === updates.length - 1}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <span className="text-xs font-semibold text-slate-500 w-20 text-center">
                            {currentIndex === 0 ? "This week" : `${currentIndex} wks ago`}
                        </span>
                        <button
                            onClick={() => setCurrentIndex(Math.max(currentIndex - 1, 0))}
                            disabled={currentIndex === 0}
                            className="p-1 rounded-md text-slate-500 hover:bg-slate-200 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                        >
                            <ChevronRight className="w-5 h-5" />
                        </button>
                    </div>
                </div>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-0 divide-y lg:divide-y-0 lg:divide-x divide-slate-100">

                {/* Progress */}
                <div className="p-5 flex flex-col h-64 overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                        Progress & Accomplishments
                    </h3>
                    <ul className="text-sm text-slate-600 space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {progress.length > 0 ? progress.map((item: any) => (
                            <li key={item.id} className="flex gap-2">
                                <span className="text-blue-500 mt-0.5">•</span>
                                <span>{item.bullet_text}</span>
                            </li>
                        )) : <li className="text-slate-400 italic">No updates</li>}
                    </ul>
                </div>

                {/* Changes */}
                <div className="p-5 flex flex-col h-64 overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                        What Changed This Week
                    </h3>
                    <ul className="text-sm text-slate-600 space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {changes.length > 0 ? changes.map((item: any) => (
                            <li key={item.id} className="flex gap-2">
                                <span className="text-indigo-500 mt-0.5">•</span>
                                <span>{item.bullet_text}</span>
                            </li>
                        )) : <li className="text-slate-400 italic">No updates</li>}
                    </ul>
                </div>

                {/* Risks */}
                <div className="p-5 flex flex-col h-64 overflow-hidden">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                        Risks & Watchouts
                    </h3>
                    <div className="text-sm flex-1 overflow-y-auto pr-2 custom-scrollbar space-y-4">
                        {risks.length > 0 ? risks.map((item: any) => (
                            <div key={item.id} className="bg-red-50/50 p-2.5 rounded-md border border-red-100/50">
                                <p className="text-red-800 font-medium mb-1 line-clamp-2">{item.risk_text}</p>
                                {item.mitigation_text && (
                                    <div className="mt-2 pt-2 border-t border-red-100">
                                        <span className="text-xs font-bold text-red-600 uppercase tracking-widest block mb-1">Mitigation</span>
                                        <p className="text-slate-700 leading-tight">{item.mitigation_text}</p>
                                    </div>
                                )}
                            </div>
                        )) : <div className="text-slate-400 italic">No risks identified</div>}
                    </div>
                </div>

                {/* Next */}
                <div className="p-5 flex flex-col h-64 overflow-hidden bg-slate-50/30">
                    <h3 className="text-sm font-bold text-slate-800 mb-3 flex items-center gap-1.5 uppercase tracking-wide">
                        What's Next
                    </h3>
                    <ul className="text-sm text-slate-600 space-y-2 flex-1 overflow-y-auto pr-2 custom-scrollbar">
                        {next.length > 0 ? next.map((item: any) => (
                            <li key={item.id} className="flex gap-2">
                                <span className="text-emerald-500 mt-0.5">→</span>
                                <span>{item.bullet_text}</span>
                            </li>
                        )) : <li className="text-slate-400 italic">No updates</li>}
                    </ul>
                </div>

            </div>
        </div>
    )
}
