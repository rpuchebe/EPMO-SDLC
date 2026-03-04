'use client'

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import Image from 'next/image'
import {
    Search, ChevronRight, ChevronDown, AlertTriangle, Download,
    Filter, FileText,
    CheckCircle2, Clock, Circle, X, ShieldCheck,
} from 'lucide-react'
import {
    addMonths, addQuarters, addWeeks,
    endOfMonth, endOfQuarter, endOfWeek,
    format, parseISO,
    startOfMonth, startOfQuarter, startOfWeek,
} from 'date-fns'
import type { RoadmapDTO, RoadmapNode, StatusCategory } from '@/lib/server/roadmap'

// ─── Constants ────────────────────────────────────────────────────────────────

const SIDEBAR_WIDTH = 400   // px — left tree panel
const ROW_HEIGHT = 48       // px

type Timeframe = 'weekly' | 'monthly' | 'quarterly'

// ─── Timeline utilities ───────────────────────────────────────────────────────

interface TimeColumn {
    key: string
    label: string
    subLabel?: string
    start: Date
    end: Date
    width: number
}

function generateTimeline(
    minDate: string | null,
    maxDate: string | null,
    timeframe: Timeframe,
): { columns: TimeColumn[]; start: Date; end: Date } {
    const now = new Date()
    let rangeStart: Date
    let rangeEnd: Date

    if (minDate && maxDate) {
        rangeStart = parseISO(minDate)
        rangeEnd = parseISO(maxDate)
    } else {
        rangeStart = startOfMonth(now)
        rangeEnd = addMonths(rangeStart, 6)
    }

    // Expand by padding units on each side
    if (timeframe === 'weekly') {
        rangeStart = addWeeks(startOfWeek(rangeStart, { weekStartsOn: 1 }), -2)
        rangeEnd = addWeeks(endOfWeek(rangeEnd, { weekStartsOn: 1 }), 2)
    } else if (timeframe === 'monthly') {
        rangeStart = addMonths(startOfMonth(rangeStart), -1)
        rangeEnd = addMonths(endOfMonth(rangeEnd), 1)
    } else {
        rangeStart = addQuarters(startOfQuarter(rangeStart), -1)
        rangeEnd = addQuarters(endOfQuarter(rangeEnd), 1)
    }

    const columns: TimeColumn[] = []
    let cursor = new Date(rangeStart)

    if (timeframe === 'weekly') {
        while (cursor <= rangeEnd) {
            const colEnd = endOfWeek(cursor, { weekStartsOn: 1 })
            columns.push({
                key: format(cursor, 'yyyy-MM-dd'),
                label: format(cursor, 'MMM d'),
                subLabel: `Wk ${format(cursor, 'w')}`,
                start: new Date(cursor),
                end: colEnd,
                width: 60,
            })
            cursor = addWeeks(cursor, 1)
        }
    } else if (timeframe === 'monthly') {
        while (cursor <= rangeEnd) {
            const colEnd = endOfMonth(cursor)
            columns.push({
                key: format(cursor, 'yyyy-MM'),
                label: format(cursor, 'MMM yyyy'),
                start: new Date(cursor),
                end: colEnd,
                width: 90,
            })
            cursor = addMonths(cursor, 1)
        }
    } else {
        while (cursor <= rangeEnd) {
            const colEnd = endOfQuarter(cursor)
            columns.push({
                key: format(cursor, "yyyy-'Q'Q"),
                label: `Q${format(cursor, 'q')} ${format(cursor, 'yyyy')}`,
                start: new Date(cursor),
                end: colEnd,
                width: 200,
            })
            cursor = addQuarters(cursor, 1)
        }
    }

    return { columns, start: rangeStart, end: rangeEnd }
}

interface BarStyle {
    left: string
    width: string
}

function getBarStyle(
    startDate: string | null,
    dueDate: string | null,
    timelineStart: Date,
    timelineEnd: Date,
): BarStyle | null {
    if (!startDate || !dueDate) return null
    const s = parseISO(startDate)
    const e = parseISO(dueDate)
    const total = timelineEnd.getTime() - timelineStart.getTime()
    if (total <= 0) return null

    const leftMs = Math.max(0, s.getTime() - timelineStart.getTime())
    const rightMs = Math.min(total, e.getTime() - timelineStart.getTime())
    if (rightMs < leftMs) return null

    const left = (leftMs / total) * 100
    const width = Math.max(0.3, ((rightMs - leftMs) / total) * 100)
    return { left: `${left.toFixed(3)}%`, width: `${width.toFixed(3)}%` }
}

// ─── Tree utilities ───────────────────────────────────────────────────────────

function getVisibleRows(
    rootIds: string[],
    nodes: Record<string, RoadmapNode>,
    expandedIds: Set<string>,
    hideClosed: boolean,
    searchTerm: string,
    showNoDates: boolean,
): RoadmapNode[] {
    const term = searchTerm.toLowerCase().trim()
    const result: RoadmapNode[] = []

    // A node passes the date filter if it has both dates OR showNoDates is on
    const hasBar = (n: RoadmapNode) => showNoDates || (!!n.startDate && !!n.dueDate)

    if (term) {
        // In search mode match any node regardless of dates — user is actively looking
        const matchIds = new Set(
            Object.values(nodes)
                .filter(
                    (n) =>
                        n.key.toLowerCase().includes(term) ||
                        n.summary.toLowerCase().includes(term) ||
                        (n.assignee ?? '').toLowerCase().includes(term),
                )
                .map((n) => n.id),
        )

        // Collect ancestors (upward) and all descendants (downward) of each match
        const visibleIds = new Set<string>()

        const addAncestors = (id: string) => {
            if (visibleIds.has(id)) return
            visibleIds.add(id)
            const n = nodes[id]
            if (n?.parentId && nodes[n.parentId]) addAncestors(n.parentId)
        }

        const addDescendants = (id: string) => {
            if (visibleIds.has(id)) return
            visibleIds.add(id)
            const n = nodes[id]
            if (!n) return
            for (const childId of n.childIds) addDescendants(childId)
        }

        for (const id of matchIds) {
            addAncestors(id)  // match + all parents up to root
            // addAncestors already put the match in visibleIds, so call addDescendants
            // on each child (not the match itself) to avoid the early-return guard
            const n = nodes[id]
            if (n) for (const childId of n.childIds) addDescendants(childId)
        }

        // Flatten in tree order — no date filter in search mode, only hideClosed applies
        const visit = (id: string) => {
            const n = nodes[id]
            if (!n || !visibleIds.has(id)) return
            if (hideClosed && n.statusCategory === 'Done') return
            result.push(n)
            for (const childId of n.childIds) {
                if (visibleIds.has(childId)) visit(childId)
            }
        }
        for (const rId of rootIds) visit(rId)
        return result
    }

    // Normal mode: respect expandedIds
    const visit = (id: string) => {
        const n = nodes[id]
        if (!n) return
        if (hideClosed && n.statusCategory === 'Done') return
        if (!hasBar(n)) return
        result.push(n)
        if (expandedIds.has(id)) {
            for (const childId of n.childIds) visit(childId)
        }
    }
    for (const rId of rootIds) visit(rId)
    return result
}

// ─── Small UI helpers ─────────────────────────────────────────────────────────

const STATUS_DOT: Record<StatusCategory, string> = {
    Done: 'bg-emerald-500',
    'In Progress': 'bg-blue-500',
    'To Do': 'bg-slate-300',
}

const BAR_BG: Record<StatusCategory, string> = {
    Done: 'bg-emerald-400',
    'In Progress': 'bg-blue-400',
    'To Do': 'bg-slate-300',
}

const STATUS_ICON: Record<StatusCategory, React.ReactNode> = {
    Done: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />,
    'In Progress': <Clock className="w-3.5 h-3.5 text-blue-500" />,
    'To Do': <Circle className="w-3.5 h-3.5 text-slate-300" />,
}

function IssueTypeIcon({ issueType }: { issueType: string }) {
    const cls = 'w-4 h-4 shrink-0 object-contain rounded-sm'
    const t = (issueType ?? '').toLowerCase()

    if (t.includes('initiative')) {
        return <Image src="/initiatives-icon.png" width={16} height={16} alt="" className={cls} />
    }
    if (t.includes('project')) {
        return <Image src="/projects-icon.png" width={16} height={16} alt="" className={cls} />
    }
    // BWIs: Story, Bug, Feature, Enhancement, Task, etc.
    if (t.includes('bug') || t.includes('issue') || t.includes('story') ||
        t.includes('feature') || t.includes('enhancement') || t.includes('task')) {
        return <Image src="/bwi-icon.png" width={16} height={16} alt="" className={cls} />
    }

    return <FileText className="w-4 h-4 shrink-0 text-slate-400" />
}

// ─── Loading / Error states ───────────────────────────────────────────────────

function LoadingSkeleton() {
    return (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden animate-pulse">
            <div className="h-14 bg-slate-100 border-b border-slate-200" />
            {Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="flex border-b border-slate-100" style={{ height: ROW_HEIGHT }}>
                    <div
                        className="border-r border-slate-200 px-4 py-3 flex items-center gap-2"
                        style={{ width: SIDEBAR_WIDTH }}
                    >
                        <div className="w-4 h-4 rounded bg-slate-200 shrink-0" />
                        <div className="h-3 bg-slate-200 rounded flex-1" style={{ maxWidth: `${40 + (i % 5) * 12}%` }} />
                    </div>
                    <div className="flex-1 px-4 py-3 flex items-center">
                        <div
                            className="h-5 bg-slate-100 rounded-full"
                            style={{ width: `${20 + (i % 4) * 15}%`, marginLeft: `${(i % 5) * 8}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    )
}

function ErrorState({ message }: { message: string }) {
    return (
        <div className="bg-white rounded-xl border border-slate-200 flex flex-col items-center justify-center py-20 gap-3 text-slate-500">
            <AlertTriangle className="w-10 h-10 text-rose-400" />
            <p className="text-sm font-medium text-slate-700">Failed to load roadmap</p>
            <p className="text-xs text-slate-400">{message}</p>
        </div>
    )
}

// ─── Tooltip component ────────────────────────────────────────────────────────

function Tooltip({ node }: { node: RoadmapNode }) {
    return (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-72 bg-slate-900 text-white rounded-xl shadow-2xl p-3 pointer-events-none text-xs">
            <div className="flex items-start gap-2 mb-2">
                <IssueTypeIcon issueType={node.issueType} />
                <div>
                    <div className="font-mono text-slate-400 text-[10px]">{node.key}</div>
                    <div className="font-semibold text-white leading-tight mt-0.5">{node.summary}</div>
                </div>
            </div>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-slate-300">
                <span className="text-slate-500">Status</span>
                <span className="flex items-center gap-1">
                    {STATUS_ICON[node.statusCategory]}
                    {node.statusName || node.statusCategory}
                </span>
                {node.startDate && (
                    <>
                        <span className="text-slate-500">Start</span>
                        <span>{node.startDate}</span>
                    </>
                )}
                {node.dueDate && (
                    <>
                        <span className="text-slate-500">Due</span>
                        <span>{node.dueDate}</span>
                    </>
                )}
                {node.assignee && (
                    <>
                        <span className="text-slate-500">Assignee</span>
                        <span>{node.assignee}</span>
                    </>
                )}
                {node.workstream && (
                    <>
                        <span className="text-slate-500">Workstream</span>
                        <span>{node.workstream}</span>
                    </>
                )}
                {node.childrenTotal > 0 && (
                    <>
                        <span className="text-slate-500">Progress</span>
                        <span>{node.percentComplete}% ({node.childrenDone}/{node.childrenTotal})</span>
                    </>
                )}
                {node.hiddenMissingDatesCount > 0 && (
                    <>
                        <span className="text-slate-500">Missing dates</span>
                        <span className="text-amber-400">{node.hiddenMissingDatesCount} descendants</span>
                    </>
                )}
            </div>
        </div>
    )
}

// ─── Main component ───────────────────────────────────────────────────────────

export function RoadmapClient({ isAdmin = false, workstream = 'All Workstreams' }: { isAdmin?: boolean, workstream?: string }) {
    const [dto, setDto] = useState<RoadmapDTO | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set())
    const [timeframe, setTimeframe] = useState<Timeframe>('monthly')
    const [searchTerm, setSearchTerm] = useState('')
    const [hideClosed, setHideClosed] = useState(false)
    const [tooltipState, setTooltipState] = useState<{ node: RoadmapNode; x: number; y: number } | null>(null)
    // Admin-only: show 2-week placeholder bars for issues with no dates
    const [showPlaceholders, setShowPlaceholders] = useState(false)

    const ganttRef = useRef<HTMLDivElement>(null)

    // ── Fetch data ────────────────────────────────────────────────────────────
    useEffect(() => {
        setLoading(true)
        setError(null)
        const query = new URLSearchParams()
        if (workstream) query.set('workstream', workstream)

        fetch(`/api/phase3?${query.toString()}`)
            .then((r) => {
                if (!r.ok) throw new Error(`HTTP ${r.status}`)
                return r.json()
            })
            .then((data: RoadmapDTO) => {
                setDto(data)
                // Default to all nodes collapsed
                setExpandedIds(new Set())
                setLoading(false)
            })
            .catch((err: Error) => {
                setError(err.message)
                setLoading(false)
            })
    }, [workstream])

    // ── Timeline ──────────────────────────────────────────────────────────────
    const { columns, start: timelineStart, end: timelineEnd } = useMemo(
        () => generateTimeline(dto?.minDate ?? null, dto?.maxDate ?? null, timeframe),
        // eslint-disable-next-line react-hooks/exhaustive-deps
        [dto?.minDate, dto?.maxDate, timeframe],
    )

    const totalTimelineWidth = useMemo(
        () => columns.reduce((sum, c) => sum + c.width, 0),
        [columns],
    )

    // Pre-computed column left/width percentages — avoids O(n²) slice().reduce() inside row renders
    const columnPositions = useMemo(() => {
        let acc = 0
        return columns.map((col) => {
            const leftPct = totalTimelineWidth > 0 ? (acc / totalTimelineWidth) * 100 : 0
            acc += col.width
            return { ...col, leftPct, widthPct: totalTimelineWidth > 0 ? (col.width / totalTimelineWidth) * 100 : 0 }
        })
    }, [columns, totalTimelineWidth])

    // Today indicator (percentage across timeline)
    const todayPct = useMemo(() => {
        const total = timelineEnd.getTime() - timelineStart.getTime()
        if (total <= 0) return null
        const offset = Date.now() - timelineStart.getTime()
        const pct = (offset / total) * 100
        return pct >= 0 && pct <= 100 ? pct : null
    }, [timelineStart, timelineEnd])

    // Admin placeholder bar: today → today + 14 days (computed once per timeline)
    const placeholderBarStyle = useMemo(() => {
        if (!isAdmin) return null
        const today = new Date()
        const twoWeeksLater = addWeeks(today, 2)
        return getBarStyle(
            format(today, 'yyyy-MM-dd'),
            format(twoWeeksLater, 'yyyy-MM-dd'),
            timelineStart,
            timelineEnd,
        )
    }, [isAdmin, timelineStart, timelineEnd])

    // ── Auto-scroll to today on every data load ───────────────────────────────
    useEffect(() => {
        if (!dto || todayPct === null) return
        const container = ganttRef.current
        if (!container) return
        const raf = requestAnimationFrame(() => {
            const todayPixel = (todayPct / 100) * totalTimelineWidth
            const viewportGanttWidth = container.clientWidth - SIDEBAR_WIDTH
            container.scrollLeft = Math.max(0, todayPixel - viewportGanttWidth / 2)
        })
        return () => cancelAnimationFrame(raf)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [dto])

    // ── Visible rows ──────────────────────────────────────────────────────────
    const visibleRows = useMemo(
        () =>
            dto
                ? getVisibleRows(dto.rootIds, dto.nodes, expandedIds, hideClosed, searchTerm, showPlaceholders)
                : [],
        [dto, expandedIds, hideClosed, searchTerm, showPlaceholders],
    )

    // ── Actions ───────────────────────────────────────────────────────────────
    const toggleExpand = useCallback((id: string, hasChildren: boolean) => {
        if (!hasChildren) return
        setExpandedIds((prev) => {
            const next = new Set(prev)
            if (next.has(id)) next.delete(id)
            else next.add(id)
            return next
        })
    }, [])

    const expandAll = useCallback(() => {
        if (!dto) return
        setExpandedIds(new Set(Object.keys(dto.nodes)))
    }, [dto])

    const collapseAll = useCallback(() => {
        if (!dto) return
        setExpandedIds(new Set())
    }, [dto])

    const exportPDF = async () => {
        if (!ganttRef.current) return
        try {
            const { default: html2canvas } = await import('html2canvas')
            const { jsPDF } = await import('jspdf')
            const canvas = await html2canvas(ganttRef.current, {
                scale: 1.5,
                useCORS: true,
                logging: false,
                allowTaint: true,
            })
            const pdf = new jsPDF({
                orientation: 'landscape',
                unit: 'px',
                format: [canvas.width, canvas.height],
            })
            pdf.addImage(canvas.toDataURL('image/png'), 'PNG', 0, 0, canvas.width, canvas.height)
            pdf.save(`roadmap-${format(new Date(), 'yyyy-MM-dd')}.pdf`)
        } catch (e) {
            console.error('[roadmap] PDF export failed:', e)
        }
    }

    // ── Render ────────────────────────────────────────────────────────────────

    if (loading) return <LoadingSkeleton />
    if (error) return <ErrorState message={error} />
    if (!dto) return null

    const totalNodes = Object.keys(dto.nodes).length

    return (
        <div className="flex flex-col bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">

            {/* ── Toolbar ─────────────────────────────────────────────────── */}
            <div className="flex items-center gap-3 px-4 py-3 border-b border-slate-200 bg-slate-50 flex-wrap">
                {/* Search */}
                <div className="relative min-w-[220px] max-w-xs">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" />
                    <input
                        type="text"
                        placeholder="Search key or name…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="w-full pl-9 pr-8 py-1.5 text-sm border border-slate-200 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-400"
                    />
                    {searchTerm && (
                        <button
                            onClick={() => setSearchTerm('')}
                            className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Timeframe toggle */}
                <div className="flex items-center gap-0.5 bg-white border border-slate-200 rounded-lg p-0.5">
                    {(['weekly', 'monthly', 'quarterly'] as Timeframe[]).map((tf) => (
                        <button
                            key={tf}
                            onClick={() => setTimeframe(tf)}
                            className={`px-3 py-1 text-xs font-medium rounded-md transition-colors capitalize ${timeframe === tf
                                ? 'bg-slate-800 text-white shadow-sm'
                                : 'text-slate-600 hover:bg-slate-100'
                                }`}
                        >
                            {tf}
                        </button>
                    ))}
                </div>

                {/* Hide Closed toggle */}
                <label className="flex items-center gap-2 cursor-pointer select-none">
                    <div
                        role="switch"
                        aria-checked={hideClosed}
                        onClick={() => setHideClosed((v) => !v)}
                        className={`relative w-8 h-5 rounded-full transition-colors ${hideClosed ? 'bg-blue-500' : 'bg-slate-200'
                            }`}
                    >
                        <span
                            className={`absolute w-4 h-4 bg-white rounded-full shadow top-0.5 transition-transform ${hideClosed ? 'translate-x-3.5' : 'translate-x-0.5'
                                }`}
                        />
                    </div>
                    <span className="text-sm text-slate-600">Hide Closed</span>
                </label>

                {/* Expand / Collapse */}
                <div className="flex items-center gap-1">
                    <button
                        onClick={expandAll}
                        className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                        Expand All
                    </button>
                    <span className="text-slate-300">|</span>
                    <button
                        onClick={collapseAll}
                        className="text-xs text-slate-500 hover:text-slate-800 px-2 py-1 rounded hover:bg-slate-100 transition-colors"
                    >
                        Collapse All
                    </button>
                </div>

                <div className="flex-1" />

                {/* Stats */}
                <span className="text-xs text-slate-400 hidden md:block">
                    {visibleRows.length} / {totalNodes} issues
                </span>

                {/* Admin: placeholder bar toggle */}
                {isAdmin && (
                    <button
                        onClick={() => setShowPlaceholders((v) => !v)}
                        title="Admin: show a 2-week placeholder bar (starting today) for issues that have no start/due date"
                        className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors ${showPlaceholders
                            ? 'bg-amber-500 border-amber-400 text-white shadow-sm'
                            : 'bg-white border-amber-300 text-amber-700 hover:bg-amber-50'
                            }`}
                    >
                        <ShieldCheck className="w-3.5 h-3.5" />
                        {showPlaceholders ? 'Placeholder Bars On' : 'Show All Issues'}
                    </button>
                )}

                {/* Export PDF */}
                <button
                    onClick={exportPDF}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium bg-slate-800 text-white rounded-lg hover:bg-slate-700 transition-colors"
                >
                    <Download className="w-3.5 h-3.5" />
                    Export PDF
                </button>
            </div>

            {/* ── Gantt chart ─────────────────────────────────────────────── */}
            <div
                ref={ganttRef}
                className="overflow-auto"
                style={{ maxHeight: 'calc(100vh - 315px)', minHeight: '400px' }}
            >
                {/* Inner container — minimum width = sidebar + full timeline */}
                <div style={{ minWidth: `${SIDEBAR_WIDTH + totalTimelineWidth}px` }}>

                    {/* ── Sticky header row ──────────────────────────────── */}
                    <div
                        className="flex sticky top-0 z-20 border-b border-slate-200 bg-slate-50"
                        style={{ height: 52 }}
                    >
                        {/* Corner cell — sticky top + left */}
                        <div
                            className="sticky left-0 z-30 bg-slate-50 border-r border-slate-200 flex items-center px-4"
                            style={{ width: SIDEBAR_WIDTH, minWidth: SIDEBAR_WIDTH }}
                        >
                            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                                Issue
                            </span>
                        </div>

                        {/* Timeline column headers */}
                        <div className="flex">
                            {columns.map((col) => (
                                <div
                                    key={col.key}
                                    className="flex flex-col items-center justify-center border-r border-slate-200 last:border-r-0 shrink-0"
                                    style={{ width: col.width, minWidth: col.width }}
                                >
                                    <span className="text-xs font-semibold text-slate-700 leading-none">
                                        {col.label}
                                    </span>
                                    {col.subLabel && (
                                        <span className="text-[10px] text-slate-400 mt-0.5">
                                            {col.subLabel}
                                        </span>
                                    )}
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* ── Data rows ─────────────────────────────────────── */}
                    {visibleRows.length === 0 ? (
                        <div
                            className="flex flex-col items-center justify-center py-16 text-slate-400"
                            style={{ minWidth: `${SIDEBAR_WIDTH + totalTimelineWidth}px` }}
                        >
                            <Filter className="w-8 h-8 mb-2 opacity-50" />
                            <p className="text-sm">No items match the current filters</p>
                        </div>
                    ) : (
                        visibleRows.map((node, idx) => {
                            const barStyle = getBarStyle(
                                node.startDate,
                                node.dueDate,
                                timelineStart,
                                timelineEnd,
                            )
                            const hasChildren = node.childIds.length > 0
                            const isExpanded = expandedIds.has(node.id)
                            const missingOwnDates = !node.startDate || !node.dueDate
                            const isHovered = tooltipState?.node.id === node.id
                            const indentPx = 12 + node.depth * 22
                            const isEven = idx % 2 === 0

                            return (
                                <div
                                    key={node.id}
                                    className={`flex border-b border-slate-100 transition-colors ${isHovered ? 'bg-blue-50/60' : isEven ? 'bg-white' : 'bg-slate-50/40'
                                        }`}
                                    style={{ height: ROW_HEIGHT }}
                                    onMouseMove={(e) => setTooltipState({ node, x: e.clientX, y: e.clientY })}
                                    onMouseLeave={() => setTooltipState(null)}
                                >
                                    {/* ── Sidebar cell ───────────────────────── */}
                                    <div
                                        className="sticky left-0 z-10 flex items-center gap-1.5 border-r border-slate-200 overflow-hidden shrink-0"
                                        style={{
                                            width: SIDEBAR_WIDTH,
                                            minWidth: SIDEBAR_WIDTH,
                                            paddingLeft: indentPx,
                                            paddingRight: 12,
                                            backgroundColor: isHovered
                                                ? 'rgb(239 246 255)'
                                                : isEven
                                                    ? 'white'
                                                    : 'rgb(248 250 252)',
                                        }}
                                    >
                                        {/* Expand/collapse toggle */}
                                        <button
                                            onClick={() => toggleExpand(node.id, hasChildren)}
                                            className={`w-5 h-5 flex items-center justify-center rounded hover:bg-slate-200 transition-colors shrink-0 ${!hasChildren ? 'opacity-0 pointer-events-none' : ''
                                                }`}
                                            aria-label={isExpanded ? 'Collapse' : 'Expand'}
                                        >
                                            {isExpanded ? (
                                                <ChevronDown className="w-3.5 h-3.5 text-slate-500" />
                                            ) : (
                                                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                                            )}
                                        </button>

                                        {/* Issue type icon */}
                                        <IssueTypeIcon issueType={node.issueType} />

                                        {/* Key + Summary */}
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-1.5 mb-0.5">
                                                <span className="font-mono text-[10px] text-slate-400 shrink-0 leading-none">
                                                    {node.key}
                                                </span>
                                                {missingOwnDates && (
                                                    <AlertTriangle
                                                        className="w-3 h-3 text-amber-500 shrink-0"
                                                        aria-label="Missing start or due date"
                                                    />
                                                )}
                                                {!missingOwnDates && node.hiddenMissingDatesCount > 0 && (
                                                    <span
                                                        className="text-[9px] text-amber-600 bg-amber-50 border border-amber-200 rounded px-1 shrink-0 leading-none py-0.5"
                                                        title={`${node.hiddenMissingDatesCount} descendants missing dates`}
                                                    >
                                                        ⚠ {node.hiddenMissingDatesCount}
                                                    </span>
                                                )}
                                            </div>
                                            <div className="text-xs text-slate-700 truncate leading-tight">
                                                {node.summary}
                                            </div>
                                        </div>

                                        {/* Status dot */}
                                        <div
                                            className={`w-2 h-2 rounded-full shrink-0 ml-1 ${STATUS_DOT[node.statusCategory]}`}
                                            title={node.statusCategory}
                                        />
                                    </div>

                                    {/* ── Gantt bar cell ─────────────────────── */}
                                    <div
                                        className="relative flex-1"
                                        style={{ minWidth: totalTimelineWidth }}
                                    >
                                        {/* Column separator lines — use pre-computed positions */}
                                        {columnPositions.map((col) => (
                                            <div
                                                key={col.key}
                                                className="absolute inset-y-0 border-r border-slate-100 pointer-events-none"
                                                style={{
                                                    left: `${col.leftPct.toFixed(3)}%`,
                                                    width: `${col.widthPct.toFixed(3)}%`,
                                                }}
                                            />
                                        ))}

                                        {/* Today line */}
                                        {todayPct !== null && (
                                            <div
                                                className="absolute inset-y-0 w-px bg-rose-400/60 z-10 pointer-events-none"
                                                style={{ left: `${todayPct.toFixed(3)}%` }}
                                            />
                                        )}

                                        {/* Gantt bar */}
                                        {barStyle ? (
                                            <div
                                                className={`absolute top-3 bottom-3 rounded-full ${BAR_BG[node.statusCategory]} hover:opacity-100 transition-opacity cursor-default`}
                                                style={{
                                                    left: barStyle.left,
                                                    width: barStyle.width,
                                                    opacity: node.statusCategory === 'Done' ? 0.7 : 0.85,
                                                }}
                                            >
                                                {/* Progress % label — only show when bar is wide enough to avoid overflow */}
                                                {node.childrenTotal > 0 && parseFloat(barStyle.width) > 4 && (
                                                    <span className="absolute inset-y-0 left-2 flex items-center text-[10px] text-white font-semibold whitespace-nowrap pointer-events-none select-none">
                                                        {node.percentComplete}%
                                                    </span>
                                                )}
                                            </div>
                                        ) : showPlaceholders && placeholderBarStyle ? (
                                            /* Admin: 2-week gray placeholder bar starting today */
                                            <div
                                                className="absolute top-3 bottom-3 rounded-full bg-slate-300/70 border border-dashed border-slate-400/50"
                                                style={{
                                                    left: placeholderBarStyle.left,
                                                    width: placeholderBarStyle.width,
                                                }}
                                                title="No dates — 2-week placeholder from today (admin view)"
                                            />
                                        ) : (
                                            /* No dates — subtle dashed outline */
                                            <div className="absolute inset-y-3 left-1 right-1 border border-dashed border-slate-200 rounded-full" />
                                        )}
                                    </div>
                                </div>
                            )
                        })
                    )}
                </div>
            </div>

            {/* ── Fixed tooltip — outside overflow-auto so it is never clipped ── */}
            {tooltipState && (
                <div
                    className="fixed z-[9999] pointer-events-none"
                    style={{
                        left: Math.min(tooltipState.x + 16, window.innerWidth - 308),
                        top: Math.min(tooltipState.y - 90, window.innerHeight - 230),
                    }}
                >
                    <Tooltip node={tooltipState.node} />
                </div>
            )}

            {/* ── Footer / Legend ──────────────────────────────────────────── */}
            <div className="px-4 py-2 border-t border-slate-100 bg-slate-50 flex items-center gap-5 flex-wrap">
                <div className="flex items-center gap-4 text-xs text-slate-500">
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-emerald-400 inline-block" />
                        Done
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-blue-400 inline-block" />
                        In Progress
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-3 h-3 rounded-full bg-slate-300 inline-block" />
                        To Do
                    </span>
                    <span className="flex items-center gap-1.5">
                        <span className="w-4 h-px bg-rose-400 inline-block" />
                        Today
                    </span>
                    <span className="flex items-center gap-1.5">
                        <AlertTriangle className="w-3 h-3 text-amber-500" />
                        Missing dates
                    </span>
                    {isAdmin && showPlaceholders && (
                        <span className="flex items-center gap-1.5 text-amber-600 font-medium">
                            <ShieldCheck className="w-3 h-3" />
                            Placeholder bars active (today + 2 wks)
                        </span>
                    )}
                </div>
                <div className="ml-auto text-xs text-slate-400">
                    {dto.minDate && dto.maxDate ? (
                        <>
                            Timeline: {format(parseISO(dto.minDate), 'MMM d, yyyy')}
                            {' → '}
                            {format(parseISO(dto.maxDate), 'MMM d, yyyy')}
                            {' · '}
                        </>
                    ) : null}
                    Updated {dto.lastUpdated ? format(parseISO(dto.lastUpdated), 'MMM d, yyyy HH:mm') : '—'}
                </div>
            </div>
        </div>
    )
}
