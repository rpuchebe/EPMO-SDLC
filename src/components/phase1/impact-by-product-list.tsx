'use client'

import { Incident } from '@/types/incidents'
import { useMemo } from 'react'

interface ImpactByProductListProps {
    data: Incident[]
}

export function ImpactByProductList({ data }: ImpactByProductListProps) {
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
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 w-full h-full min-h-[400px] flex flex-col">
            <h3 className="text-sm font-semibold text-slate-900 mb-6">Impact by Product</h3>
            <div className="flex-1 overflow-y-auto pr-2 space-y-4">
                {productStats.length === 0 ? (
                    <div className="text-sm text-slate-500 text-center py-8">No products found</div>
                ) : (
                    productStats.map((prod, idx) => (
                        <div key={idx} className="flex flex-col gap-1">
                            <div className="flex justify-between items-center text-sm">
                                <span className="font-medium text-slate-700 truncate pr-2">{prod.name}</span>
                                <span className="font-bold text-slate-900">{prod.total}</span>
                            </div>
                            {/* Horizontal bar visualization */}
                            <div className="w-full h-2 rounded-full flex overflow-hidden bg-slate-100">
                                {prod.impacts[1] > 0 && <div style={{ width: `${(prod.impacts[1] / prod.total) * 100}%` }} className="h-full bg-red-500" title={`Impact 1: ${prod.impacts[1]}`} />}
                                {prod.impacts[2] > 0 && <div style={{ width: `${(prod.impacts[2] / prod.total) * 100}%` }} className="h-full bg-orange-500" title={`Impact 2: ${prod.impacts[2]}`} />}
                                {prod.impacts[3] > 0 && <div style={{ width: `${(prod.impacts[3] / prod.total) * 100}%` }} className="h-full bg-yellow-500" title={`Impact 3: ${prod.impacts[3]}`} />}
                                {prod.impacts[4] > 0 && <div style={{ width: `${(prod.impacts[4] / prod.total) * 100}%` }} className="h-full bg-blue-500" title={`Impact 4: ${prod.impacts[4]}`} />}
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}
