'use client'

import { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { format } from 'date-fns'
import { ExternalLink } from 'lucide-react'

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
}

export function IssueListModal<T>({ open, onOpenChange, title, data, columns }: IssueListModalProps<T>) {
    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="max-w-5xl max-h-[85vh] flex flex-col p-6">
                <DialogHeader className="mb-4">
                    <DialogTitle className="text-xl font-semibold text-slate-800 flex items-center gap-2">
                        {title}
                        <span className="bg-slate-100 text-slate-600 text-sm py-0.5 px-2.5 rounded-full font-medium">
                            {data.length}
                        </span>
                    </DialogTitle>
                </DialogHeader>

                <div className="flex-1 overflow-auto -mx-6 px-6">
                    <div className="rounded-md border border-slate-200">
                        <table className="w-full text-sm text-left text-slate-600">
                            <thead className="text-xs text-slate-500 bg-slate-50 uppercase sticky top-0 z-10 shadow-sm">
                                <tr>
                                    {columns.map((col, i) => (
                                        <th key={i} className="px-4 py-3 font-medium">
                                            {col.header}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {data.length === 0 ? (
                                    <tr>
                                        <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                                            No issues found.
                                        </td>
                                    </tr>
                                ) : (
                                    data.map((item, i) => (
                                        <tr key={i} className="border-b border-slate-100 hover:bg-slate-50/50 transition-colors last:border-0">
                                            {columns.map((col, j) => (
                                                <td key={j} className="px-4 py-3 align-top">
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
