'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, Navigation, Plus, X, Loader2, Pencil, Trash2, Save, Check } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'
import { AddUpdateModal } from './add-update-modal'
import { createClient } from '@/utils/supabase/client'

// Sub-component for individual items to handle expand/collapse + admin edit/delete
function WeeklyUpdateItem({ item, defaultExpandedColor, dotColor, forceExpanded = false, isAdmin = false, onDelete }: { item: any, defaultExpandedColor: string, dotColor: string, forceExpanded?: boolean, isAdmin?: boolean, onDelete?: (id: string) => void }) {
    const [expanded, setExpanded] = useState(false)
    const [editing, setEditing] = useState(false)
    const [editTitle, setEditTitle] = useState('')
    const [editDesc, setEditDesc] = useState('')
    const [editBadges, setEditBadges] = useState<string[]>([])
    const [saving, setSaving] = useState(false)
    const hasDescription = item.description && item.description.trim() !== ''
    const router = useRouter()
    const supabase = createClient()

    const isExpanded = forceExpanded || expanded

    const title = item.title || item.bullet_text || item.risk_text || 'Update Item'
    const desc = item.description || (item.title ? item.bullet_text : '')

    const startEdit = (e: React.MouseEvent) => {
        e.stopPropagation()
        setEditTitle(title)
        setEditDesc(desc || '')
        setEditBadges(item.badges && Array.isArray(item.badges) ? [...item.badges] : [])
        setEditing(true)
    }

    const cancelEdit = (e: React.MouseEvent) => {
        e.stopPropagation()
        setEditing(false)
    }

    const saveEdit = async (e: React.MouseEvent) => {
        e.stopPropagation()
        setSaving(true)
        try {
            const { error } = await supabase
                .from('weekly_update_items')
                .update({
                    title: editTitle,
                    description: editDesc,
                    badges: editBadges.length > 0 ? editBadges : null,
                })
                .eq('id', item.id)
            if (error) throw error
            setEditing(false)
            router.refresh()
        } catch (err: any) {
            alert('Error saving: ' + (err.message || err))
        } finally {
            setSaving(false)
        }
    }

    const [confirmingDelete, setConfirmingDelete] = useState(false)

    const handleDelete = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (!confirmingDelete) {
            setConfirmingDelete(true)
            return
        }
        try {
            const { error } = await supabase
                .from('weekly_update_items')
                .delete()
                .eq('id', item.id)
            if (error) throw error
            if (onDelete) onDelete(item.id)
            router.refresh()
        } catch (err: any) {
            alert('Error deleting: ' + (err.message || err))
            setConfirmingDelete(false)
        }
    }

    if (editing) {
        return (
            <div className="flex gap-3 py-2 px-2 -mx-2 bg-blue-50/50 rounded-lg border border-blue-100" onClick={(e) => e.stopPropagation()}>
                <div className={`mt-2 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
                <div className="flex-1 min-w-0 space-y-2">
                    <input
                        type="text"
                        value={editTitle}
                        onChange={(e) => setEditTitle(e.target.value)}
                        className="w-full text-sm font-medium text-slate-900 bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400"
                        placeholder="Title"
                    />
                    <textarea
                        value={editDesc}
                        onChange={(e) => setEditDesc(e.target.value)}
                        className="w-full text-sm text-slate-600 bg-white border border-slate-200 rounded-md px-2 py-1 outline-none focus:ring-2 focus:ring-blue-400 resize-none min-h-[50px]"
                        placeholder="Description"
                    />
                    {/* Badge editing */}
                    <div className="flex flex-wrap items-center gap-1">
                        {editBadges.map((badge, idx) => (
                            <span key={idx} className={`inline-flex items-center gap-0.5 text-[10px] px-1.5 py-0.5 rounded font-medium ${defaultExpandedColor}`}>
                                {badge}
                                <button onClick={() => setEditBadges(b => b.filter((_, i) => i !== idx))} className="hover:text-red-600">
                                    <X className="w-2.5 h-2.5" />
                                </button>
                            </span>
                        ))}
                        <input
                            type="text"
                            placeholder="+ badge"
                            className="text-[11px] text-slate-500 bg-white border border-dashed border-slate-300 rounded-full px-2 py-0.5 w-20 focus:w-28 focus:border-blue-400 outline-none transition-all"
                            onKeyDown={(e) => {
                                if (e.key === 'Enter') {
                                    const val = (e.target as HTMLInputElement).value.trim()
                                    if (val) {
                                        setEditBadges(b => [...b, val])
                                            ; (e.target as HTMLInputElement).value = ''
                                    }
                                }
                            }}
                        />
                    </div>
                    <div className="flex items-center gap-1.5 pt-1">
                        <button onClick={saveEdit} disabled={saving} className="text-xs font-medium text-white bg-blue-600 rounded-md px-2.5 py-1 hover:bg-blue-700 disabled:opacity-50 flex items-center gap-1">
                            {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
                            Save
                        </button>
                        <button onClick={cancelEdit} className="text-xs font-medium text-slate-500 bg-white border border-slate-200 rounded-md px-2.5 py-1 hover:bg-slate-50">
                            Cancel
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="flex gap-3 py-1 group cursor-pointer" onClick={() => hasDescription && setExpanded(!expanded)}>
            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${isExpanded ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`}>
                        {title}
                    </p>
                    <div className="flex items-center gap-1.5 flex-shrink-0">
                        {/* Admin actions */}
                        {isAdmin && (
                            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button onClick={startEdit} className="p-1 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors" title="Edit">
                                    <Pencil className="w-3.5 h-3.5" />
                                </button>
                                <button
                                    onClick={handleDelete}
                                    onMouseLeave={() => setConfirmingDelete(false)}
                                    className={`p-1 rounded transition-all ${confirmingDelete ? 'text-red-600 bg-red-100 scale-110' : 'text-slate-400 hover:text-red-600 hover:bg-red-50'}`}
                                    title={confirmingDelete ? 'Click again to confirm' : 'Delete'}
                                >
                                    <Trash2 className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        )}
                        {/* Badges */}
                        {item.badges && Array.isArray(item.badges) && item.badges.length > 0 && (
                            <div className="flex items-center gap-1 flex-wrap justify-end">
                                {item.badges.map((badge: string, idx: number) => (
                                    <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${defaultExpandedColor}`}>
                                        {badge}
                                    </span>
                                ))}
                            </div>
                        )}
                    </div>
                </div>

                {hasDescription && (
                    <p className={`text-sm text-slate-500 mt-0.5 transition-all duration-200 ${isExpanded ? '' : 'line-clamp-1'}`}>
                        {desc}
                    </p>
                )}

                {/* Specific Risk Mitigation rendering if it's a risk item */}
                {item.section === 'risks' && item.mitigation_text && isExpanded && (
                    <div className="mt-2 p-2.5 bg-white/50 rounded border border-red-100/50">
                        <span className="text-xs font-bold text-slate-700 flex items-center gap-1 mb-1">
                            <div className="w-1.5 h-1.5 rotate-45 bg-slate-400"></div>
                            Mitigation:
                        </span>
                        <p className="text-sm text-slate-600 leading-tight">{item.mitigation_text}</p>
                    </div>
                )}
            </div>
        </div>
    )
}

// Reusable card component
function UpdateSectionCard({
    title, icon: Icon, items, iconColor, headerBgColor, dotColor, badgeColor, badgeBg, maxItems = 5, isExporting = false, isAdmin = false, onDeleteItem
}: {
    title: string, icon: any, items: any[], iconColor: string, headerBgColor: string, dotColor: string, badgeColor: string, badgeBg: string, maxItems?: number, isExporting?: boolean, isAdmin?: boolean, onDeleteItem?: (id: string) => void
}) {
    // Show only up to maxItems
    const displayItems = isExporting ? items : items.slice(0, maxItems)
    const hasMore = items.length > maxItems && !isExporting

    return (
        <div className={`p-4 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200`}>
            {/* Sec Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2 text-nowrap">
                    <div className={`p-1.5 rounded-md ${headerBgColor}`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    {title}
                    {items.length > 0 && (
                        <span className="text-sm font-normal text-slate-400 ml-1">
                            {items.length}
                        </span>
                    )}
                </h3>
            </div>

            {/* List */}
            <div className="flex-1 space-y-3.5 mb-4">
                {displayItems.length > 0 ? displayItems.map((item: any) => (
                    <WeeklyUpdateItem
                        key={item.id}
                        item={item}
                        defaultExpandedColor={`${badgeBg} ${badgeColor}`}
                        dotColor={dotColor}
                        forceExpanded={isExporting}
                        isAdmin={isAdmin}
                        onDelete={onDeleteItem}
                    />
                )) : <p className="text-sm text-slate-400 italic">No updates</p>}
            </div>

            {/* Footer / Show more */}
            {!isExporting && (
                <div className="mt-auto pt-4 border-t border-slate-100 flex items-center justify-between">
                    <Dialog.Root>
                        <Dialog.Trigger asChild>
                            <button
                                disabled={!hasMore}
                                className={`text-sm font-medium flex items-center gap-1 transition-colors ${hasMore ? 'text-slate-500 hover:text-slate-800' : 'text-slate-300 cursor-not-allowed'}`}
                            >
                                Show more <ChevronRight className="w-4 h-4" />
                            </button>
                        </Dialog.Trigger>
                        <Dialog.Portal>
                            <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" />
                            <Dialog.Content className="fixed left-[50%] top-[50%] z-50 grid w-full max-w-2xl translate-x-[-50%] translate-y-[-50%] gap-4 border bg-white p-6 shadow-xl sm:rounded-2xl duration-200 overflow-hidden max-h-[85vh] flex flex-col">
                                <div className="flex items-start justify-between">
                                    <Dialog.Title className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                                        <div className={`p-1.5 rounded-md ${headerBgColor}`}>
                                            <Icon className={`w-5 h-5 ${iconColor}`} />
                                        </div>
                                        {title}
                                    </Dialog.Title>
                                    <Dialog.Close className="rounded-full p-1.5 hover:bg-slate-100 transition-colors text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300">
                                        <X className="w-5 h-5" />
                                    </Dialog.Close>
                                </div>
                                <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar mt-2 space-y-4">
                                    {items.map((item: any) => (
                                        <WeeklyUpdateItem
                                            key={item.id}
                                            item={item}
                                            defaultExpandedColor={`${badgeBg} ${badgeColor}`}
                                            dotColor={dotColor}
                                            isAdmin={isAdmin}
                                            onDelete={onDeleteItem}
                                        />
                                    ))}
                                </div>
                            </Dialog.Content>
                        </Dialog.Portal>
                    </Dialog.Root>
                </div>
            )}
        </div>
    )
}

function formatWeekDateRange(startStr?: string, endStr?: string) {
    if (!startStr || !endStr) return 'Invalid Dates'

    // Adjust for JS Date parsing timezone issues if needed (append T12:00:00 to avoid UTC offset issues)
    const startDate = new Date(`${startStr}T12:00:00`)
    const endDate = new Date(`${endStr}T12:00:00`)

    const startFormatted = startDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
    const endFormatted = endDate.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })

    return `${startFormatted} - ${endFormatted}`
}

export function WeeklyUpdates({ updates, isAdmin = true }: { updates: any[], isAdmin?: boolean }) {
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isExporting, setIsExporting] = useState(false)

    const handleExportPDF = async () => {
        setIsExporting(true)

        // Short delay to allow React to render the 1-column expanded layout
        setTimeout(async () => {
            try {
                const { toPng } = await import('html-to-image');
                const { jsPDF } = await import('jspdf');

                const element = document.getElementById('weekly-update-content');
                if (!element) return;

                const current = updates[currentIndex];

                // Generate PNG using browser's native engine to support Tailwind v4 lab/oklch colors
                const dataUrl = await toPng(element, {
                    quality: 0.98,
                    pixelRatio: 2,
                    filter: (node) => {
                        // ignore nodes with data-html2canvas-ignore="true" to keep parity
                        if (node instanceof HTMLElement && node.dataset.html2canvasIgnore === 'true') {
                            return false;
                        }
                        return true;
                    }
                });

                const pdf = new jsPDF({
                    orientation: 'portrait',
                    unit: 'in',
                    format: 'letter'
                });

                const imgProps = pdf.getImageProperties(dataUrl);
                const pdfWidth = pdf.internal.pageSize.getWidth();
                const pdfHeight = pdf.internal.pageSize.getHeight();

                const margin = 0.4;
                const imgWidth = pdfWidth - (margin * 2);
                const imgHeight = (imgProps.height * imgWidth) / imgProps.width;

                let position = margin;
                pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight);
                let heightLeft = imgHeight + margin - pdfHeight;

                while (heightLeft >= 0) {
                    position -= pdfHeight; // shift the image up by exactly 1 page height
                    pdf.addPage();
                    pdf.addImage(dataUrl, 'PNG', margin, position, imgWidth, imgHeight);
                    heightLeft -= pdfHeight;
                }

                pdf.save(`Weekly_Update_${current.week_id}.pdf`);
            } catch (error) {
                console.error('Error exporting PDF:', error)
            } finally {
                setIsExporting(false)
            }
        }, 150)
    }

    if (!updates || updates.length === 0) {
        return (
            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden mb-8 p-6 text-center text-slate-500">
                No update recorded.
            </div>
        )
    }

    const currentUpdate = updates[currentIndex]
    const items = currentUpdate.items || []

    const progress = items.filter((i: any) => i.section === 'progress')
    const changes = items.filter((i: any) => i.section === 'changes')
    const risks = items.filter((i: any) => i.section === 'risks')
    const next = items.filter((i: any) => i.section === 'next')

    return (
        <div id="weekly-update-content" className="mb-10 w-full animate-in fade-in duration-500">
            {/* Header Area */}
            {/* Header Area */}
            <div className="mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="w-full md:w-1/3 flex justify-start">
                    <h2 className="text-2xl font-bold text-slate-900 flex items-center">
                        Weekly Updates
                    </h2>
                </div>

                <div className="w-full md:w-1/3 flex justify-center">
                    {/* Date Navigator */}
                    <div className="flex items-center bg-white border border-slate-200 rounded-lg shadow-sm w-fit">
                        <button
                            data-html2canvas-ignore="true"
                            onClick={() => setCurrentIndex(Math.min(currentIndex + 1, updates.length - 1))}
                            disabled={currentIndex === updates.length - 1}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-l-lg disabled:opacity-30 transition-colors border-r border-slate-100"
                        >
                            <ChevronLeft className="w-4 h-4" />
                        </button>
                        <div className="px-3 py-1 text-sm font-semibold text-slate-800 flex items-center gap-1.5 whitespace-nowrap">
                            {formatWeekDateRange(currentUpdate.start_date, currentUpdate.end_date)}
                            <span className="text-slate-400 font-normal">({currentUpdate.week_id})</span>
                        </div>
                        <button
                            data-html2canvas-ignore="true"
                            onClick={() => setCurrentIndex(Math.max(currentIndex - 1, 0))}
                            disabled={currentIndex === 0}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-r-lg disabled:opacity-30 transition-colors border-l border-slate-100"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div data-html2canvas-ignore="true" className="w-full md:w-1/3 flex justify-end items-center gap-2">
                    {currentUpdate && <AddUpdateModal updates={updates} defaultWeeklyUpdateId={currentUpdate.id} />}
                    <button
                        onClick={handleExportPDF}
                        disabled={isExporting}
                        className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 disabled:opacity-50 transition-colors flex items-center gap-2 shadow-sm"
                    >
                        {isExporting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Navigation className="w-4 h-4" />}
                        {isExporting ? 'Exporting...' : 'Export PDF'}
                    </button>
                </div>
            </div>

            {/* 4 Cards Grid */}
            <div className={isExporting ? "flex flex-col gap-4 items-start" : "grid grid-cols-1 md:grid-cols-2 gap-4 items-start"}>
                <div className="space-y-4 w-full">
                    <UpdateSectionCard
                        title="Progress & Accomplishments"
                        icon={CheckCircle2}
                        items={progress}
                        iconColor="text-emerald-600"
                        headerBgColor="bg-emerald-100/50"
                        dotColor="bg-emerald-500"
                        badgeColor="text-emerald-700"
                        badgeBg="bg-emerald-50"
                        isExporting={isExporting}
                        isAdmin={isAdmin}
                    />

                    <UpdateSectionCard
                        title="Risks & Watchouts (With Mitigation)"
                        icon={AlertTriangle}
                        items={risks}
                        iconColor="text-amber-600"
                        headerBgColor="bg-amber-100/50"
                        dotColor="bg-amber-500"
                        badgeColor="text-amber-800"
                        badgeBg="bg-amber-100/50"
                        isExporting={isExporting}
                        isAdmin={isAdmin}
                    />
                </div>

                <div className="space-y-4 w-full">
                    <UpdateSectionCard
                        title="What Changed This Week"
                        icon={TrendingUp} /* using a generic icon that looks somewhat like changes */
                        items={changes}
                        iconColor="text-blue-500"
                        headerBgColor="bg-blue-50"
                        dotColor="bg-blue-500"
                        badgeColor="text-slate-500"
                        badgeBg="bg-slate-100"
                        isExporting={isExporting}
                        isAdmin={isAdmin}
                    />

                    <UpdateSectionCard
                        title="What's Next / Leadership Line of Sight"
                        icon={Navigation}
                        items={next}
                        iconColor="text-indigo-500"
                        headerBgColor="bg-indigo-50"
                        dotColor="bg-indigo-500"
                        badgeColor="text-slate-500"
                        badgeBg="bg-slate-100"
                        isExporting={isExporting}
                        isAdmin={isAdmin}
                    />
                </div>
            </div>
        </div>
    )
}
