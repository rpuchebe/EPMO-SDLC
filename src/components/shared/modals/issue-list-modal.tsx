'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ExternalLink, Filter, Download, X } from 'lucide-react'
import * as XLSX from 'xlsx'

export interface ColumnDef<T> {
    header: string
    accessorKey?: keyof T
    cell?: (item: T) => React.ReactNode
}

interface IssueListModalProps<T> {
    open: boolean
    onOpenChange: (open: boolean) => void
    title: string
    data: T[]
    columns: ColumnDef<T>[]
    statusKey?: keyof T
    workstreamKey?: keyof T
}

export function IssueListModal<T extends Record<string, any>>({ open, onOpenChange, title, data, columns, statusKey = 'status' as keyof T, workstreamKey = 'workstream' as keyof T }: IssueListModalProps<T>) {
    const [statusFilter, setStatusFilter] = useState<string>('all')
    const [workstreamFilter, setWorkstreamFilter] = useState<string>('all')

    // Reset internal filters every time the modal opens so stale selections
    // from a previous drill-down never bleed into a new one.
    useEffect(() => {
        if (open) {
            setStatusFilter('all')
            setWorkstreamFilter('all')
        }
    }, [open])

    // Extract unique values for filters
    const statuses = Array.from(new Set(data.map(item => item[statusKey]))).filter(Boolean)
    const workstreams = Array.from(new Set(data.map(item => item[workstreamKey]))).filter(Boolean)

    const filteredData = data.filter(item => {
        if (statusFilter !== 'all' && String(item[statusKey]) !== statusFilter) return false
        if (workstreamFilter !== 'all' && String(item[workstreamKey]) !== workstreamFilter) return false
        return true
    })

    const handleExport = () => {
        const exportData = filteredData.map(item => {
            const row: any = {}
            columns.forEach(col => {
                if (col.accessorKey) {
                    row[col.header] = item[col.accessorKey]
                } else if (col.header === 'Key') {
                    row['Key'] = item.key || item.jira_key || item.jira_issue_id
                } else {
                    row[col.header] = '(See Dashboard)'
                }
            })
            return row
        })

        const wb = XLSX.utils.book_new()
        const ws = XLSX.utils.json_to_sheet(exportData)
        XLSX.utils.book_append_sheet(wb, ws, 'Iniciativas')
        XLSX.writeFile(wb, `${title.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`)
    }

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-7xl max-h-[90vh] flex flex-col p-0 overflow-hidden border-none shadow-2xl rounded-2xl [&>button]:hidden">
                <div
                    className="px-6 py-4 flex items-center justify-between gap-6"
                    style={{ background: 'linear-gradient(135deg, #0a2622 0%, #0f3530 30%, #143d37 60%, #1a4a42 100%)' }}
                >
                    {/* Left: Title & Count */}
                    <div className="flex items-center gap-3 shrink-0">
                        <h2 className="text-lg font-bold text-white whitespace-nowrap">
                            {title}
                        </h2>
                        <span className="bg-white/10 text-[#8dd4b0] text-xs py-0.5 px-2 rounded-full font-bold border border-white/10 backdrop-blur-md">
                            {filteredData.length}
                        </span>
                    </div>

                    {/* Middle: Filters (Consolidated on one line) */}
                    <div className="flex flex-1 items-center justify-center gap-3 overflow-x-auto no-scrollbar">
                        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 backdrop-blur-sm">
                            <Filter className="w-3.5 h-3.5 text-[#8bb8a3]" />

                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-bold text-[#6b9e8a] uppercase tracking-wider">Status</label>
                                <select
                                    value={statusFilter}
                                    onChange={(e) => setStatusFilter(e.target.value)}
                                    className="bg-transparent text-[#8dd4b0] text-xs font-bold outline-none cursor-pointer focus:text-white transition-colors min-w-[100px]"
                                >
                                    <option value="all" className="bg-[#143d37]">All</option>
                                    {statuses.map(s => (
                                        <option key={String(s)} value={String(s)} className="bg-[#143d37]">{String(s)}</option>
                                    ))}
                                </select>
                            </div>

                            <div className="h-3 w-px bg-white/10" />

                            <div className="flex items-center gap-1.5">
                                <label className="text-[10px] font-bold text-[#6b9e8a] uppercase tracking-wider">WS</label>
                                <select
                                    value={workstreamFilter}
                                    onChange={(e) => setWorkstreamFilter(e.target.value)}
                                    className="bg-transparent text-[#8dd4b0] text-xs font-bold outline-none cursor-pointer focus:text-white transition-colors min-w-[120px]"
                                >
                                    <option value="all" className="bg-[#143d37]">All Workstreams</option>
                                    {workstreams.map(w => (
                                        <option key={String(w)} value={String(w)} className="bg-[#143d37]">{String(w)}</option>
                                    ))}
                                </select>
                            </div>

                            {(statusFilter !== 'all' || workstreamFilter !== 'all') && (
                                <button
                                    onClick={() => { setStatusFilter('all'); setWorkstreamFilter('all'); }}
                                    className="p-1 hover:bg-white/10 rounded-full text-rose-400 transition-colors ml-1"
                                    title="Clear filters"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            )}
                        </div>
                    </div>

                    {/* Right: Export & Close */}
                    <div className="flex items-center gap-3 shrink-0">
                        <button
                            onClick={handleExport}
                            className="flex items-center gap-2 bg-[#5ec492] hover:bg-[#4eb381] text-[#0a2622] px-4 py-2 rounded-xl text-sm font-bold transition-all shadow-lg active:scale-95"
                        >
                            <Download className="w-4 h-4" />
                            Export
                        </button>

                        <div className="w-px h-6 bg-white/10 mx-1" />

                        <button
                            onClick={() => onOpenChange(false)}
                            className="p-2 hover:bg-white/10 rounded-full text-white/70 hover:text-white transition-all group"
                            title="Close modal"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                </div>

                <div className="flex-1 overflow-auto px-6 py-4 bg-slate-50/50">
                    <div className="rounded-xl border border-slate-200 bg-white shadow-sm overflow-hidden">
                        <table className="w-full text-sm text-left text-slate-600 border-collapse">
                            <thead className="text-xs text-slate-500 bg-slate-50/80 uppercase sticky top-0 z-10 backdrop-blur-md">
                                <tr className="border-b border-slate-200">
                                    {columns.map((col, i) => (
                                        <th key={i} className="px-5 py-4 font-bold tracking-wider">
                                            {col.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-100">
                                {!filteredData || filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length} className="px-5 py-24 text-center">
                                            <div className="flex flex-col items-center gap-3">
                                                <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center border border-slate-100 mb-2">
                                                    <Filter className="w-8 h-8 text-slate-300" />
                                                </div>
                                                <h3 className="text-slate-600 font-bold">No items found</h3>
                                                <p className="text-slate-400 text-xs max-w-[240px] mx-auto">
                                                    No records match your current filters or the selection is empty ({data?.length || 0} total items).
                                                </p>
                                                {(statusFilter !== 'all' || workstreamFilter !== 'all') && (
                                                    <button
                                                        onClick={() => { setStatusFilter('all'); setWorkstreamFilter('all'); }}
                                                        className="mt-2 text-indigo-600 hover:text-indigo-800 text-xs font-bold px-4 py-2 bg-indigo-50 rounded-lg transition-colors"
                                                    >
                                                        Clear all filters
                                                    </button>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, i) => (
                                        <tr key={i} className="hover:bg-indigo-50/30 transition-colors">
                                            {columns.map((col, j) => (
                                                <td key={j} className="px-5 py-4 align-middle">
                                                    {col.cell ? col.cell(item) : (col.accessorKey ? String(item[col.accessorKey] || '-') : '-')}
                                                </td>
                                            ))}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>
            </DialogContent>
        </Dialog>
    )
}
