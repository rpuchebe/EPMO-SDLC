'use client'

import { useState, useEffect, useCallback } from 'react'
import { Loader2 } from 'lucide-react'
import { DashboardHeader } from '@/components/phase5/dashboard-header'
import { FiltersPanel } from '@/components/phase5/filters-panel'
import { ReleaseVolumeCards } from '@/components/phase5/release-volume-cards'
import { CycleTimeSection } from '@/components/phase5/cycle-time-section'
import { RiskIndicatorsSection } from '@/components/phase5/risk-indicators-section'
import { GovernanceScoreSection } from '@/components/phase5/governance-score-section'
import { IncidentStabilitySection } from '@/components/phase5/incident-stability-section'
import { AiInsightsSection } from '@/components/phase5/ai-insights-section'

interface Filters {
    workstream: string
    product: string
    sprint: string
    releaseType: string
}

export default function Phase5Page() {
    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [filters, setFilters] = useState<Filters>({
        workstream: 'All',
        product: 'All',
        sprint: 'All',
        releaseType: 'All',
    })

    const fetchData = useCallback(async (isRefresh = false) => {
        if (isRefresh) setRefreshing(true)
        else setLoading(true)
        setError(null)

        try {
            const query = new URLSearchParams()
            if (filters.workstream !== 'All') query.set('workstream', filters.workstream)
            if (filters.product !== 'All') query.set('product', filters.product)
            if (filters.sprint !== 'All') query.set('sprint', filters.sprint)
            if (filters.releaseType !== 'All') query.set('releaseType', filters.releaseType)

            const res = await fetch(`/api/phase5?${query.toString()}`)
            if (!res.ok) throw new Error('Failed to fetch Phase 5 data')
            const json = await res.json()
            setData(json)
        } catch (err: any) {
            setError(err.message || 'An error occurred loading data.')
        } finally {
            setLoading(false)
            setRefreshing(false)
        }
    }, [filters])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleFilterChange = (key: keyof Filters, value: string) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                <p>Loading Phase 5 data...</p>
            </div>
        )
    }

    if (error || !data) {
        return (
            <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 flex flex-col items-center justify-center min-h-[40vh]">
                <p className="font-medium text-lg mb-2">Error Loading Dashboard</p>
                <p className="text-sm">{error || 'Unknown error'}</p>
            </div>
        )
    }

    return (
        <div className="space-y-5 animate-in fade-in duration-500">
            {/* Section 1: Header */}
            <DashboardHeader
                lastSync={data.lastSync}
                onRefresh={() => fetchData(true)}
                isRefreshing={refreshing}
            />

            {/* Filters */}
            <div className="flex items-center justify-end">
                <FiltersPanel
                    options={data.filterOptions}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                />
            </div>

            {/* Section 2: Release Volume */}
            <div>
                <div className="flex items-center gap-2 mb-3">
                    <div className="w-1 h-5 bg-indigo-500 rounded-full" />
                    <h3 className="text-sm font-bold text-slate-800">Release Volume Metrics</h3>
                    <span className="text-[10px] text-slate-400 font-medium">Executive Overview</span>
                </div>
                <ReleaseVolumeCards data={data.releaseVolume} />
            </div>

            {/* Section 3: Cycle Time */}
            <CycleTimeSection data={data.cycleTime} />

            {/* Section 4: Risk Indicators */}
            <RiskIndicatorsSection data={data.riskIndicators} />

            {/* Section 5: Governance Score */}
            <GovernanceScoreSection data={data.governance} />

            {/* Section 6: Incident & Stability */}
            <IncidentStabilitySection data={data.incidents} />

            {/* Section 7: AI Insights */}
            <AiInsightsSection data={data.aiInsights} />
        </div>
    )
}
