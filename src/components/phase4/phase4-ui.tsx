'use client'

import React from 'react'
import { Search, X, ChevronDown } from 'lucide-react'

export function Toggle({ value, onChange, label }: { value: boolean; onChange: (v: boolean) => void; label: string }) {
    return (
        <label className="flex items-center gap-1.5 cursor-pointer select-none shrink-0 border border-slate-100 px-2 py-1 rounded-lg hover:bg-slate-50 transition-colors">
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

export function SegmentedControl<T extends string>({
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

interface FilterRowProps {
    filters: any
    setFilter: (key: any, value: any) => void
    showTimeframe?: boolean
    showSprint?: boolean
    showMode?: boolean
    showHideClosed?: boolean
    showShowOutliers?: boolean
    showSearch?: boolean
}

export function FilterRow({
    filters,
    setFilter,
    showTimeframe = true,
    showSprint = true,
    showMode = true,
    showHideClosed = true,
    showShowOutliers = true,
    showSearch = true,
}: FilterRowProps) {
    return (
        <div className="flex items-center gap-3 flex-wrap mb-4 bg-slate-50/50 p-2 rounded-xl border border-slate-100">
            {showTimeframe && (
                <SegmentedControl
                    options={[
                        { label: 'Week', value: 'week' },
                        { label: 'Month', value: 'month' },
                        { label: 'Quarter', value: 'quarter' },
                    ]}
                    value={filters.timeframe}
                    onChange={v => setFilter('timeframe', v)}
                />
            )}

            {showSprint && (
                <div className="relative">
                    <select
                        value={filters.sprint}
                        onChange={e => setFilter('sprint', e.target.value)}
                        className="appearance-none pl-3 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 cursor-pointer"
                    >
                        <option value="current">Current Sprint</option>
                        <option value="last">Last Sprint</option>
                        <option value="all">All Sprints</option>
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
            )}

            {showMode && (
                <SegmentedControl
                    options={[
                        { label: 'Issues', value: 'issues' },
                        { label: 'Points', value: 'points' },
                    ]}
                    value={filters.mode}
                    onChange={v => setFilter('mode', v)}
                />
            )}

            <div className="flex items-center gap-3 ml-auto flex-wrap">
                {showHideClosed && <Toggle value={filters.hideClosed} onChange={v => setFilter('hideClosed', v)} label="Hide Closed" />}
                {showShowOutliers && <Toggle value={filters.showOutliers} onChange={v => setFilter('showOutliers', v)} label="Show Outliers" />}

                {showSearch && (
                    <div className="relative">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            placeholder="Key or summary…"
                            value={filters.search}
                            onChange={e => setFilter('search', e.target.value)}
                            className="pl-8 pr-7 py-1.5 text-xs border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-400 w-44 shadow-sm"
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
                )}
            </div>
        </div>
    )
}
