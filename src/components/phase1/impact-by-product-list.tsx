'use client'

import { Incident } from '@/types/incidents'
import { useMemo } from 'react'

import { X } from 'lucide-react'

interface ImpactByProductListProps {
    data: Incident[]
    selectedProduct?: string
    onProductSelect?: (product: string) => void
}

export function ImpactByProductList({ data, selectedProduct = 'all', onProductSelect }: ImpactByProductListProps) {
    const productStats = useMemo(() => {
        const stats: Record<string, { total: number, impacts: Record<number, number> }> = {}
        for (const incident of data) {
            const prod = incident.product || 'Unknown'
            if (!stats[prod]) {
                stats[prod] = { total: 0, impacts: { 1: 0, 2: 0, 3: 0, 4: 0 } }
            }
            stats[prod].total += 1
            const imp = incident.impact || 4
            stats[prod].impacts[imp] = (stats[prod].impacts[imp] || 0) + 1
        }
        return Object.entries(stats)
            .map(([name, stat]) => ({ name, ...stat }))
            .sort((a, b) => b.total - a.total)
    }, [data])

    return (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full h-[400px] flex flex-col">
            <div className="flex items-center justify-between mb-6">
                <h3 className="text-sm font-semibold text-slate-900">Impact by Product</h3>
                {selectedProduct !== 'all' && onProductSelect && (
                    <button
                        onClick={() => onProductSelect('all')}
                        className="flex items-center gap-1 text-[11px] font-semibold text-slate-500 hover:text-slate-800 transition-colors bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded-md"
                    >
                        <X className="w-3 h-3" />
                        Clear filter
                    </button>
                )}
            </div>
            <div className="flex-1 overflow-y-auto pr-2 space-y-2">
                {productStats.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-8">No products found</div>
                ) : (
                    productStats.map((prod, idx) => {
                        const isSelected = selectedProduct === prod.name
                        const isClickable = !!onProductSelect
                        const bgClass = isSelected ? 'bg-blue-50 ring-1 ring-blue-200' : 'hover:bg-slate-50'

                        return (
                            <button
                                key={idx}
                                onClick={() => isClickable && onProductSelect(isSelected ? 'all' : prod.name)}
                                disabled={!isClickable}
                                className={`group relative w-full flex flex-col gap-1 p-2 rounded-lg transition-colors text-left focus:outline-none ${bgClass}`}
                            >
                                <div className="flex justify-between items-center text-sm w-full">
                                    <span className={`font-medium truncate pr-2 ${isSelected ? 'text-blue-700' : 'text-slate-700'}`}>
                                        {prod.name}
                                    </span>
                                    <span className={`font-bold ${isSelected ? 'text-blue-900' : 'text-slate-900'}`}>
                                        {prod.total}
                                    </span>
                                </div>
                                {/* Horizontal bar visualization */}
                                <div className="w-full h-2 rounded-full flex overflow-hidden bg-slate-100">
                                    {prod.impacts[1] > 0 && <div style={{ width: `${(prod.impacts[1] / prod.total) * 100}%` }} className="h-full bg-red-500" />}
                                    {prod.impacts[2] > 0 && <div style={{ width: `${(prod.impacts[2] / prod.total) * 100}%` }} className="h-full bg-yellow-500" />}
                                </div>

                                {/* Custom Tooltip Card */}
                                <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-1 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-200 z-50">
                                    <div className="bg-slate-800 text-white text-xs rounded-lg py-1.5 px-3 shadow-lg flex items-center gap-3 whitespace-nowrap">
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-red-400"></div>
                                            <span className="font-semibold">{prod.impacts[1]}</span>
                                            <span className="text-slate-300">Impact 1</span>
                                        </div>
                                        <div className="w-px h-3 bg-slate-600"></div>
                                        <div className="flex items-center gap-1.5">
                                            <div className="w-2 h-2 rounded-full bg-yellow-400"></div>
                                            <span className="font-semibold">{prod.impacts[2]}</span>
                                            <span className="text-slate-300">Impact 2</span>
                                        </div>
                                    </div>
                                    {/* Tooltip arrow */}
                                    <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-[4px] border-r-[4px] border-t-[4px] border-transparent border-t-slate-800"></div>
                                </div>
                            </button>
                        )
                    })
                )}
            </div>
        </div>
    )
}
