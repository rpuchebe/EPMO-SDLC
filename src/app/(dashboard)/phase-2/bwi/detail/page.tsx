'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { DetailList, ColumnDef } from '@/components/phase2/detail-list'

export default function BWIDetailPage() {
    const searchParams = useSearchParams()

    const [data, setData] = useState<any[]>([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        const fetchData = async () => {
            setLoading(true)
            try {
                const query = new URLSearchParams(searchParams.toString())
                query.set('entity', 'bwi')
                const res = await fetch(`/api/phase2/detail?${query.toString()}`)
                if (!res.ok) throw new Error('Failed to fetch details')
                const json = await res.json()
                setData(json.results || [])
            } catch (err: any) {
                setError(err.message)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [searchParams])

    const columns: ColumnDef<any>[] = [
        {
            key: 'key',
            header: 'Key',
            render: (item) => (
                <a href={`https://prioritycommerce.atlassian.net/browse/${item.key}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline font-medium">
                    {item.key}
                </a>
            )
        },
        { key: 'summary', header: 'Summary' },
        {
            key: 'issue_type',
            header: 'Type',
            render: (item) => (
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                    {item.issue_type}
                </span>
            )
        },
        {
            key: 'status',
            header: 'Status',
            render: (item) => (
                <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${item.wrong_status ? 'bg-red-100 text-red-700 font-bold border border-red-300' : 'bg-slate-100 text-slate-700'}`}>
                    {item.status}
                </span>
            )
        },
        { key: 'workstream', header: 'Workstream' },
        {
            key: 'parent_project_key',
            header: 'Parent Project',
            render: (item) => item.parent_project_key ? (
                <a href={`https://prioritycommerce.atlassian.net/browse/${item.parent_project_key}`} target="_blank" rel="noreferrer" className="text-indigo-600 hover:underline">{item.parent_project_key}</a>
            ) : <span className="text-amber-500 font-semibold bg-amber-50 px-2 py-0.5 rounded text-xs">Missing</span>
        },
        {
            key: 'children',
            header: 'Kids (Total / Open)',
            sortAccessor: (item) => item.children_count,
            render: (item) => `${item.children_count} / ${item.open_children_count}`
        },
        {
            key: 'warnings',
            header: 'Warnings',
            sortable: false,
            render: (item) => (
                <div className="flex flex-wrap gap-1">
                    {item.warning_types?.map((wt: string) => (
                        <span key={wt} className="px-2 py-0.5 rounded text-[10px] font-medium bg-amber-100 text-amber-800">
                            {wt}
                        </span>
                    ))}
                    {item.warning_types?.length === 0 && item.wrong_status && (
                        <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-red-100 text-red-800">
                            Wrong Status
                        </span>
                    )}
                </div>
            )
        },
    ]

    if (loading) {
        return (
            <div className="flex flex-col items-center justify-center min-h-[60vh] text-slate-400">
                <Loader2 className="w-8 h-8 animate-spin mb-4 text-indigo-500" />
                <p>Loading details...</p>
            </div>
        )
    }

    if (error) {
        return (
            <div className="bg-red-50 text-red-600 p-6 rounded-xl border border-red-100 flex flex-col items-center justify-center min-h-[40vh]">
                <p className="font-medium text-lg mb-2">Error Loading Details</p>
                <p className="text-sm">{error}</p>
            </div>
        )
    }

    // Preserve original query filters for back button
    const backQuery = new URLSearchParams(searchParams.toString())
    backQuery.delete('metric_id')
    backQuery.delete('segment')
    const backUrl = `/phase-2?${backQuery.toString()}`

    let metricName = searchParams.get('metric_id') || 'BWIs'
    if (searchParams.get('segment')) metricName += ` (${searchParams.get('segment')})`

    return (
        <div className="max-w-7xl mx-auto space-y-6">
            <DetailList
                title={`BWI Details (${metricName.replace(/_/g, ' ')})`}
                backUrl={backUrl}
                data={data}
                columns={columns}
                searchFields={['key', 'summary', 'status', 'workstream', 'parent_project_key', 'issue_type']}
            />
        </div>
    )
}
