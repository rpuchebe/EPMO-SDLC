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
    issueTypes: string[]   // empty = all
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

// ─── UI helpers ───────────────────────────────────────────────────────────────

function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0">
            <div
                role="switch"
                aria-checked={value}
                onClick={() => onChange(!value)}
                className={`relative w-7 h-4 rounded-full transition-colors ${value ? 'bg-indigo-500' : 'bg-slate-200'}`}
            >
                <span className={`absolute w-3 h-3 bg-white rounded-full shadow top-0.5 transition-transform ${value ? 'translate-x-3.5' : 'translate-x-0.5'}`} />
            </div>
            <span className="text-xs text-slate-600 whitespace-nowrap">{label}</span>
        </label>
    )
}

function SegmentedControl<T extends string>({
    options, value, onChange,
}: { options: { label: string; value: T }[]; value: T; onChange: (v: T) => void }) {
    return (
        <div className="flex items-center gap-0.5 bg-slate-100 rounded-lg p-0.5">
            {options.map(o => (
                <button
                    key={o.value}
                    onClick={() => onChange(o.value)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-all ${value === o.value
                        ? 'bg-white text-slate-800 shadow-sm'
                        : 'text-slate-500 hover:text-slate-700'
                        }`}
                >
                    {o.label}
                </button>
            ))}
        </div>
    )
}

function IssueTypePill({
    label, selected, onClick,
}: { label: string; selected: boolean; onClick: () => void }) {
    return (
        <button
            onClick={onClick}
            className={`px-2 py-0.5 text-[11px] font-medium rounded-full border transition-all whitespace-nowrap ${selected
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'
                }`}
        >
            {label}
        </button>
    )
}

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
        issueTypes: [],
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

    // ── Derived issue types list (for filter pills) ────────────────────────────
    const allIssueTypes = useMemo(() => {
        if (!dto) return []
        return dto.byType.map(t => t.label)
    }, [dto])

    // ── Client-side filtering ──────────────────────────────────────────────────
    const filteredIssues = useMemo(() => {
        if (!dto) return []
        let result = dto.issues

        if (filters.issueTypes.length > 0) {
            result = result.filter(i => filters.issueTypes.includes(i.issueType))
        }
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

    const toggleIssueType = useCallback((type: string) => {
        setFilters(prev => ({
            ...prev,
            issueTypes: prev.issueTypes.includes(type)
                ? prev.issueTypes.filter(t => t !== type)
                : [...prev.issueTypes, type],
        }))
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

            {/* ── Filter Row ────────────────────────────────────────────────── */}
            <div className="bg-white rounded-xl border border-slate-200 px-4 py-2.5 flex items-center gap-3 flex-wrap shadow-sm">
                {/* Timeframe */}
                <SegmentedControl
                    options={[
                        { label: 'Week', value: 'week' },
                        { label: 'Month', value: 'month' },
                        { label: 'Quarter', value: 'quarter' },
                    ]}
                    value={filters.timeframe}
                    onChange={v => setFilter('timeframe', v)}
                />

                {/* Sprint selector */}
                <div className="relative">
                    <select
                        value={filters.sprint}
                        onChange={e => setFilter('sprint', e.target.value)}
                        className="appearance-none pl-3 pr-7 py-1 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
                    >
                        <option value="current">Current Sprint</option>
                        <option value="last">Last Sprint</option>
                        <option value="all">All Sprints</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>

                {/* Points | Issues */}
                <SegmentedControl
                    options={[
                        { label: 'Issues', value: 'issues' },
                        { label: 'Points', value: 'points' },
                    ]}
                    value={filters.mode}
                    onChange={v => setFilter('mode', v as ViewMode)}
                />

                {/* Issue type pills */}
                {allIssueTypes.length > 0 && (
                    <div className="flex items-center gap-1 flex-wrap">
                        {allIssueTypes.slice(0, 6).map(t => (
                            <IssueTypePill
                                key={t}
                                label={t}
                                selected={filters.issueTypes.includes(t)}
                                onClick={() => toggleIssueType(t)}
                            />
                        ))}
                        {filters.issueTypes.length > 0 && (
                            <button
                                onClick={() => setFilter('issueTypes', [])}
                                className="text-[11px] text-slate-400 hover:text-slate-600 px-1"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                )}

                <div className="flex items-center gap-3 ml-auto flex-wrap">
                    <Toggle value={filters.hideClosed} onChange={v => setFilter('hideClosed', v)} label="Hide Closed" />
                    <Toggle value={filters.showOutliers} onChange={v => setFilter('showOutliers', v)} label="Show Outliers" />

                    {/* Search */}
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Key or summary…"
                            value={filters.search}
                            onChange={e => setFilter('search', e.target.value)}
                            className="pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 w-44"
                        />
                        {filters.search && (
                            <button
                                onClick={() => setFilter('search', '')}
                                className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        )}
                    </div>
                </div>
            </div>

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
                    {loading ? (
                        <LoadingSkeleton />
                    ) : error ? (
                        <ErrorState message={error} />
                    ) : dto ? (
                        <>
                            {activeTab === 'overview' && (
                                <OverviewTab dto={dto} filters={filters} filteredIssues={filteredIssues} isAdmin={isAdmin} />
                            )}
                            {activeTab === 'sprint' && (
                                <SprintHealthTab dto={dto} filters={filters} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'flow' && (
                                <FlowTab dto={dto} filters={filters} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'capacity' && (
                                <CapacityTab dto={dto} filters={filters} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'quality' && (
                                <QualityTab dto={dto} filters={filters} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'activity' && (
                                <ActivityTab dto={dto} filters={filters} filteredIssues={filteredIssues} />
                            )}
                            {activeTab === 'ai' && (
                                <AISummaryTab dto={dto} filters={filters} filteredIssues={filteredIssues} />
                            )}
                        </>
                    ) : null}
                </div>
            </div>
        </div>
    )
}
