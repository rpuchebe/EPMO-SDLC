'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import { Code, Search, X, ChevronDown } from 'lucide-react'
import { PhaseHeader } from '@/components/ui/phase-header'
import type { Phase4DTO, Phase4Issue } from '@/lib/server/phase4'

import { OverviewTab } from './tabs/overview-tab'
import { SprintHealthTab } from './tabs/sprint-health-tab'
import { FlowTab } from './tabs/flow-tab'
import { CapacityTab } from './tabs/capacity-tab'
import { QualityTab } from './tabs/quality-tab'
import { ActivityTab } from './tabs/activity-tab'
import { AISummaryTab } from './tabs/ai-summary-tab'

// ─── Types ────────────────────────────────────────────────────────────────────

export type Timeframe = 'week' | 'month' | 'quarter'
export type ViewMode = 'issues' | 'points'

export interface Phase4Filters {
    timeframe: Timeframe
    sprint: string
    mode: ViewMode
    hideClosed: boolean
    showOutliers: boolean
    search: string
}

export type { Phase4Issue, Phase4DTO }

// ─── Tab definitions ──────────────────────────────────────────────────────────

const TABS = [
    { id: 'overview', label: 'Overview' },
    { id: 'sprint', label: 'Sprint Health' },
    { id: 'flow', label: 'Flow & Cycle Time' },
    { id: 'capacity', label: 'Capacity' },
    { id: 'quality', label: 'Quality' },
    { id: 'activity', label: 'Activity' },
    { id: 'ai', label: '✦ AI Summary' },
] as const

type TabId = typeof TABS[number]['id']




function LoadingSkeleton() {
    return (
        <div className="animate-pulse space-y-4">
            <div className="grid grid-cols-4 gap-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div key={i} className="h-28 bg-slate-100 rounded-xl" />
                ))}
            </div>
            <div className="h-64 bg-slate-100 rounded-xl" />
            <div className="h-48 bg-slate-100 rounded-xl" />
        </div>
    )
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <div className="w-12 h-12 bg-rose-50 rounded-full flex items-center justify-center">
                <X className="w-6 h-6 text-rose-400" />
            </div>
            <p className="text-sm font-medium text-slate-700">Failed to load dashboard</p>
            <p className="text-xs text-slate-400 max-w-sm text-center">{message}</p>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function Phase4Content({ isAdmin }: { isAdmin: boolean }) {
    const searchParams = useSearchParams()
    const workstream = searchParams.get('workstream') || 'All Workstreams'
    const team = searchParams.get('team') || 'All Teams'

    const [dto, setDto] = useState<Phase4DTO | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [activeTab, setActiveTab] = useState<TabId>('overview')

    const [filters, setFilters] = useState<Phase4Filters>({
        timeframe: 'month',
        sprint: 'current',
        mode: 'issues',
        hideClosed: false,
        showOutliers: false,
        search: '',
    })

    // ── Fetch ──────────────────────────────────────────────────────────────────
    useEffect(() => {
        setLoading(true)
        setError(null)
        const qs = new URLSearchParams()
        if (workstream) qs.set('workstream', workstream)
        if (team) qs.set('team', team)

        fetch(`/api/phase4?${qs.toString()}`)
            .then(r => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json()
            })
            .then((data: Phase4DTO) => {
                setDto(data)
                setLoading(false)
            })
            .catch((e: Error) => {
                setError(e.message)
                setLoading(false)
            })
    }, [workstream, team])


    // ── Client-side filtering ──────────────────────────────────────────────────
    const filteredIssues = useMemo(() => {
        if (!dto) return []
        let result = dto.issues

        if (filters.hideClosed) {
            result = result.filter(i => i.statusCategory !== 'Done')
        }
        const term = filters.search.trim().toLowerCase()
        if (term) {
            result = result.filter(i =>
                i.key.toLowerCase().includes(term) ||
                i.summary.toLowerCase().includes(term),
            )
        }
        return result
    }, [dto, filters])

    const setFilter = useCallback(<K extends keyof Phase4Filters>(key: K, value: Phase4Filters[K]) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }, [])


    // ── Render ─────────────────────────────────────────────────────────────────
    return (
        <div className="flex flex-col gap-3 w-full animate-in fade-in duration-500">
            {/* Header */}
            <PhaseHeader
                icon={Code}
                title="Phase 4 – Development & Testing"
                description="Monitor sprint delivery, throughput, cycle time, capacity allocation, and code quality across all workstreams."
                lastSync={dto?.lastUpdated ?? null}
                workstream={workstream}
            />

            {/* ── Tab Bar ───────────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="flex border-b border-slate-200 px-4 overflow-x-auto">
                    {TABS.map(tab => (
                        <button
                            key={tab.id}
                            onClick={() => setActiveTab(tab.id)}
                            className={`px-4 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-all -mb-px ${activeTab === tab.id
                                ? 'border-indigo-500 text-indigo-600'
                                : 'border-transparent text-slate-500 hover:text-slate-700 hover:border-slate-300'
                                }`}
                        >
                            {tab.label}
                        </button>
                    ))}
                </div>

                {/* ── Tab Content ───────────────────────────────────────────── */}
                <div className="p-4">
                    {loading && !dto ? (
                        <LoadingSkeleton />
                    ) : error ? (
                        <ErrorState message={error} />
                    ) : dto ? (
                        <>
                            {activeTab === 'overview' && (
                                <OverviewTab dto={dto} filters={filters} setFilter={setFilter} filteredIssues={filteredIssues} isAdmin={isAdmin} />
                            )}
                            {activeTab === 'sprint' && (
                                <SprintHealthTab dto={dto} filters={filters} setFilter={setFilter} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'flow' && (
                                <FlowTab dto={dto} filters={filters} setFilter={setFilter} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'capacity' && (
                                <CapacityTab dto={dto} filters={filters} setFilter={setFilter} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'quality' && (
                                <QualityTab dto={dto} filters={filters} setFilter={setFilter} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'activity' && (
                                <ActivityTab dto={dto} filters={filters} setFilter={setFilter} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'ai' && (
                                <AISummaryTab dto={dto} filters={filters} setFilter={setFilter} filteredIssues={filteredIssues} />
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
