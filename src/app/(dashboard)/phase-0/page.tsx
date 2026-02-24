'use client'

import { useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardHeader } from '@/components/phase0/dashboard-header'
import { KpiCards } from '@/components/phase0/kpi-cards'
import { TimelineChart } from '@/components/phase0/timeline-chart'
import { StatusDistribution } from '@/components/phase0/status-distribution'
import { CollaboratorsReport } from '@/components/phase0/collaborators-report'
import { Loader2 } from 'lucide-react'

interface KPIs {
    total: number
    inProgress: number
    discovery: number
    movedToWorkstream: number
    done: number
    avgRoi: number
}

interface DailyCount {
    count_date: string
    workstream: string
    ticket_count: number
}

interface StatusData {
    status: string
    count: number
    avgRoi: number | null
    avgDaysInStatus: number | null
}

interface Collaborator {
    name: string
    avatar: string | null
    ticketCount: number
    avgRoi: number | null
}

interface DashboardData {
    kpis: KPIs
    timeline: DailyCount[]
    statusDistribution: StatusData[]
    collaborators: Collaborator[]
    workstreams: string[]
    lastSync: string | null
}

const emptyKpis: KPIs = { total: 0, inProgress: 0, discovery: 0, movedToWorkstream: 0, done: 0, avgRoi: 0 }

export default function Phase0Page() {
    const searchParams = useSearchParams()
    const selectedWorkstream = searchParams?.get('workstream') || null

    const [data, setData] = useState<DashboardData | null>(null)
    const [loading, setLoading] = useState(true)
    const [refreshing, setRefreshing] = useState(false)
    const [error, setError] = useState<string | null>(null)

    const fetchData = useCallback(async () => {
        try {
            setError(null)
            const params = new URLSearchParams()
            if (selectedWorkstream) params.set('workstream', selectedWorkstream)

            const res = await fetch(`/api/phase0?${params}`)
            if (!res.ok) throw new Error('Failed to fetch dashboard data')
            const json = await res.json()
            setData(json)
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setLoading(false)
        }
    }, [selectedWorkstream])

    useEffect(() => {
        fetchData()
    }, [fetchData])

    const handleRefresh = async () => {
        setRefreshing(true)
        try {
            const syncRes = await fetch('/api/jira-sync', {
                method: 'POST',
                headers: { 'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SYNC_SECRET || 'bpi-sync-2026-secret'}` },
            })
            if (!syncRes.ok) {
                const body = await syncRes.json()
                throw new Error(body.error || 'Sync failed')
            }
            // Re-fetch dashboard data
            await fetchData()
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Sync error')
        } finally {
            setRefreshing(false)
        }
    }

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 animate-in fade-in duration-500">
                <Loader2 className="w-8 h-8 text-indigo-500 animate-spin" />
                <p className="text-sm text-slate-400">Loading dashboard data…</p>
            </div>
        )
    }

    if (error && !data) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[400px] gap-3 animate-in fade-in duration-500">
                <div className="bg-red-50 text-red-600 px-6 py-4 rounded-2xl text-sm max-w-md text-center">
                    <p className="font-semibold mb-1">Error loading dashboard</p>
                    <p className="text-red-500">{error}</p>
                </div>
            </div>
        )
    }

    const kpis = data?.kpis || emptyKpis
    const timeline = data?.timeline || []
    const statusDistribution = data?.statusDistribution || []
    const collaborators = data?.collaborators || []
    const lastSync = data?.lastSync || null

    return (
        <div className="flex flex-col w-full animate-in fade-in duration-500">
            {/* Header */}
            <DashboardHeader
                lastSync={lastSync}
                onRefresh={handleRefresh}
                isRefreshing={refreshing}
            />

            {/* Error banner */}
            {error && (
                <div className="bg-amber-50 border border-amber-200 text-amber-700 px-4 py-2.5 rounded-xl text-sm mb-6">
                    ⚠️ {error}
                </div>
            )}

            {/* KPI Cards */}
            <KpiCards kpis={kpis} />

            {/* Main Content: 2 columns */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column – 8 cols */}
                <div className="lg:col-span-8 flex flex-col gap-6">
                    <TimelineChart
                        data={timeline}
                        selectedWorkstream={selectedWorkstream}
                    />
                    <StatusDistribution data={statusDistribution} />
                </div>

                {/* Right Column – 4 cols */}
                <div className="lg:col-span-4">
                    <CollaboratorsReport data={collaborators} />
                </div>
            </div>
        </div>
    )
}
