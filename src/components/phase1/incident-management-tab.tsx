'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Filter, Loader2, Info, Layers } from 'lucide-react'
import { IncidentDashboardData } from '@/types/incidents'

import { IncidentsTimelineChart } from './incidents-timeline-chart'
import { ImpactByProductList } from './impact-by-product-list'
import { FollowUpTable } from './follow-up-table'
import { FollowUpDistribution } from './follow-up-distribution'
import { WorkstreamIncidentTable } from './workstream-incident-table'
import { WorkstreamIncidentDistribution } from './workstream-incident-distribution'

export function IncidentManagementTab() {
    const [data, setData] = useState<IncidentDashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    // Filters
    const [selectedImpacts, setSelectedImpacts] = useState<Set<number>>(new Set([1, 2, 3, 4]))
    const [selectedProduct, setSelectedProduct] = useState<string>('all')

    const availableProducts = useMemo(() => {
        if (!data) return []
        const prods = new Set<string>()
        data.incidents.forEach(i => { if (i.product) prods.add(i.product) })
        data.workstreamTickets.forEach(w => { if (w.project_key) prods.add(w.project_key) })
        return Array.from(prods).sort()
    }, [data])

    const fetchData = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch('/api/incidents')
            if (!res.ok) throw new Error('Failed to fetch')
            const json = await res.json()
            setData(json)
        } catch (err: any) {
            setError(err.message)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchData()
    }, [fetchData])



    const toggleImpact = (imp: number) => {
        const newSet = new Set(selectedImpacts)
        if (newSet.has(imp)) newSet.delete(imp)
        else newSet.add(imp)
        setSelectedImpacts(newSet)
    }

    const filteredData = useMemo(() => {
        if (!data) return null

        const passesFilters = (impact: number | null, productField?: string | null) => {
            if (impact && !selectedImpacts.has(impact)) return false
            if (selectedProduct !== 'all' && productField !== undefined && productField !== selectedProduct) return false
            return true
        }

        return {
            incidents: data.incidents.filter(i => passesFilters(i.impact, i.product)),
            followups: data.followups, // followups use linked_tickets logic, harder to filter via simple string match, ignoring for now.
            workstreamTickets: data.workstreamTickets.filter(w => passesFilters(w.impact, w.project_key))
        }
    }, [data, selectedImpacts])


    if (loading && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm text-slate-400">Loading Incident Data…</p>
            </div>
        )
    }

    if (error && !data) {
        return (
            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl text-sm">
                Failed to load incidents: {error}
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-2 duration-300">

            {/* Global Controls */}
            <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
                <div className="flex flex-wrap items-center gap-6">
                    {/* Impact Filter */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                            <Filter className="w-4 h-4 text-slate-400" />
                            Impact
                        </div>
                        <div className="flex items-center gap-1.5 bg-slate-50 p-1 rounded-lg border border-slate-100">
                            {[1, 2, 3, 4].map((imp) => (
                                <button
                                    key={imp}
                                    onClick={() => toggleImpact(imp)}
                                    className={`w-8 h-7 rounded text-xs font-semibold tracking-tight transition-all duration-200 ${selectedImpacts.has(imp)
                                        ? imp === 1 ? 'bg-red-100 text-red-700'
                                            : imp === 2 ? 'bg-orange-100 text-orange-700'
                                                : imp === 3 ? 'bg-yellow-100 text-yellow-700'
                                                    : 'bg-blue-100 text-blue-700'
                                        : 'text-slate-400 hover:bg-slate-200/50'
                                        }`}
                                >
                                    {imp}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="w-px h-6 bg-slate-200 hidden sm:block"></div>

                    {/* Product Filter */}
                    <div className="flex items-center gap-3">
                        <div className="flex items-center gap-1.5 text-sm font-semibold text-slate-700">
                            <Layers className="w-4 h-4 text-slate-400" />
                            Product
                        </div>
                        <select
                            value={selectedProduct}
                            onChange={(e) => setSelectedProduct(e.target.value)}
                            className="bg-slate-50 border border-slate-200 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-1.5 min-w-[200px]"
                        >
                            <option value="all">All Products</option>
                            {availableProducts.map(prod => (
                                <option key={prod} value={prod}>{prod}</option>
                            ))}
                        </select>
                    </div>

                </div>

                <div className="flex items-center gap-4">
                    {data?.lastSync && (
                        <div className="text-xs text-slate-500">
                            Last sync: {new Date(data.lastSync).toLocaleString()}
                        </div>
                    )}
                </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <IncidentsTimelineChart data={filteredData?.incidents || []} />
                </div>
                <div className="lg:col-span-4">
                    <ImpactByProductList data={filteredData?.incidents || []} />
                </div>
            </div>

            {/* Follow-ups */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <FollowUpTable data={filteredData?.followups || []} />
                </div>
                <div className="lg:col-span-4">
                    <FollowUpDistribution data={filteredData?.followups || []} />
                </div>
            </div>

            {/* Workstream Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <WorkstreamIncidentTable data={filteredData?.workstreamTickets || []} />
                </div>
                <div className="lg:col-span-4">
                    <WorkstreamIncidentDistribution data={filteredData?.workstreamTickets || []} />
                </div>
            </div>


        </div>
    )
}
