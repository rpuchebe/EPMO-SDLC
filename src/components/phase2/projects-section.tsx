'use client'

import { Activity, CheckCircle, Network, FileX, ChevronRight } from 'lucide-react'
import { useRouter, useSearchParams } from 'next/navigation'
import Image from 'next/image'
import { MiniBarChart } from './charts/mini-bar-chart'
import { MiniDonutChart } from './charts/mini-donut-chart'
import { SemiGaugeChart } from './charts/semi-gauge-chart'
import { StackedBarChart } from './charts/stacked-bar-chart'

interface ProjectsSectionProps {
    data: any
}

export function ProjectsSection({ data }: ProjectsSectionProps) {
    const router = useRouter()
    const searchParams = useSearchParams()

    const handleDrillDown = (metric_id: string) => {
        const params = new URLSearchParams(searchParams.toString())
        params.set('metric_id', metric_id)
        router.push(`/phase-2/projects/detail?${params.toString()}`)
    }

    return (
        <section className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden mb-6">
            {/* Section header */}
            <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-100 bg-slate-50/40">
                <div className="w-[3px] h-5 rounded-full bg-[#8b5cf6] flex-shrink-0" />
                <Image src="/projects-icon.png" width={20} height={20} alt="Projects Icon" className="rounded-md" />
                <h2 className="text-sm font-semibold text-slate-800">Projects</h2>
                <span className="ml-auto text-xs text-slate-400 font-medium">{data.created} total</span>
            </div>

            <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">

                    {/* Card: Projects Created */}
                    <div
                        onClick={() => handleDrillDown('created')}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-3.5 flex flex-col justify-between cursor-pointer hover:border-slate-300 hover:shadow-md transition-all md:col-span-2 lg:col-span-2"
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-lg bg-indigo-50 text-indigo-600">
                                <Activity className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[12px] font-medium text-slate-600">Projects Created</span>
                        </div>

                        <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight mb-3">
                            {data.created}
                        </div>

                        <div className="w-full h-px bg-slate-100 mb-2" />

                        <div className="flex items-center justify-between">
                            <span className="text-[10.5px] text-slate-500">
                                <span className="font-semibold text-slate-700">{data.inProgress}</span> in progress
                            </span>
                            <div className="flex flex-col items-end gap-0.5">
                                <MiniBarChart data={data.createdTrend} color="#6366f1" />
                                <span className="text-[10px] text-slate-400 flex items-center">
                                    Last 7 days <ChevronRight className="w-3 h-3 ml-0.5" />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Card: Completed */}
                    <div
                        onClick={() => handleDrillDown('completed')}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-3.5 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all lg:col-span-2 flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-lg bg-emerald-50 text-emerald-600">
                                <CheckCircle className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[12px] font-medium text-slate-600">Projects Completed</span>
                        </div>

                        <div className="flex items-center justify-between mb-3">
                            <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight">
                                {data.completed}
                            </div>
                            <MiniDonutChart value={data.completed} total={data.created} color="#10b981" />
                        </div>

                        <div className="w-full h-px bg-slate-100 mb-2" />

                        <div className="flex items-center justify-between">
                            <span className="text-[10.5px] text-slate-500">of {data.created} created</span>
                            <span className="text-[10px] font-semibold text-emerald-600">
                                {data.created > 0 ? Math.round((data.completed / data.created) * 100) : 0}%
                            </span>
                        </div>
                    </div>

                    {/* Card: No Child BWIs */}
                    <div
                        onClick={() => handleDrillDown('no_children')}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-3.5 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all lg:col-span-2 flex flex-col justify-between"
                    >
                        <div className="flex items-center gap-1.5 mb-2">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-lg bg-rose-50 text-rose-600">
                                <FileX className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[12px] font-medium text-slate-600">No Child BWIs</span>
                        </div>

                        <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight mb-3">
                            {data.noChildren}
                        </div>

                        <div className="w-full h-px bg-slate-100 mb-2" />

                        <div className="flex flex-col gap-1">
                            <StackedBarChart
                                height={8}
                                data={[{
                                    name: 'Progress',
                                    items: [
                                        { key: 'noKids', value: data.noChildren, color: '#f43f5e' },
                                        { key: 'rem', value: Math.max(0, data.created - data.noChildren), color: '#fecdd3' }
                                    ]
                                }]}
                            />
                            <div className="flex justify-between text-[10px] text-slate-500 mt-0.5">
                                <span>Missing children</span>
                                <span className="text-rose-600 font-semibold flex items-center">
                                    {data.noChildren} <ChevronRight className="w-3 h-3 ml-0.5" />
                                </span>
                            </div>
                        </div>
                    </div>

                    {/* Card: Missing Parent */}
                    <div
                        onClick={() => handleDrillDown('no_parent')}
                        className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 pt-3.5 cursor-pointer hover:border-slate-300 hover:shadow-md transition-all lg:col-span-1 flex flex-col items-center justify-between text-center"
                    >
                        <div className="flex items-center gap-1.5 mb-1 w-full justify-center">
                            <div className="w-[22px] h-[22px] flex items-center justify-center rounded-lg bg-amber-50 text-amber-600">
                                <Network className="w-3.5 h-3.5 stroke-[2.5]" />
                            </div>
                            <span className="text-[11px] font-medium text-slate-600 leading-tight">No Parent</span>
                        </div>

                        <div className="text-[28px] leading-none font-bold text-slate-800 tracking-tight">
                            {data.noParent}
                        </div>

                        <div className="w-full -mb-2">
                            <SemiGaugeChart value={data.noParent} total={data.created} color="#f59e0b" trackColor="#fef3c7" />
                        </div>
                    </div>

                </div>
            </div>
        </section>
    )
}
