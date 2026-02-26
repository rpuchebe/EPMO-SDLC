'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { DashboardHeader } from '@/components/phase2/dashboard-header'
import { InitiativesSection } from '@/components/phase2/initiatives-section'
import { ProjectsSection } from '@/components/phase2/projects-section'
import { BwisSection } from '@/components/phase2/bwis-section'
import { Loader2 } from 'lucide-react'

export default function Phase2Page() {
    const searchParams = useSearchParams()
    const workstream = searchParams.get('workstream') || 'All Workstreams'
    const team = searchParams.get('team') || 'All Teams'
    const period = searchParams.get('range') || '30'

    const [data, setData] = useState<any>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            setError(null)
            try {
                const query = new URLSearchParams()
                if (workstream) query.set('workstream', workstream)
                if (team) query.set('team', team)
                if (period) query.set('period', period)

                const res = await fetch(`/api/phase2?${query.toString()}`)
                if (!res.ok) throw new Error('Failed to fetch Phase 2 data')
                const json = await res.json()
                setData(json)
            } catch (err: any) {
                setError(err.message || 'An error occurred loading data.')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [workstream, team, period])

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                <p>Loading Phase 2 data...</p>
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
        <div className="max-w-7xl mx-auto space-y-6">
            <DashboardHeader lastSync={data.lastSync} />
            <InitiativesSection data={data.initiatives} />
            <ProjectsSection data={data.projects} />
            <BwisSection data={data.bwi} />
        </div>
    )
}
