'use client'

import { useState } from 'react'
import { ChevronLeft, ChevronRight, AlertTriangle, CheckCircle2, TrendingUp, Navigation, Plus, X } from 'lucide-react'
import * as Dialog from '@radix-ui/react-dialog'

// Sub-component for individual items to handle expand/collapse
function WeeklyUpdateItem({ item, defaultExpandedColor, dotColor }: { item: any, defaultExpandedColor: string, dotColor: string }) {
    const [expanded, setExpanded] = useState(false)
    const hasDescription = item.description && item.description.trim() !== ''

    // Fallbacks just in case the db migration wasn't perfectly applied to all items yet
    const title = item.title || item.bullet_text || item.risk_text || 'Update Item'
    const desc = item.description || (item.title ? item.bullet_text : '')

    return (
        <div className="flex gap-3 py-1 group cursor-pointer" onClick={() => hasDescription && setExpanded(!expanded)}>
            <div className={`mt-1.5 w-2 h-2 rounded-full flex-shrink-0 ${dotColor}`} />
            <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                    <p className={`text-sm font-medium ${expanded ? 'text-slate-900' : 'text-slate-700 group-hover:text-slate-900'} transition-colors`}>
                        {title}
                    </p>
                    {/* Render Badges if present */}
                    {item.badges && Array.isArray(item.badges) && item.badges.length > 0 && (
                        <div className="flex items-center gap-1.5 flex-wrap justify-end">
                            {item.badges.map((badge: string, idx: number) => (
                                <span key={idx} className={`text-[10px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${defaultExpandedColor}`}>
                                    {badge}
                                </span>
                            ))}
                        </div>
                    )}
                </div>

                {hasDescription && (
                    <p className={`text-sm text-slate-500 mt-0.5 transition-all duration-200 ${expanded ? '' : 'line-clamp-1'}`}>
                        {desc}
                    </p>
                )}

                {/* Specific Risk Mitigation rendering if it's a risk item */}
                {item.section === 'risks' && item.mitigation_text && expanded && (
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
    title, icon: Icon, items, iconColor, headerBgColor, dotColor, badgeColor, badgeBg, maxItems = 5
}: {
    title: string, icon: any, items: any[], iconColor: string, headerBgColor: string, dotColor: string, badgeColor: string, badgeBg: string, maxItems?: number
}) {
    // Show only up to maxItems
    const displayItems = items.slice(0, maxItems)
    const hasMore = items.length > maxItems

    return (
        <div className={`p-4 flex flex-col bg-white rounded-xl shadow-sm border border-slate-200`}>
            {/* Sec Header */}
            <div className="flex items-center justify-between mb-4">
                <h3 className="text-base font-semibold text-slate-900 flex items-center gap-2">
                    <div className={`p-1.5 rounded-md ${headerBgColor}`}>
                        <Icon className={`w-4 h-4 ${iconColor}`} />
                    </div>
                    {title}
                </h3>
                {items.length > 0 && (
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeBg} ${badgeColor}`}>
                        {items.length} Items
                    </span>
                )}
            </div>

            {/* List */}
            <div className="flex-1 space-y-3.5 mb-4">
                {displayItems.length > 0 ? displayItems.map((item: any) => (
                    <WeeklyUpdateItem
                        key={item.id}
                        item={item}
                        defaultExpandedColor={`${badgeBg} ${badgeColor}`}
                        dotColor={dotColor}
                    />
                )) : <p className="text-sm text-slate-400 italic">No updates</p>}
            </div>

            {/* Footer / Show more */}
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
                                    />
                                ))}
                            </div>
                        </Dialog.Content>
                    </Dialog.Portal>
                </Dialog.Root>
            </div>
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

export function WeeklyUpdates({ updates }: { updates: any[] }) {
    const [currentIndex, setCurrentIndex] = useState(0)

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
        <div className="mb-10 w-full animate-in fade-in duration-500">
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
                            onClick={() => setCurrentIndex(Math.max(currentIndex - 1, 0))}
                            disabled={currentIndex === 0}
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-50 rounded-r-lg disabled:opacity-30 transition-colors border-l border-slate-100"
                        >
                            <ChevronRight className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                <div className="w-full md:w-1/3 flex justify-end items-center gap-2">
                    <button className="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 border border-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm">
                        <Plus className="w-4 h-4" />
                        Add update
                    </button>
                    <button className="px-3 py-1.5 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors flex items-center gap-2 shadow-sm">
                        <Navigation className="w-4 h-4" />
                        Export PDF
                    </button>
                </div>
            </div>

            {/* 4 Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 items-start">
                <div className="space-y-4">
                    <UpdateSectionCard
                        title="Progress & Accomplishments"
                        icon={CheckCircle2}
                        items={progress}
                        iconColor="text-emerald-600"
                        headerBgColor="bg-emerald-100/50"
                        dotColor="bg-emerald-500"
                        badgeColor="text-emerald-700"
                        badgeBg="bg-emerald-50"
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
                    />
                </div>

                <div className="space-y-4">
                    <UpdateSectionCard
                        title="What Changed This Week"
                        icon={TrendingUp} /* using a generic icon that looks somewhat like changes */
                        items={changes}
                        iconColor="text-blue-500"
                        headerBgColor="bg-blue-50"
                        dotColor="bg-blue-500"
                        badgeColor="text-slate-500"
                        badgeBg="bg-slate-100"
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
                    />
                </div>
            </div>
        </div>
    )
}
