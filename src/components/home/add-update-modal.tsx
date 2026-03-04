'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import * as Dialog from '@radix-ui/react-dialog'
import { Plus, X, Trash2, Save, FileText, CheckCircle2 } from 'lucide-react'
import { createClient } from '@/utils/supabase/client'

type Section = 'progress' | 'risks' | 'changes' | 'next'

interface ParsedItem {
    id: string
    section: Section
    title: string
    description: string
    badges: string[]
}

interface WeekOption {
    id: string
    week_id: string
    start_date?: string
    end_date?: string
}

export function AddUpdateModal({ updates, defaultWeeklyUpdateId }: { updates: WeekOption[], defaultWeeklyUpdateId: string }) {
    const [open, setOpen] = useState(false)
    const [selectedWeekId, setSelectedWeekId] = useState(defaultWeeklyUpdateId)
    const [text, setText] = useState('')
    const [parsedItems, setParsedItems] = useState<ParsedItem[]>([])
    const [isSubmitting, setIsSubmitting] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const router = useRouter()
    const supabase = createClient()

    const parseText = (rawText: string) => {
        const lines = rawText.split('\n')
        const items: ParsedItem[] = []
        let currentSection: Section = 'progress' // default

        let currentItemText = ''

        const commitCurrentItem = () => {
            if (!currentItemText) return

            // Clean up list bullets
            const cleanedText = currentItemText.replace(/^[\*\-\•]\s*/, '').trim()

            // Split by first hyphen
            const hyphenMatch = cleanedText.match(/ - /)
            let title = cleanedText
            let description = ''

            if (hyphenMatch && hyphenMatch.index !== undefined) {
                title = cleanedText.substring(0, hyphenMatch.index).trim()
                description = cleanedText.substring(hyphenMatch.index + 3).trim()
            } else {
                const firstHyphen = cleanedText.indexOf('-')
                // Only split on hyphen if it's near the beginning to avoid splitting mid-sentence hyphenated words
                if (firstHyphen !== -1 && firstHyphen < 100) {
                    title = cleanedText.substring(0, firstHyphen).trim()
                    description = cleanedText.substring(firstHyphen + 1).trim()
                }
            }

            if (title || description) {
                items.push({
                    id: Math.random().toString(36).substring(7),
                    section: currentSection,
                    title,
                    description,
                    badges: []
                })
            }
            currentItemText = ''
        }

        for (const line of lines) {
            const trimmed = line.trim()
            if (!trimmed) {
                commitCurrentItem()
                continue
            }

            const lower = trimmed.toLowerCase()

            // Detect headers
            if (lower.includes('progress') || lower.includes('accomplishment')) {
                commitCurrentItem()
                currentSection = 'progress'
                continue
            } else if (lower.includes('risk') || lower.includes('watchout')) {
                commitCurrentItem()
                currentSection = 'risks'
                continue
            } else if (lower.includes('change')) {
                commitCurrentItem()
                currentSection = 'changes'
                continue
            } else if (lower.includes('next') || lower.includes('leadership')) {
                commitCurrentItem()
                currentSection = 'next'
                continue
            }

            // A line is definitively a new point if:
            // 1. It starts with a bullet character (*, -, •) AND is not a mid-sentence hyphen. To be safe, check for bullet followed by space.
            const startsWithBullet = /^[\*\-\•]\s/.test(trimmed);

            // 2. Or, if it contains a title/description hyphen separator " - " and doesn't look like a mid-sentence wrap.
            const hasHyphenSplit = trimmed.includes(' - ') || trimmed.includes(' \u2013 ');

            // A mid sentence wrap typically starts with a lowercase letter. A new point typically starts with an uppercase letter.
            const startsWithUpper = /^[A-Z0-9]/.test(trimmed);

            // If the current item text already ended with a period, then this uppercase line is definitively a new point.
            // OR if currentItemText has no period, but is quite long, and this starts with upper + has a split, it's a new point.
            const previousEndedWithPeriod = currentItemText.trim().endsWith('.');

            const isDefiniteNewPoint = startsWithBullet ||
                (!startsWithBullet && hasHyphenSplit && startsWithUpper && (!currentItemText || previousEndedWithPeriod || currentItemText.length > 30));


            if (isDefiniteNewPoint && currentItemText) {
                commitCurrentItem()
            }

            currentItemText += (currentItemText ? ' ' : '') + trimmed
        }

        // Commit any remaining
        commitCurrentItem()

        setParsedItems(items)
    }

    const handleTextChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setText(e.target.value)
        parseText(e.target.value)
    }

    const removeItem = (id: string) => {
        setParsedItems(items => items.filter(i => i.id !== id))
    }

    const updateItem = (id: string, field: keyof ParsedItem, value: string) => {
        setParsedItems(items => items.map(i => i.id === id ? { ...i, [field]: value } : i))
    }

    const addBadge = (id: string, badge: string) => {
        if (!badge.trim()) return
        setParsedItems(items => items.map(i => i.id === id ? { ...i, badges: [...i.badges, badge.trim()] } : i))
    }

    const removeBadge = (id: string, badgeIndex: number) => {
        setParsedItems(items => items.map(i => i.id === id ? { ...i, badges: i.badges.filter((_, idx) => idx !== badgeIndex) } : i))
    }

    const validateItems = () => {
        if (parsedItems.length === 0) return 'No items to save.'
        if (parsedItems.some(item => !item.title)) return 'Some items are missing a title.'
        return null
    }

    const handleSubmit = async () => {
        setError(null)
        const validationError = validateItems()
        if (validationError) {
            setError(validationError)
            return
        }

        setIsSubmitting(true)
        try {
            // Get max order_index for the current update
            const { data: existingItems } = await supabase
                .from('weekly_update_items')
                .select('order_index')
                .eq('weekly_update_id', selectedWeekId)
                .order('order_index', { ascending: false })
                .limit(1)

            let startingIndex = (existingItems && existingItems.length > 0) ? (existingItems[0].order_index || 0) + 1 : 1

            const itemsToInsert = parsedItems.map((item, idx) => ({
                weekly_update_id: selectedWeekId,
                section: item.section,
                title: item.title,
                description: item.description,
                badges: item.badges.length > 0 ? item.badges : null,
                order_index: startingIndex + idx
            }))

            const { error: insertError } = await supabase
                .from('weekly_update_items')
                .insert(itemsToInsert)

            if (insertError) throw insertError

            // Success
            setOpen(false)
            setText('')
            setParsedItems([])
            router.refresh() // Refresh page to show new items
        } catch (err: any) {
            setError(err.message || 'Failed to save items.')
        } finally {
            setIsSubmitting(false)
        }
    }

    return (
        <Dialog.Root open={open} onOpenChange={setOpen}>
            <Dialog.Trigger asChild>
                <button className="px-3 py-1.5 text-sm font-medium text-white bg-slate-900 border border-slate-900 rounded-lg hover:bg-slate-800 transition-colors flex items-center gap-2 shadow-sm">
                    <Plus className="w-4 h-4" />
                    Add update
                </button>
            </Dialog.Trigger>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 transition-opacity" />
                <Dialog.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-4xl translate-x-[-50%] translate-y-[-50%] gap-0 border bg-white shadow-xl sm:rounded-2xl duration-200 overflow-y-auto max-h-[90vh] flex flex-col">

                    {/* Header */}
                    <div className="flex items-center justify-between p-6 border-b border-slate-100 bg-slate-50/50">
                        <Dialog.Title className="text-lg font-semibold text-slate-900 flex items-center gap-2">
                            <div className="p-1.5 rounded-md bg-blue-100/50 text-blue-600">
                                <FileText className="w-5 h-5" />
                            </div>
                            Add Items to
                            <select
                                value={selectedWeekId}
                                onChange={(e) => setSelectedWeekId(e.target.value)}
                                className="text-sm font-semibold text-slate-800 bg-white border border-slate-200 rounded-lg px-2.5 py-1 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none shadow-sm"
                            >
                                {updates.map((u) => (
                                    <option key={u.id} value={u.id}>
                                        {u.week_id}{u.start_date ? ` (${new Date(u.start_date + 'T12:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })})` : ''}
                                    </option>
                                ))}
                            </select>
                        </Dialog.Title>
                        <Dialog.Close className="rounded-full p-1.5 hover:bg-slate-200 transition-colors text-slate-500 focus:outline-none focus:ring-2 focus:ring-slate-300">
                            <X className="w-5 h-5" />
                        </Dialog.Close>
                    </div>

                    <div className="flex flex-col md:flex-row flex-1 overflow-hidden min-h-[400px]">
                        {/* Left Side: Text Area */}
                        <div className="w-full md:w-1/2 p-6 border-b md:border-b-0 md:border-r border-slate-100 flex flex-col gap-3">
                            <div>
                                <h3 className="text-sm font-semibold text-slate-800 mb-1">Paste Raw Text</h3>
                                <p className="text-xs text-slate-500">Paste your weekly update text here. We'll automatically parse it into sections, titles, and descriptions.</p>
                            </div>
                            <textarea
                                className="flex-1 w-full p-3 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none resize-none"
                                placeholder={`Progress & Accomplishments\n* First item - description of first item.\n* Second item - description.\n\nRisks & Watchouts\n* Important risk - detailed explanation of the risk.`}
                                value={text}
                                onChange={handleTextChange}
                            />
                        </div>

                        {/* Right Side: Preview */}
                        <div className="w-full md:w-1/2 p-6 flex flex-col bg-white overflow-hidden">
                            <div className="mb-4">
                                <h3 className="text-sm font-semibold text-slate-800 flex items-center gap-2 mb-1">
                                    Preview <span className="bg-slate-100 text-slate-600 px-2 py-0.5 rounded-full text-xs">{parsedItems.length} items</span>
                                </h3>
                                <p className="text-xs text-slate-500">Review parsed entries. You can change the section, add badges, or remove items.</p>
                            </div>

                            <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                                {parsedItems.length === 0 ? (
                                    <div className="h-full flex flex-col items-center justify-center text-slate-400 gap-2 border-2 border-dashed border-slate-100 rounded-xl p-8">
                                        <CheckCircle2 className="w-8 h-8 text-slate-200" />
                                        <p className="text-sm text-center">Paste text on the left to see parsed items here.</p>
                                    </div>
                                ) : (
                                    parsedItems.map((item) => (
                                        <div key={item.id} className="p-3 bg-white border border-slate-200 rounded-lg shadow-sm group">
                                            <div className="flex items-start justify-between gap-2 mb-2">
                                                <select
                                                    value={item.section}
                                                    onChange={(e) => updateItem(item.id, 'section', e.target.value as Section)}
                                                    className="text-xs font-medium text-slate-700 bg-slate-100 border-none rounded py-1 px-2 cursor-pointer focus:ring-2 focus:ring-blue-500 outline-none"
                                                >
                                                    <option value="progress">Progress</option>
                                                    <option value="risks">Risks</option>
                                                    <option value="changes">Changes</option>
                                                    <option value="next">Next</option>
                                                </select>
                                                <button
                                                    onClick={() => removeItem(item.id)}
                                                    className="p-1 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded transition-colors opacity-0 group-hover:opacity-100"
                                                    title="Remove item"
                                                >
                                                    <Trash2 className="w-4 h-4" />
                                                </button>
                                            </div>
                                            <p className="text-sm font-medium text-slate-900 px-1 py-0.5 mb-0.5">{item.title}</p>
                                            {item.description && (
                                                <p className="text-sm text-slate-500 px-1 py-0.5 line-clamp-2">{item.description}</p>
                                            )}
                                            {/* Badges */}
                                            <div className="flex flex-wrap items-center gap-1.5 mt-2 px-1">
                                                {item.badges.map((badge, idx) => (
                                                    <span key={idx} className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-full font-medium bg-blue-50 text-blue-700">
                                                        {badge}
                                                        <button onClick={() => removeBadge(item.id, idx)} className="hover:text-red-500 transition-colors">
                                                            <X className="w-3 h-3" />
                                                        </button>
                                                    </span>
                                                ))}
                                                <input
                                                    type="text"
                                                    placeholder="+ badge"
                                                    className="text-xs text-slate-500 bg-transparent border border-dashed border-slate-200 rounded-full px-2 py-0.5 w-20 focus:w-28 focus:border-blue-400 outline-none transition-all"
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            addBadge(item.id, (e.target as HTMLInputElement).value)
                                                                ; (e.target as HTMLInputElement).value = ''
                                                        }
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ))
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="mt-4 pt-4 border-t border-slate-100 flex items-center justify-between">
                                <div className="text-sm text-red-500 font-medium">
                                    {error}
                                </div>
                                <div className="flex gap-2">
                                    <Dialog.Close asChild>
                                        <button className="px-4 py-2 text-sm font-medium text-slate-600 bg-white border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                                            Cancel
                                        </button>
                                    </Dialog.Close>
                                    <button
                                        onClick={handleSubmit}
                                        disabled={isSubmitting || parsedItems.length === 0}
                                        className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-blue-600 rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        {isSubmitting ? (
                                            <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                        ) : (
                                            <Save className="w-4 h-4" />
                                        )}
                                        Save {parsedItems.length} items
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    )
}
