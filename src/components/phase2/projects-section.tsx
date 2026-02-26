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
        <section className="space-y-6 bg-[#8b5cf6]/10 p-6 rounded-3xl border border-[#8b5cf6]/20 mb-8">
            <div className="flex items-center gap-3">
                <Image src="/projects-icon.png" width={28} height={28} alt="Projects Icon" className="rounded-md" />
                <h2 className="text-xl font-bold text-slate-900 tracking-tight">Projects</h2>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-4 lg:grid-cols-7 gap-4">

                {/* Large Card: Projects Created */}
                <div
                    onClick={() => handleDrillDown('created')}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex flex-col justify-between cursor-pointer hover:border-indigo-300 hover:shadow-md transition-all md:col-span-2 lg:col-span-2"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-indigo-600">
                            <Activity className="w-5 h-5 bg-indigo-50 p-1 rounded" />
                            <span className="text-sm font-semibold text-slate-700">Projects Created</span>
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
                                <span className="text-sm font-semibold text-slate-700">Projects Completed</span>
                            </div>
                            <div className="text-3xl font-bold text-slate-900">{data.completed}</div>
                        </div>
                        <div className="mt-1">
                            <MiniDonutChart value={data.completed} total={data.created} color="#10b981" />
                        </div>
                    </div>
                    <div className="text-sm text-slate-500 mt-2">Projects Created</div>
                </div>

                {/* Small Card: No Child BWIs */}
                <div
                    onClick={() => handleDrillDown('no_children')}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-rose-300 hover:shadow-md transition-all lg:col-span-2 flex flex-col justify-between"
                >
                    <div>
                        <div className="flex items-center gap-2 mb-2 text-rose-600">
                            <FileX className="w-5 h-5 bg-rose-50 p-1 rounded" />
                            <span className="text-sm font-semibold text-slate-700">No Child BWIs</span>
                        </div>
                        <div className="text-3xl font-bold text-slate-900 mb-2">{data.noChildren}</div>
                    </div>

                    <div className="flex flex-col gap-1">
                        <StackedBarChart
                            height={12}
                            data={[{
                                name: 'Progress',
                                items: [
                                    { key: 'noKids', value: data.noChildren, color: '#f43f5e' },
                                    { key: 'rem', value: Math.max(0, data.created - data.noChildren), color: '#fecdd3' }
                                ]
                            }]}
                        />
                        <div className="flex justify-between text-xs text-slate-500 mt-1">
                            <span>Progress</span>
                            <span className="flex items-center text-rose-600 font-medium">{data.noChildren} In Progress <ChevronRight className="w-3 h-3 ml-0.5" /></span>
                        </div>
                    </div>
                </div>

                {/* Small Card: Orphaned / No Parent Init */}
                <div
                    onClick={() => handleDrillDown('no_parent')}
                    className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 cursor-pointer hover:border-amber-300 hover:shadow-md transition-all lg:col-span-1 flex flex-col items-center justify-between text-center"
                >
                    <div className="w-full flex justify-center items-center gap-2 mb-1 text-amber-600">
                        <Network className="w-4 h-4 bg-amber-50 p-0.5 rounded" />
                        <span className="text-[11px] font-semibold text-slate-700 leading-tight">Mssg Parent</span>
                    </div>
                    <div className="text-2xl font-bold text-slate-900">{data.noParent}</div>

                    <div className="w-full mt-2 -mb-2">
                        <SemiGaugeChart value={data.noParent} total={data.created} color="#f59e0b" trackColor="#fef3c7" />
                    </div>
                    <div className="text-xs text-slate-500 mt-2 w-full text-center">Progress</div>
                </div>

            </div>
        </section>
    )
}
