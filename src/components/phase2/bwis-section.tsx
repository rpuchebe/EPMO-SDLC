'use client'

import { Briefcase, AlertTriangle, ChevronRight, Activity } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
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
        if (segment) params.set('segment', segment)
        router.push(`/phase-2/bwi/detail?${params.toString()}`)
    }

    const warnings = (data.completedWithWarnings || 0) + (data.wrongStatus || 0)
    const open = Math.max(0, data.created - data.completed - data.inProgress)

    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            {/* Section header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                <div className="w-[3px] h-5 rounded-full bg-[#22c55e] flex-shrink-0" />
                <Image src="/bwi-icon.png" width={20} height={20} alt="BWI Icon" className="rounded-md" />
                <h2 className="text-sm font-semibold text-slate-800">Business Work Items (BWI)</h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">{data.created} total</span>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

                    {/* Card 1: Total BWI Created */}
                    <div
                        onClick={() => handleDrillDown('created')}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-3.5 flex flex-col justify-between cursor-pointer hover:border-slate-300 hover:shadow-md transition-all"
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[12px] font-medium text-slate-600">Total BWI Created</span>
                        </div>

                        <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight mb-3">
                            {data.created}
                        </div>

                        <div className="w-full h-px bg-slate-100 mb-2" />

                        <div className="flex gap-1.5 flex-wrap">
                            <span onClick={(e) => { e.stopPropagation(); handleDrillDown('bwi_new_feature') }}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-100 text-indigo-700 hover:bg-indigo-200 cursor-pointer">
                                Feature: {data.breakdown?.newFeature || 0}
                            </span>
                            <span onClick={(e) => { e.stopPropagation(); handleDrillDown('bwi_enhancement') }}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-sky-100 text-sky-700 hover:bg-sky-200 cursor-pointer">
                                Enhance: {data.breakdown?.enhancement || 0}
                            </span>
                            <span onClick={(e) => { e.stopPropagation(); handleDrillDown('bwi_issue') }}
                                className="px-1.5 py-0.5 rounded-md text-[10px] font-semibold bg-rose-100 text-rose-700 hover:bg-rose-200 cursor-pointer">
                                Issue: {data.breakdown?.issue || 0}
                            </span>
                        </div>
                    </div>

                    {/* Card 2: Distribution stacked bars */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-3.5 flex flex-col justify-between gap-4">

                        {/* Types */}
                        <div onClick={() => handleDrillDown('created')} className="cursor-pointer group flex-1">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-[22px] h-[22px] flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                    <Briefcase className="w-3.5 h-3.5 stroke-[2.5]" />
                                </div>
                                <span className="text-[12px] font-medium text-slate-600 group-hover:text-indigo-600 transition-colors">Types Distribution</span>
                            </div>
                            <StackedBarChart height={8} data={[{
                                name: 'Types',
                                items: [
                                    { key: 'feat', value: data.breakdown?.newFeature || 0, color: '#4f46e5' },
                                    { key: 'enh',  value: data.breakdown?.enhancement || 0, color: '#0ea5e9' },
                                    { key: 'iss',  value: data.breakdown?.issue || 0,       color: '#f43f5e' }
                                ]
                            }]} />
                            <div className="flex justify-between text-[10px] font-medium mt-1.5">
                                <span className="text-indigo-600">{data.breakdown?.newFeature || 0} Feature</span>
                                <span className="text-sky-600">{data.breakdown?.enhancement || 0} Enhance</span>
                                <span className="text-rose-600">{data.breakdown?.issue || 0} Issue</span>
                            </div>
                        </div>

                        <div className="w-full h-px bg-slate-100" />

                        {/* Status */}
                        <div onClick={() => handleDrillDown('in_progress')} className="cursor-pointer group flex-1">
                            <div className="flex items-center gap-1.5 mb-2">
                                <div className="w-[22px] h-[22px] flex items-center justify-center rounded-lg bg-sky-50 text-sky-600">
                                    <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
                                </div>
                                <span className="text-[12px] font-medium text-slate-600 group-hover:text-sky-600 transition-colors">Status Breakdown</span>
                            </div>
                            <StackedBarChart height={8} data={[{
                                name: 'Status',
                                items: [
                                    { key: 'done', value: data.completed,  color: '#10b981' },
                                    { key: 'prog', value: data.inProgress, color: '#38bdf8' },
                                    { key: 'open', value: open,            color: '#fcd34d' }
                                ]
                            }]} />
                            <div className="flex justify-between text-[10px] font-medium mt-1.5">
                                <span className="text-emerald-600">{data.completed} Done</span>
                                <span className="text-sky-600">{data.inProgress} In Progress</span>
                                <span className="text-amber-500">{open} Open</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 3: Governance Warnings */}
                    <div
                        onClick={() => handleDrillDown('wrong_status')}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-3.5 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                <AlertTriangle className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[12px] font-medium text-slate-600">Governance</span>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                            <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight">
                                {warnings}
                            </div>
                            <MiniDonutChart value={warnings} total={data.created} color="#f59e0b" trackColor="#fef3c7" />
                        </div>

                        <div className="w-full h-px bg-slate-100 mb-2" />

                        <div className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-[10.5px]">
                                <span className="text-slate-500">Warnings</span>
                                <span className="font-semibold text-amber-700 bg-amber-100 px-1.5 py-0.5 rounded-md text-[10px]">{warnings}</span>
                            </div>
                            <div className="flex justify-between items-center text-[10.5px]">
                                <span className="text-slate-500">Wrong Status</span>
                                <span className="font-semibold text-rose-700 bg-rose-100 px-1.5 py-0.5 rounded-md text-[10px]">{data.wrongStatus || 0}</span>
                            </div>
                        </div>
                    </div>

                    {/* Card 4: Missing Hierarchy */}
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-3.5 flex flex-col">
                        <div className="flex items-center gap-1.5 mb-3">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-lg bg-slate-100 text-slate-500">
                                <ChevronRight className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[12px] font-medium text-slate-600">Missing Hierarchy</span>
                        </div>

                        <div className="flex items-center justify-around flex-1">
                            {/* No Children */}
                            <div onClick={() => handleDrillDown('no_children')} className="flex flex-col items-center cursor-pointer group">
                                <MiniDonutChart value={data.noChildren} total={data.created} color="#f59e0b" trackColor="#fef3c7" />
                                <span className="text-[10px] font-medium text-slate-500 group-hover:text-amber-600 mt-2 flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-amber-500 inline-block" />
                                    No Children
                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                            </div>

                            <div className="w-px h-12 bg-slate-100" />

                            {/* No Parent */}
                            <div onClick={() => handleDrillDown('no_parent')} className="flex flex-col items-center cursor-pointer group">
                                <MiniDonutChart value={data.noParent} total={data.created} color="#f43f5e" trackColor="#ffe4e6" />
                                <span className="text-[10px] font-medium text-slate-500 group-hover:text-rose-600 mt-2 flex items-center gap-0.5">
                                    <span className="w-1.5 h-1.5 rounded-full bg-rose-500 inline-block" />
                                    No Parent
                                    <ChevronRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </span>
                            </div>
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}
