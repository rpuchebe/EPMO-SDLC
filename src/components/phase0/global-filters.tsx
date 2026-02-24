'use client'

import { ChevronDown, Calendar, X } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'

interface GlobalFiltersProps {
    workstreams: string[]
    selectedWorkstream: string | null
    onWorkstreamChange: (ws: string | null) => void
    dateFrom: string
    dateTo: string
    onDateFromChange: (d: string) => void
    onDateToChange: (d: string) => void
}

export function GlobalFilters({
    workstreams,
    selectedWorkstream,
    onWorkstreamChange,
    dateFrom,
    dateTo,
    onDateFromChange,
    onDateToChange,
}: GlobalFiltersProps) {
    const [wsOpen, setWsOpen] = useState(false)
    const wsRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        function handleClick(e: MouseEvent) {
            if (wsRef.current && !wsRef.current.contains(e.target as Node)) {
                setWsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClick)
        return () => document.removeEventListener('mousedown', handleClick)
    }, [])

    const hasFilters = selectedWorkstream || dateFrom || dateTo

    function clearAll() {
        onWorkstreamChange(null)
        onDateFromChange('')
        onDateToChange('')
    }

    return (
        <div className="flex flex-wrap items-center gap-3 mb-6">
            {/* Workstream dropdown */}
            <div className="relative" ref={wsRef}>
                <button
                    onClick={() => setWsOpen(!wsOpen)}
                    className={`inline-flex items-center gap-2 px-3.5 py-2 text-sm rounded-lg border
                               transition-all duration-200
                               ${selectedWorkstream
                            ? 'bg-indigo-50 border-indigo-200 text-indigo-700'
                            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300'}`}
                >
                    <span className="font-medium">
                        {selectedWorkstream || 'All Workstreams'}
                    </span>
                    <ChevronDown className={`w-3.5 h-3.5 transition-transform ${wsOpen ? 'rotate-180' : ''}`} />
                </button>

                {wsOpen && (
                    <div className="absolute top-full left-0 mt-1 min-w-[200px] bg-white border border-slate-200
                                    rounded-xl shadow-lg z-50 py-1 animate-in fade-in slide-in-from-top-1 duration-200">
                        <button
                            onClick={() => { onWorkstreamChange(null); setWsOpen(false) }}
                            className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors
                                        ${!selectedWorkstream ? 'text-indigo-600 font-medium' : 'text-slate-600'}`}
                        >
                            All Workstreams
                        </button>
                        {workstreams.map((ws) => (
                            <button
                                key={ws}
                                onClick={() => { onWorkstreamChange(ws); setWsOpen(false) }}
                                className={`w-full text-left px-4 py-2 text-sm hover:bg-slate-50 transition-colors
                                            ${selectedWorkstream === ws ? 'text-indigo-600 font-medium' : 'text-slate-600'}`}
                            >
                                {ws}
                            </button>
                        ))}
                        {workstreams.length === 0 && (
                            <p className="px-4 py-2 text-sm text-slate-400">No workstreams found</p>
                        )}
                    </div>
                )}
            </div>

            {/* Date range */}
            <div className="inline-flex items-center gap-2 px-3.5 py-2 text-sm bg-white border border-slate-200
                            rounded-lg hover:border-slate-300 transition-colors">
                <Calendar className="w-3.5 h-3.5 text-slate-400" />
                <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => onDateFromChange(e.target.value)}
                    className="text-sm text-slate-600 bg-transparent outline-none w-[120px]"
                    placeholder="From"
                />
                <span className="text-slate-300">—</span>
                <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => onDateToChange(e.target.value)}
                    className="text-sm text-slate-600 bg-transparent outline-none w-[120px]"
                    placeholder="To"
                />
            </div>

            {/* Clear filters */}
            {hasFilters && (
                <button
                    onClick={clearAll}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium
                               text-slate-500 hover:text-red-500 bg-slate-50 rounded-lg
                               transition-colors"
                >
                    <X className="w-3 h-3" />
                    Clear filters
                </button>
            )}
        </div>
    )
}
