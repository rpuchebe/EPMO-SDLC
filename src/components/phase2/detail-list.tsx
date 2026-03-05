'use client'

import { useState, useMemo } from 'react'
import { ArrowLeft, Search, Download, ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import Link from 'next/link'

export interface ColumnDef<T> {
    key: keyof T | string
    header: string
    render?: (item: T) => React.ReactNode
    sortable?: boolean
    sortAccessor?: (item: T) => string | number | boolean
}

interface DetailListProps<T> {
    title: string
    backUrl: string
    data: T[]
    columns: ColumnDef<T>[]
    searchFields: (keyof T)[]
}

export function DetailList<T>({ title, backUrl, data, columns, searchFields }: DetailListProps<T>) {
    const [search, setSearch] = useState('')
    const [sortKey, setSortKey] = useState<string | null>(null)
    const [sortDir, setSortDir] = useState<'asc' | 'desc'>('asc')

    // Filter
    const filteredData = useMemo(() => {
        if (!search) return data
        const lowerSearch = search.toLowerCase()
        return data.filter(item => {
            return searchFields.some(field => {
                const val = item[field]
                return String(val || '').toLowerCase().includes(lowerSearch)
            })
        })
    }, [data, search, searchFields])

    // Sort
    const sortedData = useMemo(() => {
        if (!sortKey) return filteredData
        return [...filteredData].sort((a: any, b: any) => {
            const col = columns.find(c => c.key === sortKey)
            const valA = col?.sortAccessor ? col.sortAccessor(a) : a[sortKey]
            const valB = col?.sortAccessor ? col.sortAccessor(b) : b[sortKey]

            if (valA === valB) return 0
            if (valA == null) return 1
            if (valB == null) return -1

            const cmp = valA < valB ? -1 : 1
            return sortDir === 'asc' ? cmp : -cmp
        })
    }, [filteredData, sortKey, sortDir, columns])

    const handleSort = (key: string) => {
        if (sortKey === key) {
            setSortDir(prev => prev === 'asc' ? 'desc' : 'asc')
        } else {
            setSortKey(key)
            setSortDir('asc')
        }
    }

    const handleCsvExport = () => {
        if (sortedData.length === 0) return

        const headers = columns.map(c => c.header).join(',')
        const rows = sortedData.map(item => {
            return columns.map(c => {
                let text = ''
                if (c.key === 'key' || c.key === 'summary' || c.key === 'status') {
                    text = String((item as any)[c.key] || '')
                } else if (c.sortAccessor) {
                    text = String(c.sortAccessor(item) || '')
                } else {
                    text = String((item as any)[c.key] || '')
                }
                text = text.replace(/"/g, '""') // escape quotes
                return `"${text}"`
            }).join(',')
        })

        const csvContent = [headers, ...rows].join('\n')
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.setAttribute('download', `${title.replace(/\s+/g, '_').toLowerCase()}_export.csv`)
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    return (
        <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden flex flex-col">
            <div className="px-6 py-5 border-b border-slate-200">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
                    <div>
                        <Link href={backUrl} className="inline-flex items-center gap-2 text-sm text-indigo-600 font-medium hover:text-indigo-800 transition-colors mb-2">
                            <ArrowLeft className="w-4 h-4" />
                            Back to Phase 2
                        </Link>
                        <h2 className="text-xl font-bold text-slate-900">{title}</h2>
                        <p className="text-sm text-slate-500 mt-1">{filteredData.length} records found</p>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto">
                        <div className="relative flex-1 sm:w-64">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                                <Search className="h-4 w-4 text-slate-400" />
                            </div>
                            <input
                                type="text"
                                placeholder="Search records..."
                                value={search}
                                onChange={e => setSearch(e.target.value)}
                                className="block w-full pl-10 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500 sm:text-sm text-slate-900 bg-white"
                            />
                        </div>
                        <button
                            onClick={handleCsvExport}
                            className="inline-flex items-center gap-2 px-4 py-2 bg-slate-50 border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-100 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 whitespace-nowrap"
                        >
                            <Download className="w-4 h-4" />
                            Export CSV
                        </button>
                    </div>
                </div>

                <div className="overflow-x-auto rounded-lg border border-slate-200">
                    <table className="w-full text-sm text-left whitespace-nowrap">
                        <thead className="bg-slate-50 text-slate-600 font-semibold border-b border-slate-200">
                            <tr>
                                {columns.map((col, idx) => (
                                    <th
                                        key={String(col.key) + idx}
                                        className={`px-5 py-3.5 ${col.sortable !== false ? 'cursor-pointer select-none hover:bg-slate-100' : ''}`}
                                        onClick={() => col.sortable !== false && handleSort(String(col.key))}
                                    >
                                        <div className="flex items-center gap-1">
                                            {col.header}
                                            {col.sortable !== false && (
                                                <span className="text-slate-400">
                                                    {sortKey === col.key ? (
                                                        sortDir === 'asc' ? <ArrowUp className="w-3 h-3 text-indigo-600" /> : <ArrowDown className="w-3 h-3 text-indigo-600" />
                                                    ) : (
                                                        <ArrowUpDown className="w-3 h-3 opacity-50" />
                                                    )}
                                                </span>
                                            )}
                                        </div>
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 text-slate-700 bg-white">
                            {sortedData.length === 0 ? (
                                <tr>
                                    <td colSpan={columns.length} className="px-5 py-8 text-center text-slate-500 italic">No records found matching your filters.</td>
                                </tr>
                            ) : sortedData.map((item, rowIdx) => (
                                <tr key={rowIdx} className="hover:bg-slate-50 transition-colors">
                                    {columns.map((col, colIdx) => (
                                        <td key={String(col.key) + colIdx} className="px-5 py-3">
                                            {col.render ? col.render(item) : String((item as any)[col.key] || '')}
                                        </td>
                                    ))}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    )
}
