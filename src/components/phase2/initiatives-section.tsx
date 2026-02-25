'use client'

import { Activity, CheckCircle, HelpCircle, AlertTriangle, ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MiniBarChart } from './charts/mini-bar-chart'
import { MiniDonutChart } from './charts/mini-donut-chart'
import { SemiGaugeChart } from './charts/semi-gauge-chart'
import { StackedBarChart } from './charts/stacked-bar-chart'

interface InitiativesSectionProps {
    data: any
}

export function InitiativesSection({ data }: InitiativesSectionProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleDrillDown = (metric_id: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('metric_id', metric_id)
        router.push(`/phase-2/initiatives/detail?${params.toString()}`)
    }

    return (
        <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Workstream Initiatives</h2>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">

                {/* Large Card: Initiatives Created */}
                <div
                    onClick={() => handleDrillDown('created')}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all md:col-span-2 lg:col-span-2"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-indigo-600">
                            <Activity className="w-5 h-5 bg-indigo-50 p-1 rounded" />
                            <span className="text-sm font-semibold text-slate-700">Initiatives Created</span>
                        </div>
                        <div className="text-4xl font-bold text-slate-900">{data.created}</div>
                    </div>

                    <div className="flex items-end justify-between mt-4">
                        <div className="text-sm text-slate-500">
                            <span className="font-semibold text-slate-700">{data.inProgress}</span> In Progress
                        </div>
                        <div className="flex flex-col items-end gap-1">
                            <MiniBarChart data={data.createdTrend} color="#6366f1" />
                            <span className="text-xs text-slate-400 flex items-center">Last 7 days <ChevronRight className="w-3 h-3 ml-0.5" /></span>
                        </div>
                    </div>
                </div>

                {/* Small Card: Completed */}
                <div
                    onClick={() => handleDrillDown('completed')}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-emerald-300 hover:shadow-md transition-all lg:col-span-2 flex flex-col justify-between"
                >
                    <div className="flex justify-between items-start">
                        <div>
                            <div className="flex items-center gap-2 mb-2 text-emerald-600">
                                <CheckCircle className="w-5 h-5 bg-emerald-50 p-1 rounded" />
                                <span className="text-sm font-semibold text-slate-700">Initiatives Completed</span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900">{data.completed}</div>
                        </div>
                        <div className="mt-1">
                            <MiniDonutChart value={data.completed} total={data.created} color="#10b981" />
                        </div>
                    </div>
                    <div className="text-sm text-slate-500 mt-2">Completed</div>
                </div>

                {/* Small Card: No Inv Category */}
                <div
                    onClick={() => handleDrillDown('no_investment_category')}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all lg:col-span-2 flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-amber-600">
                            <HelpCircle className="w-5 h-5 bg-amber-50 p-1 rounded" />
                            <span className="text-sm font-semibold text-slate-700">No Invs Category</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 mb-2">{data.noInvestmentCategory}</div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <StackedBarChart
                            height={12}
                            data={[{
                                name: 'Category',
                                items: [
                                    { key: 'noCat', value: data.noInvestmentCategory, color: '#f59e0b' },
                                    { key: 'rem', value: Math.max(0, data.created - data.noInvestmentCategory), color: '#fcd34d' }
                                ]
                            }]}
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>Initiatives</span>
                            <span className="flex items-center">{data.noInvestmentCategory} Missing <ChevronRight className="w-3 h-3 ml-0.5" /></span>
                        </div>
                    </div>
                </div>

                {/* Small Card: Wrong Status */}
                <div
                    onClick={() => handleDrillDown('wrong_status')}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-rose-300 hover:shadow-md transition-all lg:col-span-1 flex flex-col items-center justify-between text-center"
                >
                    <div className="w-full flex items-center justify-center gap-2 mb-1 text-rose-600">
                        <AlertTriangle className="w-4 h-4 bg-rose-50 p-0.5 rounded" />
                        <span className="text-xs font-semibold text-slate-700 leading-tight">Wrong Status</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{data.wrongStatus}</div>

                    <div className="w-full mt-2 -mb-2">
                        <SemiGaugeChart value={data.wrongStatus} total={data.created} color="#f43f5e" />
                    </div>
                    <div className="text-xs text-slate-500 mt-2 w-full text-center">Progress</div>
                </div>

            </div>
        </section>
    )
}
