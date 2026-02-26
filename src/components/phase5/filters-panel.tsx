'use client'

import { Filter, ChevronDown } from 'lucide-react'

interface FilterOptions {
    workstreams: string[]
    products: string[]
    sprints: string[]
    releaseTypes: string[]
}

interface Filters {
    workstream: string
    product: string
    sprint: string
    releaseType: string
}

interface FiltersPanelProps {
    options: FilterOptions
    filters: Filters
    onFilterChange: (key: keyof Filters, value: string) => void
}

export function FiltersPanel({ options, filters, onFilterChange }: FiltersPanelProps) {
    const filterConfigs = [
        { key: 'workstream' as keyof Filters, label: 'Workstream', options: options.workstreams },
        { key: 'product' as keyof Filters, label: 'Product', options: options.products },
        { key: 'sprint' as keyof Filters, label: 'Sprint', options: options.sprints },
        { key: 'releaseType' as keyof Filters, label: 'Release Type', options: options.releaseTypes },
    ]

    return (
        <div className="flex items-center gap-2 flex-wrap">
            <div className="flex items-center gap-1.5 text-slate-500 mr-1">
                <Filter className="w-3.5 h-3.5" />
                <span className="text-xs font-medium">Filters</span>
            </div>
            {filterConfigs.map(cfg => (
                <div key={cfg.key} className="relative">
                    <select
                        value={filters[cfg.key]}
                        onChange={(e) => onFilterChange(cfg.key, e.target.value)}
                        className="appearance-none bg-white border border-slate-200 rounded-lg pl-3 pr-7 py-1.5
                                   text-xs font-medium text-slate-700 hover:border-slate-300
                                   focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-300
                                   transition-all duration-200 cursor-pointer"
                    >
                        {cfg.options.map(opt => (
                            <option key={opt} value={opt}>{opt === 'All' ? `All ${cfg.label}s` : opt}</option>
                        ))}
                    </select>
                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                </div>
            ))}
        </div>
    )
}
