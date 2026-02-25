'use client'

import { Activity, ArrowDown, ArrowUp, Minus } from 'lucide-react'

interface CleanupProgressProps {
    data: {
        currentWeek: Record<string, number>
        lastWeek: Record<string, number>
    }
}

export function CleanupProgress({ data }: CleanupProgressProps) {
    if (!data || !data.currentWeek || !data.lastWeek) return null

    const currentTotal = Object.values(data.currentWeek).reduce((sum, val) => sum + val, 0)
    const lastTotal = Object.values(data.lastWeek).reduce((sum, val) => sum + val, 0)

    const diff = currentTotal - lastTotal
    const isImproved = diff < 0
    const isWorse = diff > 0
    const isSame = diff === 0

    return (
        <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4 flex items-center gap-2">
                <Activity className="w-5 h-5 text-indigo-500" />
                Data Cleanup Progress
            </h2>
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-6">

                <div className="flex flex-col">
                    <span className="text-sm font-medium text-slate-500 mb-1">Total Open Issues</span>
                    <div className="flex items-baseline gap-3">
                        <span className="text-4xl font-bold text-slate-900">{currentTotal}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-sm text-slate-400">vs {lastTotal} last week</span>
                            <span className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded-full text-xs font-semibold ${isImproved ? 'bg-emerald-100 text-emerald-700' :
                                    isWorse ? 'bg-red-100 text-red-700' :
                                        'bg-slate-100 text-slate-700'
                                }`}>
                                {isImproved && <ArrowDown className="w-3 h-3" />}
                                {isWorse && <ArrowUp className="w-3 h-3" />}
                                {isSame && <Minus className="w-3 h-3" />}
                                {Math.abs(diff)}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="flex-1 grid grid-cols-1 sm:grid-cols-3 gap-4 w-full border-t md:border-t-0 md:border-l border-slate-100 pt-4 md:pt-0 md:pl-6">
                    <div>
                        <span className="block text-xs font-semibold text-slate-500 mb-2">INITIATIVES</span>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">No Category</span>
                                <span className="font-medium text-slate-900">{data.currentWeek.initiativesNoCategory}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Wrong Status</span>
                                <span className="font-medium text-slate-900">{data.currentWeek.initiativesWrongStatus}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <span className="block text-xs font-semibold text-slate-500 mb-2">PROJECTS</span>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Mssg Children</span>
                                <span className="font-medium text-slate-900">{data.currentWeek.projectsNoChildren}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Mssg Parent</span>
                                <span className="font-medium text-slate-900">{data.currentWeek.projectsNoParent}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Wrong Status</span>
                                <span className="font-medium text-slate-900">{data.currentWeek.projectsWrongStatus}</span>
                            </div>
                        </div>
                    </div>
                    <div>
                        <span className="block text-xs font-semibold text-slate-500 mb-2">BWI</span>
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Mssg Children</span>
                                <span className="font-medium text-slate-900">{data.currentWeek.bwiNoChildren}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Mssg Parent</span>
                                <span className="font-medium text-slate-900">{data.currentWeek.bwiNoParent}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-600">Wrong Status</span>
                                <span className="font-medium text-slate-900">{data.currentWeek.bwiWrongStatus}</span>
                            </div>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    )
}
