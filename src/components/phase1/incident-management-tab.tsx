'use client'

import { useState, useEffect, useMemo, useCallback } from 'react'
import { Filter, Loader2, Info, Layers } from 'lucide-react'
import { IncidentDashboardData, Incident, WorkstreamIncidentTicket } from '@/types/incidents'

import { IncidentsTimelineChart } from './incidents-timeline-chart'
import { ImpactByProductList } from './impact-by-product-list'
import { FollowUpTable } from './follow-up-table'
import { FollowUpDistribution } from './follow-up-distribution'
import { WorkstreamIncidentTable } from './workstream-incident-table'
import { WorkstreamIncidentDistribution } from './workstream-incident-distribution'
import { IncidentKpiCards, IncidentKPI } from './incident-kpi-cards'

export function IncidentManagementTab() {
    const [data, setData] = useState<IncidentDashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchIncidents = async () => {
            try {
                setLoading(true)
                const res = await fetch('/api/incidents')
                if (!res.ok) throw new Error('Failed to fetch incident dashboard data')
                const json = await res.json()
                setData(json)
            } catch (err) {
                setError(err instanceof Error ? err.message : 'Unknown error')
            } finally {
                setLoading(false)
            }
        }
        fetchIncidents()
    }, [])

    // Filters
    const [activeKpiFilter, setActiveKpiFilter] = useState<'total' | 1 | 2>('total')
    const [selectedProduct, setSelectedProduct] = useState<string>('all')

    // Data filtered ONLY by product (used to calculate the KPI cards so they don't zero each other out)
    const kpiBaseData = useMemo(() => {
        if (!data) return null

        const passesProductFilter = (productField?: string | null) => {
            if (selectedProduct !== 'all' && productField !== undefined && productField !== selectedProduct) return false
            return true
        }

        return {
            incidents: data.incidents.filter(i => (i.impact === 1 || i.impact === 2) && passesProductFilter(i.product)),
            followups: data.followups, // Followups ignoring product filter for now
            workstreamTickets: data.workstreamTickets.filter(w => (w.impact === 1 || w.impact === 2) && passesProductFilter(w.project_key))
        }
    }, [data, selectedProduct])

    // Data filtered by both product AND the active KPI card (used by the rest of the dashboard)
    const dashboardFilteredData = useMemo(() => {
        if (!kpiBaseData) return null

        const passesKpiFilter = (impact: number | null) => {
            if (activeKpiFilter === 'total') return true
            return impact === activeKpiFilter
        }

        return {
            incidents: kpiBaseData.incidents.filter(i => passesKpiFilter(i.impact)),
            followups: kpiBaseData.followups,
            workstreamTickets: kpiBaseData.workstreamTickets.filter(w => passesKpiFilter(w.impact))
        }
    }, [kpiBaseData, activeKpiFilter])

    // Data for the Product List: Only filter by KPI so the list of products doesn't disappear when one is selected
    const productListData = useMemo(() => {
        if (!data) return []

        const passesKpiFilter = (impact: number | null) => {
            if (activeKpiFilter === 'total') return true
            return impact === activeKpiFilter
        }

        return data.incidents.filter(i => (i.impact === 1 || i.impact === 2) && passesKpiFilter(i.impact))
    }, [data, activeKpiFilter])


    const calculateKpiData = useCallback((
        incidents: Incident[],
        workstreamTickets: WorkstreamIncidentTicket[],
        typeFilter?: 1 | 2
    ): IncidentKPI => {
        const now = new Date()

        // 1. Filter tickets for this metric type
        const filteredIncidents = typeFilter
            ? incidents.filter(i => i.impact === typeFilter)
            : incidents

        const filteredWorkstream = typeFilter
            ? workstreamTickets.filter(w => w.impact === typeFilter)
            : workstreamTickets

        // 2. Compute completed count
        const completedCount = filteredWorkstream.filter(w => {
            const status = (w.status || '').toLowerCase()
            return status.includes('done') || status.includes('complete') || status.includes('closed')
        }).length

        // 3. Compute postmortem count
        const postmortemCount = filteredIncidents.reduce((sum, inc) => {
            return sum + (inc.postmortem_linked_count || 0)
        }, 0)

        // 4. WoW comparisons
        const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
        const twoWeeksAgo = new Date(now.getTime() - 14 * 24 * 60 * 60 * 1000)

        const recent = filteredIncidents.filter(i => new Date(i.created_at) >= oneWeekAgo).length
        const prior = filteredIncidents.filter(i => {
            const d = new Date(i.created_at)
            return d >= twoWeeksAgo && d < oneWeekAgo
        }).length

        const deltaAbsolute = recent - prior
        const deltaPercent = prior === 0 ? (recent > 0 ? Infinity : 0) : Math.round((deltaAbsolute / prior) * 100)

        // 5. Sparkline (last 8 weeks)
        const sparkline = Array(8).fill(0)
        filteredIncidents.forEach(i => {
            const date = new Date(i.created_at)
            const diffTime = Math.abs(now.getTime() - date.getTime())
            const diffWeeks = Math.floor(diffTime / (1000 * 60 * 60 * 24 * 7))
            if (diffWeeks >= 0 && diffWeeks < 8) {
                // index 7 is the oldest, 0 is the newest, but recharts left-to-right wants oldest on the left.
                const sparkIndex = 7 - diffWeeks
                sparkline[sparkIndex] += 1
            }
        })

        return {
            id: typeFilter ? `impact${typeFilter}` : 'total',
            label: typeFilter ? `Impact ${typeFilter}` : 'Total Incidents',
            value: filteredIncidents.length,
            deltaAbsolute,
            deltaPercent,
            sparkline,
            completedCount,
            postmortemCount,
            type: typeFilter ? `impact${typeFilter}` : 'total'
        }
    }, [])

    const kpis: IncidentKPI[] = useMemo(() => {
        if (!kpiBaseData) return []
        return [
            calculateKpiData(kpiBaseData.incidents, kpiBaseData.workstreamTickets),
            calculateKpiData(kpiBaseData.incidents, kpiBaseData.workstreamTickets, 1),
            calculateKpiData(kpiBaseData.incidents, kpiBaseData.workstreamTickets, 2)
        ]
    }, [kpiBaseData, calculateKpiData])

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

            {/* Top Section: Interactive KPIs */}
            <div className="flex flex-col items-center gap-4">
                <div className="w-full flex justify-center">
                    <IncidentKpiCards
                        kpis={kpis}
                        activeFilter={activeKpiFilter}
                        onFilterChange={setActiveKpiFilter}
                    />
                </div>
            </div>

            {/* Row 1 */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <IncidentsTimelineChart data={dashboardFilteredData?.incidents || []} />
                </div>
                <div className="lg:col-span-4">
                    <ImpactByProductList
                        data={productListData}
                        selectedProduct={selectedProduct}
                        onProductSelect={setSelectedProduct}
                    />
                </div>
            </div>

            {/* Follow-ups */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <FollowUpTable data={dashboardFilteredData?.followups || []} />
                </div>
                <div className="lg:col-span-4">
                    <FollowUpDistribution data={dashboardFilteredData?.followups || []} />
                </div>
            </div>

            {/* Workstream Incidents */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8">
                    <WorkstreamIncidentTable data={dashboardFilteredData?.workstreamTickets || []} />
                </div>
                <div className="lg:col-span-4">
                    <WorkstreamIncidentDistribution data={dashboardFilteredData?.workstreamTickets || []} />
                </div>
            </div>


        </div>
    )
}
