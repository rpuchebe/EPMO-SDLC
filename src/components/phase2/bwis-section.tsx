'use client'

import { Briefcase, AlertTriangle, ChevronRight, Activity } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import { MiniDonutChart } from './charts/mini-donut-chart'
import { StackedBarChart } from './charts/stacked-bar-chart'

interface BwisSectionProps {
    data: any
}

export function BwisSection({ data }: BwisSectionProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleDrillDown = (metric_id: string, segment?: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('metric_id', metric_id)
        if (segment) {
            params.set('segment', segment)
        }
        router.push(`/phase-2/bwi/detail?${params.toString()}`)
    }

    return (
        <section className="mb-8">
            <h2 className="text-lg font-semibold text-slate-900 mb-4">Business Work Items (BWI)</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                {/* Card 1: Total BWI Created & Tags */}
                <div
                    onClick={() => handleDrillDown('created')}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-center cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all"
                >
                    <div className="flex items-baseline gap-2 mb-4">
                        <span className="text-5xl font-bold text-slate-900">{data.created}</span>
                        <span className="text-sm font-semibold text-slate-500">total</span>
                    </div>
                    <div className="text-sm font-semibold text-slate-700 mb-2">Total BWI Created</div>
                    <div className="flex gap-1.5 flex-wrap">
                        <span
                            onClick={(e) => { e.stopPropagation(); handleDrillDown('bwi_new_feature') }}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer"
                        >
                            Feature: {data.breakdown?.newFeature || 0}
                        </span>
                        <span
                            onClick={(e) => { e.stopPropagation(); handleDrillDown('bwi_enhancement') }}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold bg-sky-100 text-sky-700 hover:bg-sky-200 cursor-pointer"
                        >
                            Enhance: {data.breakdown?.enhancement || 0}
                        </span>
                        <span
                            onClick={(e) => { e.stopPropagation(); handleDrillDown('bwi_issue') }}
                            className="px-2 py-1 rounded-md text-[10px] font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 cursor-pointer"
                        >
                            Issue: {data.breakdown?.issue || 0}
                        </span>
                    </div>
                </div>

                {/* Card 2: BWIs In Progress (Stacked Bars) */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col justify-center gap-6">
                    {/* BWI Types Stack */}
                    <div onClick={() => handleDrillDown('created')} className="cursor-pointer group">
                        <div className="flex items-center gap-2 mb-2">
                            <Briefcase className="w-4 h-4 text-indigo-500 bg-indigo-50 rounded" />
                            <span className="text-sm font-semibold text-slate-700 group-hover:text-indigo-600 transition-colors">BWI Types Distribution</span>
                        </div>
                        <StackedBarChart
                            height={12}
                            data={[{
                                name: 'Types',
                                items: [
                                    { key: 'feat', value: data.breakdown?.newFeature || 0, color: '#4f46e5' },
                                    { key: 'enh', value: data.breakdown?.enhancement || 0, color: '#0ea5e9' },
                                    { key: 'iss', value: data.breakdown?.issue || 0, color: '#f43f5e' }
                                ]
                            }]}
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 px-1 font-medium">
                            <span className="text-indigo-600">{data.breakdown?.newFeature || 0} Feature</span>
                            <span className="text-sky-600">{data.breakdown?.enhancement || 0} Enhance</span>
                            <span className="text-rose-600">{data.breakdown?.issue || 0} Issue</span>
                        </div>
                    </div>

                    {/* BWI Status Stack */}
                    <div onClick={() => handleDrillDown('in_progress')} className="cursor-pointer group">
                        <div className="flex items-center gap-2 mb-2">
                            <Activity className="w-4 h-4 text-sky-500 bg-sky-50 rounded" />
                            <span className="text-sm font-semibold text-slate-700 group-hover:text-sky-600 transition-colors">BWIs Status</span>
                        </div>
                        <StackedBarChart
                            height={12}
                            data={[{
                                name: 'Status',
                                items: [
                                    { key: 'done', value: data.completed, color: '#10b981' },
                                    { key: 'prog', value: data.inProgress, color: '#38bdf8' },
                                    { key: 'open', value: Math.max(0, data.created - data.completed - data.inProgress), color: '#fcd34d' }
                                ]
                            }]}
                        />
                        <div className="flex justify-between text-[10px] text-slate-500 mt-1.5 px-1 font-medium">
                            <span className="text-emerald-600">{data.completed} Done</span>
                            <span className="text-sky-600">{data.inProgress} In Progress</span>
                            <span className="text-amber-500">{Math.max(0, data.created - data.completed - data.inProgress)} Open</span>
                        </div>
                    </div>
                </div>

                {/* Card 3: Governance Warnings Donut */}
                <div
                    onClick={() => handleDrillDown('wrong_status')}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all flex flex-col justify-center relative"
                >
                    <div className="flex items-center gap-2 mb-4 text-amber-600 absolute top-4 left-4 z-10">
                        <AlertTriangle className="w-5 h-5 bg-amber-50 p-1 rounded" />
                        <span className="text-sm font-semibold text-slate-700">Governance</span>
                    </div>

                    <div className="flex items-center justify-between mt-6">
                        <div className="flex flex-col gap-2">
                            <div className="text-xs font-semibold px-2 py-1 bg-amber-100 text-amber-800 rounded-md">
                                Warnings: {data.completedWithWarnings + data.wrongStatus}
                            </div>
                            <div className="text-xs font-semibold px-2 py-1 bg-red-100 text-red-800 rounded-md">
                                Wrong Status: {data.wrongStatus}
                            </div>
                        </div>
                        <div className="w-20 overflow-visible mt-2">
                            <MiniDonutChart value={data.completedWithWarnings + data.wrongStatus} total={data.created} color="#f59e0b" trackColor="#fef3c7" />
                        </div>
                    </div>
                </div>

                {/* Card 4: Missing Children/Parent */}
                <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-5 flex flex-col">
                    <h3 className="text-sm font-semibold text-slate-700 mb-4">BWIs Missing Hierarchy elements</h3>

                    <div className="flex items-center justify-around flex-1 mt-2">
                        {/* No Children */}
                        <div
                            onClick={() => handleDrillDown('no_children')}
                            className="flex flex-col items-center cursor-pointer group"
                        >
                            <div className="relative mb-2">
                                <MiniDonutChart value={data.noChildren} total={data.created} color="#f59e0b" trackColor="#fef3c7" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 group-hover:text-amber-600 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-amber-500 mr-1.5"></span>
                                No Child Tasks <ChevronRight className="w-3 h-3 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                        </div>

                        {/* No Parent */}
                        <div
                            onClick={() => handleDrillDown('no_parent')}
                            className="flex flex-col items-center cursor-pointer group"
                        >
                            <div className="relative mb-2">
                                <MiniDonutChart value={data.noParent} total={data.created} color="#f43f5e" trackColor="#ffe4e6" />
                            </div>
                            <span className="text-xs font-semibold text-slate-500 group-hover:text-rose-600 flex items-center">
                                <span className="w-1.5 h-1.5 rounded-full bg-rose-500 mr-1.5"></span>
                                No Parent Proj <ChevronRight className="w-3 h-3 ml-0.5 opacity-0 group-hover:opacity-100 transition-opacity" />
                            </span>
                        </div>
                    </div>
                </div>

            </div>
        </section>
    )
}
