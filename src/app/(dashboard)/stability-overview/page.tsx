'use client'

import React, { useState, useEffect, useMemo, useCallback } from 'react'
import Image from 'next/image'
import {
    Server, Activity, Edit3, Loader2, CheckCircle2,
    ChevronDown, ChevronRight, AlertTriangle,
    Plus, Trash2, History, ClipboardCheck, TrendingUp,
    Target, CheckSquare, ClipboardList, Check, Save
} from 'lucide-react'
import { PhaseHeader } from '@/components/ui/phase-header'
import {
    Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription
} from '@/components/ui/dialog'
import { format, parseISO } from 'date-fns'
import { createClient } from '@/utils/supabase/client'
import { LineChart, Line, ResponsiveContainer, YAxis, XAxis, Tooltip, CartesianGrid, AreaChart, Area } from 'recharts'
import { clsx, type ClassValue } from 'clsx'
import { twMerge } from 'tailwind-merge'

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs))
}

interface KPI {
    id: string | number
    label: string
    progress: number
    note?: string
    risks?: string
    nextSteps?: string
    tasks?: { id: number | string, label: string, completed: boolean }[]
}

interface UpdateHistory {
    reported_progress_pct: number
    created_at: string
    week_of: string
    note?: string
    risks?: string
    nextSteps?: string
    kpis?: KPI[]
}

interface Deliverable {
    jira_issue_id: string
    jira_key: string
    summary: string
    status_name: string
    status_category: string
    issue_type: string
    parent_jira_issue_id?: string | null
    assignee_account_id?: string | null
    labels?: string[]
    start_date: string | null
    due_date: string | null
    systemProgress: number
    reportedProgress: number | null
    reportedNote: string | null
    reportedRisks: string | null
    reportedNextSteps: string | null
    reportedKpis: KPI[]
    reportedAt: string | null
    weekOf: string | null
    updatesHistory: UpdateHistory[]
}

const PHASES = [
    { id: 'Phase 1: Stabilize', start: '2025-10-01', end: '2026-03-31' },
    { id: 'Phase 2: Modernize', start: '2026-04-01', end: '2026-09-30' },
    { id: 'Phase 3: Mature', start: '2026-10-01', end: '2026-12-31' }
]

export default function StabilityOverviewPage() {
    const [loading, setLoading] = useState(true)
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const [error, setError] = useState<string | null>(null)
    const [data, setData] = useState<{ deliverables: Deliverable[], lastSync: string | null } | null>(null)
    const [userProfile, setUserProfile] = useState<{ role: string } | null>(null)

    // UI State
    const [expandedInitiatives, setExpandedInitiatives] = useState<Record<string, boolean>>({})
    const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})
    const [modalOpen, setModalOpen] = useState(false)
    const [selectedProject, setSelectedProject] = useState<Deliverable | null>(null)
    const [isSaving, setIsSaving] = useState(false)
    const [selectedPhaseId, setSelectedPhaseId] = useState<string | null>(null)
    const [selectedKpi, setSelectedKpi] = useState<{ project: Deliverable, kpi: KPI } | null>(null)
    const [kpiModalOpen, setKpiModalOpen] = useState(false)
    const [addKpiModalOpen, setAddKpiModalOpen] = useState(false)
    const [newKpiLabel, setNewKpiLabel] = useState('')
    const [targetProjectForKpi, setTargetProjectForKpi] = useState<Deliverable | null>(null)

    const [formData, setFormData] = useState({
        weekOf: format(new Date(), 'yyyy-MM-dd'),
        percent: 0,
        note: '',
        risks: '',
        nextSteps: '',
        kpis: [] as KPI[],
        targetKpiId: null as string | number | null
    })

    const supabase = createClient()

    const fetchData = async () => {
        setLoading(true)
        setError(null)
        try {
            const res = await fetch('/api/stability')
            if (!res.ok) throw new Error('Failed to fetch stability data')
            const json = await res.json()
            setData(json)

            const { data: { user } } = await supabase.auth.getUser()
            if (user) {
                const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
                setUserProfile(profile)
            }
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An error occurred'
            setError(message)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const toggleExpandInitiative = (id: string) => {
        setExpandedInitiatives(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const toggleExpandProject = (id: string) => {
        setExpandedProjects(prev => ({ ...prev, [id]: !prev[id] }))
    }

    const isAdmin = userProfile?.role === 'Admin'

    const projects = useMemo(() => {
        const raw = data?.deliverables.filter(d => d.issue_type === 'Project' || !d.issue_type) || []
        return raw.map(p => ({
            ...p,
            effectiveProgress: p.reportedProgress ?? p.systemProgress ?? 0
        }))
    }, [data])

    const initiatives = useMemo(() => {
        const raw = data?.deliverables.filter(d => d.issue_type?.includes('Initiative')) || []
        return raw.map(init => {
            const children = projects.filter(p => p.parent_jira_issue_id === init.jira_issue_id)
            let effectiveProgress = init.reportedProgress ?? init.systemProgress ?? 0

            // If initiative has children, parent progress is the average of child progress
            if (children.length > 0) {
                const totalChildProg = children.reduce((acc, child) => acc + (child.effectiveProgress || 0), 0)
                effectiveProgress = Math.round(totalChildProg / children.length)
            }

            return {
                ...init,
                systemProgress: effectiveProgress, // Override to ensure UI consistency
                effectiveProgress
            }
        })
    }, [data, projects])

    const filteredInitiatives = useMemo(() => {
        if (!selectedPhaseId) return initiatives;
        const phase = PHASES.find(p => p.id === selectedPhaseId);
        if (!phase) return initiatives;

        // Special rule: All current initiatives belong to Phase 1
        if (selectedPhaseId.includes('Phase 1')) {
            return initiatives;
        }

        // For other phases, we might use dates or other logic, but for now they are empty
        const pStart = new Date(phase.start);
        const pEnd = new Date(phase.end);
        return initiatives.filter(i => {
            if (!i.due_date) return false;
            const dDate = new Date(i.due_date);
            return dDate >= pStart && dDate <= pEnd;
        });
    }, [initiatives, selectedPhaseId]);

    const timelineMonths = useMemo(() => {
        const tlStart = parseISO(PHASES[0].start);
        const tlEnd = parseISO(PHASES[PHASES.length - 1].end);
        const months = [];
        const curr = new Date(tlStart.getFullYear(), tlStart.getMonth(), 1);

        while (curr <= tlEnd) {
            months.push(new Date(curr));
            curr.setMonth(curr.getMonth() + 1);
        }
        return months;
    }, []);

    const getBarStyle = useCallback((startStr: string | null, dueStr: string | null) => {
        if (!startStr || !dueStr || timelineMonths.length === 0) return null;
        const s = parseISO(startStr).getTime();
        const e = parseISO(dueStr).getTime();

        const tStart = timelineMonths[0].getTime();
        const lastMonth = timelineMonths[timelineMonths.length - 1];
        const tEnd = new Date(lastMonth.getFullYear(), lastMonth.getMonth() + 1, 0, 23, 59, 59).getTime(); // Last day of last month

        const total = tEnd - tStart;

        const barStart = Math.max(tStart, s);
        const barEnd = Math.min(tEnd, e);

        if (barEnd <= barStart) return null;

        const left = ((barStart - tStart) / total) * 100;
        const width = ((barEnd - barStart) / total) * 100;

        return { left: `${left}%`, width: `${width}%` };
    }, [timelineMonths]);

    // --- Row 1: Milestones Logic ---
    const phaseStats = useMemo(() => {
        return PHASES.map(p => {
            const pStart = new Date(p.start)
            const pEnd = new Date(p.end)

            // Special rule: All initiatives belong to Phase 1: Stabilize
            let matchedItems = [];
            if (p.id.includes('Phase 1')) {
                matchedItems = initiatives;
            } else {
                matchedItems = initiatives.filter(i => {
                    if (!i.due_date) return false;
                    const dDate = new Date(i.due_date);
                    return dDate >= pStart && dDate <= pEnd;
                })
            }

            const total = matchedItems.length
            const sumProgress = matchedItems.reduce((acc, item) => acc + (item.systemProgress || 0), 0)
            const pct = total > 0 ? Math.round(sumProgress / total) : 0

            const today = new Date()
            const isPassed = today > pEnd && pct < 100

            const pDuration = pEnd.getTime() - pStart.getTime()
            const elapsed = today.getTime() - pStart.getTime()
            const timePct = Math.max(0, Math.min(1, elapsed / pDuration))
            const isDelayed = isPassed || (today >= pStart && today <= pEnd && pct < (timePct * 80))

            return { ...p, total, pct, isDelayed }
        })
    }, [initiatives])

    const activePhaseIndex = useMemo(() => {
        const today = new Date();
        const idx = phaseStats.findIndex(p => today <= new Date(p.end));
        return idx !== -1 ? idx : phaseStats.length - 1;
    }, [phaseStats])

    const globalPct = useMemo(() => {
        const targetItems = selectedPhaseId ? filteredInitiatives : initiatives
        const total = targetItems.length
        if (total === 0) return 0
        const sumProg = targetItems.reduce((acc, i) => acc + (i.effectiveProgress || 0), 0)
        return Math.round(sumProg / total)
    }, [initiatives, filteredInitiatives, selectedPhaseId])


    // --- Actions ---
    const handleOpenModal = (project: Deliverable, kpi?: KPI) => {
        setSelectedProject(project)
        // If updating a specific KPI, pre-fill its data
        setFormData({
            weekOf: format(new Date(), 'yyyy-MM-dd'),
            percent: kpi ? kpi.progress : (project.reportedProgress || 0),
            note: kpi ? (kpi.note || '') : (project.reportedNote || ''),
            risks: kpi ? (kpi.risks || '') : (project.reportedRisks || ''),
            nextSteps: kpi ? (kpi.nextSteps || '') : (project.reportedNextSteps || ''),
            kpis: project.reportedKpis || [],
            targetKpiId: kpi ? kpi.id : null
        })
        setModalOpen(true)
    }

    const handleSaveUpdate = async () => {
        if (!selectedProject) return;
        setIsSaving(true)
        try {
            // Update the KPI list with the new data for the selected KPI (if any)
            let updatedKpis = [...formData.kpis];
            if (formData.targetKpiId) {
                updatedKpis = updatedKpis.map(k =>
                    String(k.id) === String(formData.targetKpiId)
                        ? {
                            ...k,
                            progress: formData.percent,
                            note: formData.note,
                            risks: formData.risks,
                            nextSteps: formData.nextSteps
                        }
                        : k
                );
            }

            // Also calculate overall project progress as average of KPIs
            let projectProgress = formData.percent;
            if (updatedKpis.length > 0) {
                projectProgress = Math.round(updatedKpis.reduce((acc, k) => acc + (k.progress || 0), 0) / updatedKpis.length);
            }

            const body = {
                type: 'deliverable',
                week_of: formData.weekOf,
                initiative_jira_issue_id: selectedProject.jira_issue_id,
                initiative_key: selectedProject.jira_key,
                reported_progress_pct: projectProgress,
                note: formData.note,
                risks: formData.risks,
                nextSteps: formData.nextSteps,
                kpis: updatedKpis
            }

            const res = await fetch('/api/stability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error('Failed to save update')

            setModalOpen(false)
            fetchData()
        } catch (err: unknown) {
            const message = err instanceof Error ? err.message : 'An error occurred'
            alert(message)
        } finally {
            setIsSaving(false)
        }
    }

    const handlePersistDeliverable = async (project: Deliverable, kpiList: KPI[], isSilent = false) => {
        if (!isSilent) setIsSaving(true)
        try {
            let projectProgress = project.reportedProgress || 0;
            if (kpiList.length > 0) {
                projectProgress = Math.round(kpiList.reduce((acc, k) => acc + (k.progress || 0), 0) / kpiList.length);
            }

            const body = {
                type: 'deliverable',
                week_of: format(new Date(), 'yyyy-MM-dd'),
                initiative_jira_issue_id: project.jira_issue_id,
                initiative_key: project.jira_key,
                reported_progress_pct: projectProgress,
                note: project.reportedNote || 'KPI Configuration Update',
                risks: project.reportedRisks || '',
                nextSteps: project.reportedNextSteps || '',
                kpis: kpiList
            }

            const res = await fetch('/api/stability', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body)
            })

            if (!res.ok) throw new Error('Failed to sync KPI changes')
            if (!isSilent) fetchData()
        } catch (err: unknown) {
            console.error('Persistence error:', err)
            if (!isSilent) alert('Error saving changes to server')
        } finally {
            if (!isSilent) setIsSaving(false)
        }
    }

    const renderMiniSparkline = (updates: UpdateHistory[]) => {
        if (!updates || updates.length === 0) return <div className="text-slate-300 text-[9px] italic leading-tight">No data</div>
        const data = [...updates].reverse().map(u => ({ progress: u.reported_progress_pct || 0 }))
        return (
            <div className="w-16 h-5 opacity-80">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data}>
                        <YAxis domain={[0, 100]} hide />
                        <Area type="monotone" dataKey="progress" stroke="#4f46e5" strokeWidth={1.5} fill="#4f46e5" fillOpacity={0.1} dot={{ r: 1, fill: '#4f46e5' }} isAnimationActive={false} />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        )
    }

    const renderFullWidthSparkline = (updates: UpdateHistory[]) => {
        if (!updates || updates.length === 0) return null
        const data = [...updates].reverse().map(u => ({ progress: u.reported_progress_pct || 0 }))
        return (
            <div className="absolute bottom-0 left-0 right-0 h-10 z-0 pointer-events-none opacity-50">
                <ResponsiveContainer width="100%" height="100%">
                    <AreaChart data={data} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                        <defs>
                            <linearGradient id="colorWave" x1="0" y1="0" x2="0" y2="1">
                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                            </linearGradient>
                        </defs>
                        <YAxis domain={[0, 100]} hide />
                        <Area
                            type="monotone"
                            dataKey="progress"
                            stroke="#6366f1"
                            strokeWidth={1.5}
                            fillOpacity={1}
                            fill="url(#colorWave)"
                            isAnimationActive={false}
                        />
                    </AreaChart>
                </ResponsiveContainer>
            </div>
        )
    }

    if (loading && !data) {
        return (
            <div className="flex items-center justify-center min-h-[400px]">
                <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mb-4" />
            </div>
        )
    }

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500 max-w-7xl mx-auto pb-12">
            <PhaseHeader
                icon={Server}
                title="Stability & Scalability Overview"
                description="Monitor global progress, track key initiatives, and update project milestones."
                lastSync={data?.lastSync || null}
            />

            {/* --- ROW 1: General Project Progress --- */}
            <div className="sticky top-0 z-40 bg-white/95 backdrop-blur-md rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                <div className="px-6 py-4 flex items-center w-full gap-6">
                    <div className="flex gap-4 w-full flex-grow">
                        {phaseStats.map((p, idx) => {
                            const isActive = idx === activePhaseIndex;
                            const isDelayed = p.isDelayed;
                            const pct = p.pct;
                            const isSelected = selectedPhaseId === p.id;

                            const fillColor = isDelayed ? "bg-amber-500" : "bg-emerald-500";
                            const stripeColor = isDelayed ? "#f59e0b" : "#10b981";

                            return (
                                <div key={p.id}
                                    onClick={() => setSelectedPhaseId(prev => prev === p.id ? null : p.id)}
                                    className={cn("flex-1 flex flex-col gap-2 p-1.5 rounded-lg text-left cursor-pointer transition-all border",
                                        isActive && !isSelected ? "bg-slate-50 border-transparent" : "border-transparent hover:bg-slate-50",
                                        isSelected && "bg-indigo-50 border-indigo-200 shadow-sm"
                                    )}>
                                    <div className="h-2 w-full bg-slate-200 rounded-full flex relative overflow-hidden">
                                        {pct === 100 && (
                                            <div className={"absolute inset-0 rounded-full " + fillColor}></div>
                                        )}
                                        {pct > 0 && pct < 100 && (
                                            <>
                                                <div className={"h-full relative z-10 rounded-l-full " + fillColor} style={{ width: `${pct}%` }}></div>
                                                <div className="h-full absolute inset-0 z-0 opacity-20"
                                                    style={{
                                                        backgroundImage: `repeating-linear-gradient(-45deg, transparent, transparent 4px, ${stripeColor} 4px, ${stripeColor} 6px)`,
                                                        backgroundSize: '14px 14px'
                                                    }}></div>
                                            </>
                                        )}
                                        {pct === 0 && (
                                            <div className="absolute inset-0 bg-transparent rounded-full border border-slate-300 border-dashed"></div>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {pct === 100 ? (
                                            <CheckCircle2 className={"w-4 h-4 shrink-0 " + (isDelayed ? "text-amber-500" : "text-emerald-500")} />
                                        ) : isActive ? (
                                            <Activity className="w-4 h-4 text-indigo-500 shrink-0" />
                                        ) : (
                                            <div className="w-4 h-4 rounded-full border-2 border-slate-300 shrink-0" />
                                        )}
                                        <div className="flex flex-col">
                                            <span className="text-xs font-bold text-slate-900 leading-none">{p.id}</span>
                                            <span className="text-[9px] text-slate-500 uppercase tracking-wider mt-0.5">{p.total} Initiatives</span>
                                        </div>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                    {/* Overall Progress at the end */}
                    <div className="flex flex-col items-center shrink-0 pl-4 border-l border-slate-200">
                        <span className="text-3xl font-black tracking-tighter text-indigo-600 leading-none">{globalPct}%</span>
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mt-1">Global Progress</span>
                    </div>
                </div>
            </div>

            {/* --- ROW 2: Workstream Initiatives (Gantt) --- */}
            <div className="relative z-10">
                <h3 className="text-sm font-black text-slate-400 uppercase tracking-widest mb-3 px-1">Workstream Initiatives</h3>
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-x-auto hidden-scrollbar relative">
                    <div className="min-w-[1100px] flex flex-col">

                        {/* Headers */}
                        <div className="flex sticky top-0 z-20 bg-slate-50 border-b border-slate-200">
                            <div className="w-[600px] sticky left-0 z-30 bg-slate-50 border-r border-slate-200 px-4 py-3 shrink-0 flex items-center justify-between">
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">Initiative</span>
                                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">%</span>
                            </div>
                            <div className="flex flex-1">
                                {timelineMonths.map(m => (
                                    <div key={m.getTime()} className="flex-1 border-r border-slate-200 last:border-r-0 py-3 text-center min-w-[70px]">
                                        <span className="text-[10px] font-bold text-slate-700">{format(m, 'MMM')}</span>
                                        <div className="text-[9px] text-slate-400">{format(m, 'yyyy')}</div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Rows */}
                        <div className="flex flex-col">
                            {filteredInitiatives.length === 0 ? (
                                <div className="py-8 text-center text-slate-400 italic text-sm w-full">No Workstream Initiatives found.</div>
                            ) : (
                                filteredInitiatives.map(init => {
                                    const barStyle = getBarStyle(init.start_date, init.due_date);
                                    const isExpanded = expandedInitiatives[init.jira_issue_id] || false;
                                    const childProjects = projects.filter(p => p.parent_jira_issue_id === init.jira_issue_id);

                                    return (
                                        <div key={init.jira_issue_id} className="flex flex-col border-b border-slate-100">
                                            {/* Initiative Row */}
                                            <div className="flex relative group min-h-[70px] hover:bg-slate-50 cursor-pointer overflow-hidden" onClick={(e) => {
                                                if ((e.target as HTMLElement).closest('a')) return;
                                                toggleExpandInitiative(init.jira_issue_id);
                                            }}>
                                                {/* Left Pane (Initiative) */}
                                                <div className="w-[600px] sticky left-0 z-10 bg-white group-hover:bg-slate-50 border-r border-slate-200 shrink-0 flex transition-colors overflow-hidden">
                                                    {/* Background Sparkline (Restricted to this column) */}
                                                    {renderFullWidthSparkline(init.updatesHistory)}

                                                    <div className="w-8 shrink-0 flex items-center justify-center text-slate-400 group-hover:text-indigo-600 border-r border-slate-100 relative z-10">
                                                        {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                                                    </div>
                                                    <div className="flex-1 p-3 flex flex-col justify-center relative z-10">
                                                        <div className="flex items-start justify-between gap-2 mb-1">
                                                            <div className="flex flex-col gap-0.5">
                                                                <a href={`https://prioritycommerce.atlassian.net/browse/${init.jira_key}`} target="_blank" className="font-bold text-indigo-600 hover:underline text-xs flex items-center gap-1">
                                                                    <Image src="/initiatives-icon.png" alt="Initiative" width={14} height={14} className="mr-0.5" />
                                                                    {init.jira_key}
                                                                    {init.reportedRisks && (
                                                                        <div className="relative group/risk inline-flex items-center">
                                                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 ml-1 cursor-help" />
                                                                            <div className="absolute z-50 bottom-full mb-2 hidden group-hover/risk:block w-48 p-2 bg-amber-50 text-amber-900 border border-amber-200 text-[10px] rounded shadow-xl -ml-24 left-1/2 font-normal">
                                                                                <p className="font-bold text-amber-700 mb-0.5">Active Risk</p>
                                                                                <p className="whitespace-normal break-words line-clamp-3">{init.reportedRisks}</p>
                                                                            </div>
                                                                        </div>
                                                                    )}
                                                                </a>
                                                                <p className="text-xs font-semibold text-slate-700 line-clamp-1" title={init.summary}>{init.summary}</p>
                                                            </div>

                                                            <div className="flex flex-col items-end shrink-0 gap-1 mt-0.5">
                                                                <span className="text-sm font-black text-slate-800">{init.systemProgress}%</span>
                                                            </div>
                                                        </div>
                                                        <div className="h-6 w-full" />
                                                    </div>
                                                </div>

                                                {/* Timeline Background grid (Initiative) */}
                                                <div className="flex flex-1 relative bg-slate-50/40">
                                                    {timelineMonths.map(m => (
                                                        <div key={m.getTime()} className="flex-1 border-r border-slate-100/50 min-w-[70px]" />
                                                    ))}

                                                    {/* Gantt Bar (Initiative) */}
                                                    {barStyle && (
                                                        <div
                                                            className="absolute top-[22px] h-3 rounded-full flex items-center justify-start bg-blue-500 opacity-90 shadow-[0_2px_8px_-2px_rgba(59,130,246,0.3)] overflow-hidden border border-blue-600/20 z-10"
                                                            style={{ left: barStyle.left, width: barStyle.width }}
                                                        >
                                                            <div className="absolute inset-0 bg-gradient-to-r from-blue-400 to-blue-500 opacity-50" />
                                                            {parseFloat(barStyle.width) > 5 && (
                                                                <span className="text-[9px] font-black text-white px-2 relative z-10 drop-shadow-sm leading-none">
                                                                    {init.systemProgress}%
                                                                </span>
                                                            )}
                                                        </div>
                                                    )}
                                                    {!barStyle && (
                                                        <div className="absolute inset-0 flex items-center pl-6 pointer-events-none">
                                                            <span className="text-[10px] text-slate-400 italic bg-white/60 px-2 rounded-full backdrop-blur-sm shadow-sm border border-slate-100">
                                                                TBD
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Child Projects (when Expanded) */}
                                            {isExpanded && childProjects.length > 0 && (
                                                <div className="flex flex-col bg-slate-50 border-t border-slate-100 shadow-inner">
                                                    {childProjects.map(proj => {
                                                        const pBarStyle = getBarStyle(proj.start_date, proj.due_date);
                                                        const isProjExpanded = expandedProjects[proj.jira_issue_id] || false;
                                                        return (
                                                            <div key={proj.jira_issue_id} className="flex flex-col border-b border-slate-100/50 group/proj-row relative hover:z-50">
                                                                <div className="flex relative group min-h-[60px] hover:bg-white transition-colors cursor-pointer" onClick={() => toggleExpandProject(proj.jira_issue_id)}>
                                                                    {/* Left Pane (Project) */}
                                                                    <div className="w-[600px] sticky left-0 z-10 bg-slate-50 group-hover:bg-white border-r border-slate-200 shrink-0 flex items-center pr-3 transition-colors">
                                                                        <div className="w-8 shrink-0 flex items-center justify-center border-r border-slate-100/50 self-stretch group-hover:text-indigo-600">
                                                                            {isProjExpanded ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                                                                        </div>
                                                                        <div className="flex-1 pl-4 flex items-center justify-between gap-2 overflow-visible">
                                                                            <div className="flex flex-col gap-0.5 truncate pr-2">
                                                                                <a href={`https://prioritycommerce.atlassian.net/browse/${proj.jira_key}`} target="_blank" className="font-bold text-blue-600 hover:underline text-[11px] flex items-center gap-1">
                                                                                    <Image src="/projects-icon.png" alt="Project" width={12} height={12} className="mr-0.5" />
                                                                                    {proj.jira_key}
                                                                                </a>
                                                                                <p className="text-[11px] font-semibold text-slate-600 truncate" title={proj.summary}>{proj.summary}</p>
                                                                            </div>

                                                                            <div className="flex items-center gap-3 shrink-0">
                                                                                {/* Reported Progress */}
                                                                                <div className="relative group/tooltip flex justify-center items-center">
                                                                                    <span className="text-xs font-black text-indigo-600 cursor-help border-b border-dashed border-indigo-200 w-8 text-right">
                                                                                        {proj.reportedProgress !== null ? `${proj.reportedProgress}%` : '-'}
                                                                                    </span>
                                                                                    {proj.reportedNote && (
                                                                                        <div className="absolute z-50 bottom-full mb-2 hidden group-hover/tooltip:block w-48 p-2 bg-slate-900 text-white text-[10px] rounded shadow-xl -ml-24 left-1/2 font-normal text-left">
                                                                                            <p className="font-semibold text-indigo-300 mb-0.5">{proj.reportedAt ? format(new Date(proj.reportedAt), 'MMM dd') : 'Note'}</p>
                                                                                            <p className="whitespace-normal break-words line-clamp-3">{proj.reportedNote}</p>
                                                                                        </div>
                                                                                    )}
                                                                                </div>

                                                                                {/* Risks */}
                                                                                <div className="w-5 flex justify-center">
                                                                                    {proj.reportedRisks ? (
                                                                                        <div className="relative group/risk inline-flex">
                                                                                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500 cursor-help" />
                                                                                            <div className="absolute z-50 bottom-full mb-2 hidden group-hover/risk:block w-48 p-2 bg-amber-50 text-amber-900 border border-amber-200 text-[10px] rounded shadow-xl -ml-24 left-1/2 font-normal text-left">
                                                                                                <p className="font-bold text-amber-700 mb-0.5">Active Risk</p>
                                                                                                <p className="whitespace-normal break-words line-clamp-3">{proj.reportedRisks}</p>
                                                                                            </div>
                                                                                        </div>
                                                                                    ) : (
                                                                                        <span className="w-3.5 h-3.5 block text-slate-200 text-center text-xs">-</span>
                                                                                    )}
                                                                                </div>

                                                                                {/* Mini Sparkline */}
                                                                                <div className="w-10">
                                                                                    {renderMiniSparkline(proj.updatesHistory)}
                                                                                </div>

                                                                                <div className="w-8 flex justify-end">
                                                                                </div>
                                                                            </div>
                                                                        </div>
                                                                    </div>

                                                                    {/* Timeline Background grid (Project) */}
                                                                    {!isProjExpanded && (
                                                                        <div className="flex flex-1 relative">
                                                                            {timelineMonths.map(m => (
                                                                                <div key={m.getTime()} className="flex-1 border-r border-slate-100/50 min-w-[70px]" />
                                                                            ))}

                                                                            {/* Gantt Bar (Project) */}
                                                                            {pBarStyle && (
                                                                                <div
                                                                                    className={cn(
                                                                                        "absolute top-[18px] h-2 rounded-full shadow-sm overflow-hidden",
                                                                                        proj.status_category === 'Done' ? "bg-emerald-400" : "bg-blue-400"
                                                                                    )}
                                                                                    style={{ left: pBarStyle.left, width: pBarStyle.width }}
                                                                                />
                                                                            )}
                                                                        </div>
                                                                    )}
                                                                </div>

                                                                {/* Expanded View - KPI Management */}
                                                                {isProjExpanded && (
                                                                    <div className="flex bg-white border-t border-slate-100 min-h-[220px] sticky left-0 w-full flex-col" style={{ width: '1300px' }}>
                                                                        <div className="p-6">
                                                                            <div className="flex items-center justify-between mb-6">
                                                                                <div className="flex items-center gap-3">
                                                                                    <div className="p-1 px-2.5 bg-indigo-50 border border-indigo-100 rounded-lg text-indigo-700 text-[10px] font-black uppercase tracking-widest leading-none flex items-center gap-2">
                                                                                        <ClipboardCheck className="w-3.5 h-3.5" /> Project KPIs & Deliverables
                                                                                    </div>
                                                                                    <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Configure and track specific metrics for this project</span>
                                                                                </div>
                                                                                {isAdmin && (
                                                                                    <button
                                                                                        disabled={isSaving}
                                                                                        onClick={(e) => {
                                                                                            e.stopPropagation();
                                                                                            setTargetProjectForKpi(proj);
                                                                                            setNewKpiLabel('');
                                                                                            setAddKpiModalOpen(true);
                                                                                        }}
                                                                                        className="flex items-center gap-2 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg text-[10px] font-black transition-all shadow-sm active:scale-95"
                                                                                    >
                                                                                        {isSaving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5 shadow-sm" />}
                                                                                        ADD KPI
                                                                                    </button>
                                                                                )}
                                                                            </div>

                                                                            {/* KPI Table */}
                                                                            <div className="bg-slate-50/50 border border-slate-200 rounded-xl overflow-hidden shadow-sm">
                                                                                <table className="w-full text-left border-collapse">
                                                                                    <thead className="bg-slate-100/80 border-b border-slate-200">
                                                                                        <tr>
                                                                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-[22%]">KPI Goal / Metric</th>
                                                                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-[15%]">Tracked Progress</th>
                                                                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-[12%] text-center">Tasks</th>
                                                                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-[21%]">Latest Risk Insight</th>
                                                                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-[20%]">Planned Next Step</th>
                                                                                            <th className="px-5 py-3 text-[10px] font-black text-slate-500 uppercase tracking-wider w-[10%] text-right">Update</th>
                                                                                        </tr>
                                                                                    </thead>
                                                                                    <tbody className="divide-y divide-slate-100">
                                                                                        {(proj.reportedKpis || []).length === 0 ? (
                                                                                            <tr>
                                                                                                <td colSpan={6} className="py-12 text-center">
                                                                                                    <div className="flex flex-col items-center opacity-30">
                                                                                                        <Activity className="w-10 h-10 text-slate-400 mb-2" />
                                                                                                        <p className="text-[11px] font-bold text-slate-500 italic">No KPIs defined. Add your first KPI to begin granular tracking.</p>
                                                                                                    </div>
                                                                                                </td>
                                                                                            </tr>
                                                                                        ) : (
                                                                                            (proj.reportedKpis || []).map((kpi: KPI) => (
                                                                                                <tr
                                                                                                    key={kpi.id}
                                                                                                    className="group/kpiloop hover:bg-white transition-colors cursor-pointer"
                                                                                                    onClick={() => { setSelectedKpi({ project: proj, kpi }); setKpiModalOpen(true); }}
                                                                                                >
                                                                                                    <td className="px-5 py-4">
                                                                                                        <div className="flex flex-col gap-0.5">
                                                                                                            <span className="text-[11px] font-black text-slate-800 group-hover/kpiloop:text-indigo-600 transition-colors uppercase">{kpi.label}</span>
                                                                                                            <span className="text-[9px] text-slate-400 font-bold uppercase tracking-tighter">Granular Target</span>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                    <td className="px-5 py-4">
                                                                                                        <div className="flex flex-col gap-2">
                                                                                                            <div className="flex items-center justify-between text-[11px] font-black">
                                                                                                                <span className="text-white bg-indigo-600 px-2 py-0.5 rounded-full shadow-sm min-w-[32px] text-center border border-indigo-700">
                                                                                                                    {kpi.progress}%
                                                                                                                </span>
                                                                                                                <div className="relative group/note-tip">
                                                                                                                    <History className="w-3.5 h-3.5 text-slate-300 hover:text-indigo-600 cursor-help transition-colors" />
                                                                                                                    {kpi.note && (
                                                                                                                        <div className="absolute z-[100] bottom-full mb-2 hidden group-hover/note-tip:block w-56 p-3 bg-slate-900 text-white text-[10px] rounded-xl shadow-2xl left-0 font-normal border border-slate-700">
                                                                                                                            <div className="flex items-center gap-2 mb-2 pb-2 border-b border-slate-800">
                                                                                                                                <div className="w-2 h-2 rounded-full bg-indigo-500 animate-pulse" />
                                                                                                                                <span className="font-extrabold text-indigo-400 uppercase tracking-tighter">Latest Strategic Note</span>
                                                                                                                            </div>
                                                                                                                            <p className="whitespace-normal break-words leading-relaxed italic text-slate-300 text-[11px]">"{kpi.note}"</p>
                                                                                                                        </div>
                                                                                                                    )}
                                                                                                                </div>
                                                                                                            </div>
                                                                                                            <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden shadow-inner p-[1px]">
                                                                                                                <div
                                                                                                                    className="h-full bg-gradient-to-r from-indigo-500 to-indigo-600 rounded-full transition-all duration-1000 ease-out shadow-[0_0_12px_rgba(99,102,241,0.5)]"
                                                                                                                    style={{ width: `${kpi.progress}%` }}
                                                                                                                />
                                                                                                            </div>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                    <td className="px-5 py-4">
                                                                                                        <div className="flex flex-col items-center gap-1">
                                                                                                            <div className="flex items-center gap-1.5 px-3 py-1 bg-white border border-slate-200 rounded-xl shadow-sm">
                                                                                                                <CheckSquare className={cn(
                                                                                                                    "w-3.5 h-3.5",
                                                                                                                    (kpi.tasks?.filter(t => t.completed).length || 0) === (kpi.tasks?.length || 0) && (kpi.tasks?.length || 0) > 0 ? "text-emerald-500" : "text-slate-400"
                                                                                                                )} />
                                                                                                                <span className="text-[11px] font-black text-slate-700 tracking-tighter">
                                                                                                                    {(kpi.tasks?.filter(t => t.completed).length || 0)}/{(kpi.tasks?.length || 0)}
                                                                                                                </span>
                                                                                                            </div>
                                                                                                            <span className="text-[8px] font-black text-slate-400 uppercase tracking-widest leading-none">CHECKLIST</span>
                                                                                                        </div>
                                                                                                    </td>
                                                                                                    <td className="px-5 py-4">
                                                                                                        {kpi.risks ? (
                                                                                                            <div className="flex gap-2 items-start p-2 bg-amber-50 rounded-lg border border-amber-200/50">
                                                                                                                <AlertTriangle className="w-3 h-3 text-amber-600 shrink-0 mt-0.5" />
                                                                                                                <p className="text-[10px] text-amber-900 font-bold leading-tight line-clamp-2">{kpi.risks}</p>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <span className="text-[10px] text-slate-300 italic font-bold">No active risks</span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="px-5 py-4">
                                                                                                        {kpi.nextSteps ? (
                                                                                                            <div className="flex gap-2 items-start p-2 bg-emerald-50 rounded-lg border border-emerald-200/50">
                                                                                                                <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0 mt-0.5" />
                                                                                                                <p className="text-[10px] text-emerald-900 font-bold leading-tight line-clamp-2">{kpi.nextSteps}</p>
                                                                                                            </div>
                                                                                                        ) : (
                                                                                                            <span className="text-[10px] text-slate-300 italic font-bold">No planned next steps</span>
                                                                                                        )}
                                                                                                    </td>
                                                                                                    <td className="px-5 py-4 text-right">
                                                                                                        {isAdmin && (
                                                                                                            <div className="flex items-center justify-end gap-1">
                                                                                                                <button
                                                                                                                    onClick={(e) => { e.stopPropagation(); handleOpenModal(proj, kpi); }}
                                                                                                                    className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                                                                                                                    title="Edit KPI Details"
                                                                                                                >
                                                                                                                    <Edit3 className="w-3.5 h-3.5" />
                                                                                                                </button>
                                                                                                                <button
                                                                                                                    disabled={isSaving}
                                                                                                                    onClick={async (e) => {
                                                                                                                        e.stopPropagation();
                                                                                                                        if (confirm('Delete this KPI? This will remove all associated history and tasks.')) {
                                                                                                                            const currentKpis = proj.reportedKpis || [];
                                                                                                                            const updatedKpis = currentKpis.filter(k => String(k.id) !== String(kpi.id));

                                                                                                                            // Update local state first (Optimistic)
                                                                                                                            setData(prev => {
                                                                                                                                if (!prev) return prev;
                                                                                                                                return {
                                                                                                                                    ...prev,
                                                                                                                                    deliverables: prev.deliverables.map(d =>
                                                                                                                                        d.jira_issue_id === proj.jira_issue_id ? { ...d, reportedKpis: updatedKpis } : d
                                                                                                                                    )
                                                                                                                                };
                                                                                                                            });

                                                                                                                            try {
                                                                                                                                await handlePersistDeliverable(proj, updatedKpis);
                                                                                                                            } catch (err) {
                                                                                                                                console.error("Failed to delete KPI:", err);
                                                                                                                                alert("Error deleting KPI from server. Please refresh.");
                                                                                                                            }
                                                                                                                        }
                                                                                                                    }}
                                                                                                                    className="p-2 text-slate-300 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all disabled:opacity-50"
                                                                                                                >
                                                                                                                    <Trash2 className="w-3.5 h-3.5" />
                                                                                                                </button>
                                                                                                            </div>
                                                                                                        )}
                                                                                                    </td>
                                                                                                </tr>
                                                                                            ))
                                                                                        )}
                                                                                    </tbody>
                                                                                </table>
                                                                            </div>
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </div>
                                                        )
                                                    })}
                                                </div>
                                            )}
                                        </div>
                                    )
                                })
                            )}
                        </div>
                    </div>
                </div>
            </div>



            {/* Provide Update Modal */}
            {/* KPI History & Tasks Modal */}
            <Dialog open={kpiModalOpen} onOpenChange={setKpiModalOpen}>
                <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <div className="flex items-center gap-4 mb-2">
                            <div className="p-3 bg-indigo-50 rounded-2xl text-indigo-600 shadow-sm">
                                <Activity className="w-5 h-5" />
                            </div>
                            <div className="flex-1">
                                <DialogTitle className="text-xl font-black text-slate-900 uppercase tracking-tight leading-none mb-1">
                                    {selectedKpi?.kpi.label}
                                </DialogTitle>
                                <DialogDescription className="font-bold text-slate-400 text-xs uppercase tracking-widest">
                                    KPI Performance & Task Evolution
                                </DialogDescription>
                            </div>
                            <div className="bg-emerald-50 text-emerald-700 px-3 py-1.5 rounded-xl text-xs font-black border border-emerald-100 flex items-center gap-2">
                                <Target className="w-3.5 h-3.5" />
                                {selectedKpi?.kpi.progress}% COMPLETED
                            </div>
                        </div>
                    </DialogHeader>

                    <div className="grid grid-cols-1 gap-8 py-6">
                        {/* Progress History Chart */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <TrendingUp className="w-3.5 h-3.5 text-indigo-400" /> Historical Trend
                                </div>
                                <span className="text-[9px] text-slate-400 italic font-bold">Past 12 Weeks</span>
                            </div>
                            <div className="h-[180px] w-full bg-slate-50/50 rounded-2xl border border-slate-100 p-4 shadow-inner">
                                <ResponsiveContainer width="100%" height="100%">
                                    <AreaChart data={(selectedKpi?.project.updatesHistory || []).slice().reverse().map(h => ({
                                        date: format(parseISO(h.week_of), 'MMM dd'),
                                        progress: (h.kpis || []).find(k => String(k.id) === String(selectedKpi?.kpi.id))?.progress || 0
                                    }))}>
                                        <defs>
                                            <linearGradient id="colorKpi" x1="0" y1="0" x2="0" y2="1">
                                                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.2} />
                                                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                                            </linearGradient>
                                        </defs>
                                        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                                        <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                                        <YAxis domain={[0, 100]} axisLine={false} tickLine={false} tick={{ fontSize: 9, fontWeight: 800, fill: '#94a3b8' }} />
                                        <Tooltip
                                            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)', fontSize: '10px', padding: '8px' }}
                                        />
                                        <Area type="monotone" dataKey="progress" stroke="#6366f1" strokeWidth={3} fillOpacity={1} fill="url(#colorKpi)" />
                                    </AreaChart>
                                </ResponsiveContainer>
                            </div>
                        </div>

                        {/* Task List (Checklist) */}
                        <div className="space-y-4">
                            <div className="flex items-center justify-between">
                                <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                    <CheckSquare className="w-3.5 h-3.5 text-emerald-400" /> Sub-Task Checklist
                                </div>
                                {isAdmin && (
                                    <button
                                        disabled={isSaving}
                                        onClick={() => {
                                            const label = prompt('Enter Task Description:');
                                            if (label && selectedKpi) {
                                                const newTask = { id: String(Date.now()), label, completed: false };
                                                const updatedTasks = [...(selectedKpi.kpi.tasks || []), newTask];
                                                const updatedKpi = { ...selectedKpi.kpi, tasks: updatedTasks };

                                                // Update local UI immediately
                                                setData(prev => {
                                                    if (!prev) return prev;
                                                    return {
                                                        ...prev,
                                                        deliverables: prev.deliverables.map(d => {
                                                            if (d.jira_issue_id === selectedKpi.project.jira_issue_id) {
                                                                const updatedKpis = (d.reportedKpis || []).map(k => String(k.id) === String(selectedKpi.kpi.id) ? updatedKpi : k);
                                                                return { ...d, reportedKpis: updatedKpis };
                                                            }
                                                            return d;
                                                        })
                                                    };
                                                });
                                                setSelectedKpi({ ...selectedKpi, kpi: updatedKpi });

                                                // Persist change
                                                const kpiList = (selectedKpi.project.reportedKpis || []).map(k => String(k.id) === String(selectedKpi.kpi.id) ? updatedKpi : k);
                                                handlePersistDeliverable(selectedKpi.project, kpiList, true);
                                            }
                                        }}
                                        className="text-[9px] font-black text-indigo-600 hover:text-indigo-700 disabled:opacity-50 uppercase flex items-center gap-1"
                                    >
                                        {isSaving ? <Loader2 className="w-2.5 h-2.5 animate-spin" /> : <span>+ Add Task</span>}
                                    </button>
                                )}
                            </div>
                            <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden divide-y divide-slate-100 shadow-sm">
                                {(selectedKpi?.kpi.tasks || []).length === 0 ? (
                                    <div className="p-8 text-center bg-slate-50/30">
                                        <ClipboardList className="w-6 h-6 mx-auto mb-2 text-slate-300 opacity-50" />
                                        <p className="text-[11px] font-bold text-slate-400 italic">No checklist tasks defined for this KPI.</p>
                                    </div>
                                ) : (
                                    (selectedKpi?.kpi.tasks || []).map((task) => (
                                        <div key={task.id} className="flex items-center gap-3 p-3 group/task">
                                            <button
                                                disabled={isSaving}
                                                onClick={() => {
                                                    if (!selectedKpi) return;
                                                    const updatedTasks = (selectedKpi.kpi.tasks || []).map(t => String(t.id) === String(task.id) ? { ...t, completed: !t.completed } : t);
                                                    const updatedKpi = { ...selectedKpi.kpi, tasks: updatedTasks };

                                                    setData(prev => {
                                                        if (!prev) return prev;
                                                        return {
                                                            ...prev,
                                                            deliverables: prev.deliverables.map(d => {
                                                                if (d.jira_issue_id === selectedKpi.project.jira_issue_id) {
                                                                    const updatedKpis = (d.reportedKpis || []).map(k => String(k.id) === String(selectedKpi.kpi.id) ? updatedKpi : k);
                                                                    return { ...d, reportedKpis: updatedKpis };
                                                                }
                                                                return d;
                                                            })
                                                        };
                                                    });
                                                    setSelectedKpi({ ...selectedKpi, kpi: updatedKpi });

                                                    // Persist change
                                                    const kpiList = (selectedKpi.project.reportedKpis || []).map(k => String(k.id) === String(selectedKpi.kpi.id) ? updatedKpi : k);
                                                    handlePersistDeliverable(selectedKpi.project, kpiList, true);
                                                }}
                                                className={cn(
                                                    "w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all",
                                                    task.completed ? "bg-emerald-500 border-emerald-600 text-white" : "border-slate-200 group-hover/task:border-indigo-400"
                                                )}
                                            >
                                                {task.completed && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                                            </button>
                                            <span className={cn(
                                                "text-xs font-bold transition-all",
                                                task.completed ? "text-slate-400 line-through" : "text-slate-700"
                                            )}>
                                                {task.label}
                                            </span>
                                            {isAdmin && (
                                                <button
                                                    disabled={isSaving}
                                                    onClick={() => {
                                                        if (!selectedKpi) return;
                                                        const updatedTasks = (selectedKpi.kpi.tasks || []).filter(t => String(t.id) !== String(task.id));
                                                        const updatedKpi = { ...selectedKpi.kpi, tasks: updatedTasks };

                                                        setData(prev => {
                                                            if (!prev) return prev;
                                                            return {
                                                                ...prev,
                                                                deliverables: prev.deliverables.map(d => {
                                                                    if (d.jira_issue_id === selectedKpi.project.jira_issue_id) {
                                                                        const updatedKpis = (d.reportedKpis || []).map(k => String(k.id) === String(selectedKpi.kpi.id) ? updatedKpi : k);
                                                                        return { ...d, reportedKpis: updatedKpis };
                                                                    }
                                                                    return d;
                                                                })
                                                            };
                                                        });
                                                        setSelectedKpi({ ...selectedKpi, kpi: updatedKpi });

                                                        // Persist change
                                                        const kpiList = (selectedKpi.project.reportedKpis || []).map(k => String(k.id) === String(selectedKpi.kpi.id) ? updatedKpi : k);
                                                        handlePersistDeliverable(selectedKpi.project, kpiList, true);
                                                    }}
                                                    className="ml-auto opacity-0 group-hover/task:opacity-100 p-1 text-slate-300 hover:text-red-500 transition-opacity disabled:opacity-20"
                                                >
                                                    <Trash2 className="w-3 h-3" />
                                                </button>
                                            )}
                                        </div>
                                    ))
                                )}
                            </div>
                        </div>

                        {/* Recent Notes/Risks */}
                        <div className="space-y-4">
                            <div className="text-[10px] font-black text-slate-500 uppercase tracking-widest flex items-center gap-2">
                                <History className="w-3.5 h-3.5 text-slate-400" /> Recent Evolution Logs
                            </div>
                            <div className="space-y-3">
                                {(selectedKpi?.project.updatesHistory || []).slice(0, 3).map((h, i) => {
                                    const kpiData = (h.kpis || []).find(k => String(k.id) === String(selectedKpi?.kpi.id));
                                    if (!kpiData) return null;
                                    return (
                                        <div key={i} className="p-4 bg-slate-50/50 rounded-2xl border border-slate-100 relative group/entry">
                                            <div className="flex items-center justify-between mb-2">
                                                <span className="text-[10px] font-black text-slate-400 uppercase tracking-tighter">{format(parseISO(h.week_of), 'MMM dd, yyyy')}</span>
                                                <div className="text-[10px] font-black text-indigo-600 bg-white px-2 py-0.5 rounded-full border border-indigo-100 shadow-sm">{kpiData.progress}%</div>
                                            </div>
                                            <p className="text-xs text-slate-700 font-bold italic mb-3 leading-relaxed">"{kpiData.note || 'No progress note provided.'}"</p>
                                            {(kpiData.risks || kpiData.nextSteps) && (
                                                <div className="grid grid-cols-2 gap-2 mt-2 pt-2 border-t border-slate-200/50">
                                                    {kpiData.risks && (
                                                        <div className="p-2 bg-amber-50 rounded-xl border border-amber-100">
                                                            <div className="text-[8px] font-black text-amber-600 uppercase flex items-center gap-1 mb-0.5"><AlertTriangle className="w-2.5 h-2.5" /> Risk</div>
                                                            <p className="text-[10px] text-amber-900 font-bold leading-tight">{kpiData.risks}</p>
                                                        </div>
                                                    )}
                                                    {kpiData.nextSteps && (
                                                        <div className="p-2 bg-emerald-50 rounded-xl border border-emerald-100">
                                                            <div className="text-[8px] font-black text-emerald-600 uppercase flex items-center gap-1 mb-0.5"><CheckCircle2 className="w-2.5 h-2.5" /> Plan</div>
                                                            <p className="text-[10px] text-emerald-900 font-bold leading-tight">{kpiData.nextSteps}</p>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Provide Update Modal (Enhanced for KPI) */}
            <Dialog open={modalOpen} onOpenChange={setModalOpen}>
                <DialogContent className="sm:max-w-[550px]">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-3">
                            <div className={cn(
                                "p-2 rounded-xl text-white shadow-lg",
                                formData.targetKpiId ? "bg-indigo-600 shadow-indigo-200" : "bg-blue-600 shadow-blue-200"
                            )}>
                                <Edit3 className="w-5 h-5" />
                            </div>
                            <div className="flex flex-col">
                                <span className="text-sm font-black uppercase tracking-widest text-slate-400 leading-none mb-1">
                                    {formData.targetKpiId ? 'KPI Update' : 'Project Update'}
                                </span>
                                <span className="text-lg font-black text-slate-900 leading-none">
                                    {formData.targetKpiId ? (formData.kpis.find(k => k.id === formData.targetKpiId)?.label) : selectedProject?.jira_key}
                                </span>
                            </div>
                        </DialogTitle>
                        <DialogDescription className="truncate italic">
                            {selectedProject?.summary}
                        </DialogDescription>
                    </DialogHeader>

                    <div className="space-y-5 py-4">
                        <div className="p-4 bg-slate-50/50 rounded-2xl border border-slate-200 border-dashed">
                            <div className="grid grid-cols-2 gap-4">
                                {/* Date */}
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Cycle Reference Date</label>
                                    <input
                                        type="date"
                                        value={formData.weekOf}
                                        onChange={e => setFormData({ ...formData, weekOf: e.target.value })}
                                        className="w-full p-2.5 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm"
                                    />
                                </div>
                                {/* Percentage */}
                                <div className="space-y-2">
                                    <label className="flex justify-between text-[10px] font-black text-slate-500 uppercase tracking-widest block">
                                        <span>Completion Status</span>
                                        <span className="text-indigo-600">{formData.percent}%</span>
                                    </label>
                                    <div className="px-1">
                                        <input
                                            type="range" min="0" max="100" step="5"
                                            value={formData.percent}
                                            onChange={(e) => setFormData({ ...formData, percent: parseInt(e.target.value) })}
                                            className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
                                        />
                                        <div className="flex justify-between mt-1 px-0.5">
                                            <span className="text-[8px] font-black text-slate-300">INC</span>
                                            <span className="text-[8px] font-black text-slate-300">DONE</span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Note */}
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest block">Progress Insight <span className="text-red-500">*</span></label>
                            <textarea
                                required
                                placeholder={formData.targetKpiId ? "Briefly explain what moved the needle for this KPI..." : "Overall summary of achievements this cycle..."}
                                className="w-full min-h-[90px] p-3 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-indigo-500 outline-none transition-all resize-none shadow-sm"
                                value={formData.note}
                                onChange={(e) => setFormData({ ...formData, note: e.target.value })}
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-[10px] font-black text-amber-600 uppercase tracking-widest block">
                                    <AlertTriangle className="w-3.5 h-3.5" /> High Alert Risks
                                </label>
                                <textarea
                                    placeholder="Blockers or constraints..."
                                    className="w-full min-h-[70px] p-3 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-amber-500 outline-none transition-all resize-none shadow-sm"
                                    value={formData.risks}
                                    onChange={(e) => setFormData({ ...formData, risks: e.target.value })}
                                />
                            </div>
                            <div className="space-y-2">
                                <label className="flex items-center gap-1.5 text-[10px] font-black text-emerald-600 uppercase tracking-widest block">
                                    <CheckCircle2 className="w-3.5 h-3.5" /> Planned Next Step
                                </label>
                                <textarea
                                    placeholder="Immediate roadmap..."
                                    className="w-full min-h-[70px] p-3 text-xs font-bold rounded-xl border border-slate-200 focus:ring-2 focus:ring-emerald-500 outline-none transition-all resize-none shadow-sm"
                                    value={formData.nextSteps}
                                    onChange={(e) => setFormData({ ...formData, nextSteps: e.target.value })}
                                />
                            </div>
                        </div>

                        {!formData.targetKpiId && (
                            <div className="p-4 bg-indigo-50/30 rounded-2xl border border-indigo-100/50">
                                <p className="text-[9px] font-bold text-indigo-400 uppercase tracking-widest mb-1 leading-none text-center">Note: This will contribute to overall project metrics</p>
                            </div>
                        )}
                    </div>

                    <DialogFooter className="gap-2 bg-slate-50/80 -mx-6 -mb-6 p-6 border-t border-slate-200">
                        <button onClick={() => setModalOpen(false)} className="px-5 py-2.5 rounded-xl text-xs font-black text-slate-500 hover:bg-white hover:shadow-sm transition-all uppercase tracking-widest">Discard</button>
                        <button
                            disabled={isSaving || !formData.note.trim()}
                            onClick={handleSaveUpdate}
                            className="flex items-center gap-2 bg-slate-900 hover:bg-black disabled:opacity-50 text-white px-8 py-2.5 rounded-xl text-xs font-black transition-all shadow-xl shadow-slate-200 uppercase tracking-widest"
                        >
                            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                            Commit Update
                        </button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            {/* Add KPI Modal */}
            <Dialog open={addKpiModalOpen} onOpenChange={setAddKpiModalOpen}>
                <DialogContent className="sm:max-w-[425px] bg-white rounded-3xl overflow-hidden p-0 border-none shadow-2xl">
                    <div className="bg-gradient-to-br from-indigo-600 to-indigo-800 p-6 text-white relative overflow-hidden">
                        <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-16 -mt-16 blur-2xl" />
                        <div className="relative z-10">
                            <h2 className="text-xl font-black tracking-tight mb-1 flex items-center gap-2">
                                <Plus className="w-5 h-5 text-indigo-300" />
                                Create New KPI
                            </h2>
                            <p className="text-indigo-100/80 text-xs font-medium">Define a new tracking objective for this project.</p>
                        </div>
                    </div>

                    <div className="p-6 space-y-4">
                        <div className="space-y-2">
                            <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest pl-1">Objective / Metric Name</label>
                            <input
                                autoFocus
                                type="text"
                                className="w-full bg-slate-50 border-2 border-slate-100 rounded-2xl p-4 text-sm font-bold text-slate-700 focus:outline-none focus:border-indigo-500 focus:ring-4 focus:ring-indigo-500/10 transition-all placeholder:text-slate-300"
                                placeholder="e.g. System Uptime, Deployment Frequency..."
                                value={newKpiLabel}
                                onChange={(e) => setNewKpiLabel(e.target.value)}
                                onKeyDown={(e) => {
                                    if (e.key === 'Enter' && newKpiLabel.trim()) {
                                        // Trigger save logic
                                        const btn = document.getElementById('add-kpi-submit-btn');
                                        btn?.click();
                                    }
                                }}
                            />
                        </div>

                        <div className="pt-2 flex gap-3">
                            <button
                                onClick={() => setAddKpiModalOpen(false)}
                                className="flex-1 py-3 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                id="add-kpi-submit-btn"
                                disabled={!newKpiLabel.trim() || isSaving}
                                onClick={async () => {
                                    if (!targetProjectForKpi || !newKpiLabel.trim()) return;

                                    const newId = `manual-${Date.now()}`;
                                    const newKpi: KPI = { id: newId, label: newKpiLabel.trim(), progress: 0, tasks: [] };
                                    const currentKpis = targetProjectForKpi.reportedKpis || [];
                                    const updatedKpis = [...currentKpis, newKpi];

                                    // Optimistic UI
                                    setData(prev => {
                                        if (!prev) return prev;
                                        return {
                                            ...prev,
                                            deliverables: prev.deliverables.map(d =>
                                                d.jira_issue_id === targetProjectForKpi.jira_issue_id ? { ...d, reportedKpis: updatedKpis } : d
                                            )
                                        };
                                    });

                                    setAddKpiModalOpen(false);

                                    try {
                                        await handlePersistDeliverable(targetProjectForKpi, updatedKpis);
                                    } catch (err) {
                                        console.error("Failed to persist new KPI:", err);
                                        alert("Error saving KPI. Please try again.");
                                    }
                                }}
                                className="flex-[2] py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-2xl text-[11px] font-black uppercase tracking-widest transition-all shadow-lg shadow-indigo-200 disabled:opacity-50"
                            >
                                {isSaving ? 'Creating...' : 'Create KPI'}
                            </button>
                        </div>
                    </div>
                </DialogContent>
            </Dialog>
        </div >
    )
}
