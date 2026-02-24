'use client'

import { useState, useRef, useEffect } from 'react'
import { X, Play, Presentation, Route } from 'lucide-react'

interface InfoModalProps {
    open: boolean
    onClose: () => void
}

export function InfoModal({ open, onClose }: InfoModalProps) {
    const [playingVideo, setPlayingVideo] = useState<'walkthrough' | 'presentation' | null>(null)
    const overlayRef = useRef<HTMLDivElement>(null)

    // Close on Escape
    useEffect(() => {
        if (!open) return
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (playingVideo) setPlayingVideo(null)
                else onClose()
            }
        }
        document.addEventListener('keydown', handler)
        return () => document.removeEventListener('keydown', handler)
    }, [open, playingVideo, onClose])

    if (!open) return null

    // Video player view
    if (playingVideo) {
        return (
            <div className="fixed inset-0 z-[100] flex items-center justify-center">
                <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setPlayingVideo(null)} />
                <div className="relative z-10 w-full max-w-4xl mx-4 bg-black rounded-2xl overflow-hidden shadow-2xl animate-in fade-in zoom-in-95 duration-200">
                    <div className="flex items-center justify-between px-5 py-3 bg-slate-900">
                        <span className="text-sm font-medium text-white">
                            {playingVideo === 'walkthrough' ? 'Phase 0 Walkthrough' : 'Phase 0 Presentation'}
                        </span>
                        <button
                            onClick={() => setPlayingVideo(null)}
                            className="text-slate-400 hover:text-white transition-colors p-1 rounded-lg hover:bg-white/10"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    <div className="aspect-video bg-slate-950 flex items-center justify-center">
                        {/* Video placeholder — replace src with actual video paths */}
                        <video
                            controls
                            autoPlay
                            className="w-full h-full"
                            src={playingVideo === 'walkthrough'
                                ? '/videos/phase0-walkthrough.mp4'
                                : '/videos/phase0-presentation.mp4'
                            }
                        >
                            <track kind="captions" />
                            Your browser does not support the video tag.
                        </video>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center">
            {/* Overlay */}
            <div
                ref={overlayRef}
                className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                onClick={onClose}
            />

            {/* Modal */}
            <div className="relative z-10 w-full max-w-lg mx-4 bg-white rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                {/* Header */}
                <div className="flex items-center justify-between px-6 pt-6 pb-0">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-50 flex items-center justify-center">
                            <span className="text-lg">💡</span>
                        </div>
                        <h2 className="text-lg font-bold text-slate-900">Phase 0 — Ideation</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="text-slate-400 hover:text-slate-600 transition-colors p-1.5 rounded-lg hover:bg-slate-100"
                    >
                        <X className="w-4 h-4" />
                    </button>
                </div>

                {/* Content */}
                <div className="px-6 py-5">
                    <p className="text-sm text-slate-600 leading-relaxed">
                        Phase 0 is the <span className="font-semibold text-slate-800">Ideation</span> stage of the SDLC framework.
                        This is where new business product ideas are captured, evaluated, and scored for ROI potential
                        before moving into Discovery.
                    </p>
                    <div className="mt-4 space-y-2">
                        <div className="flex items-start gap-2.5">
                            <span className="text-indigo-500 mt-0.5 text-xs">●</span>
                            <p className="text-sm text-slate-500">Ideas are submitted through the BPI Jira project</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="text-indigo-500 mt-0.5 text-xs">●</span>
                            <p className="text-sm text-slate-500">Each idea is scored for ROI and assigned to a workstream</p>
                        </div>
                        <div className="flex items-start gap-2.5">
                            <span className="text-indigo-500 mt-0.5 text-xs">●</span>
                            <p className="text-sm text-slate-500">Top ideas progress to Phase 1 — Discovery for deeper analysis</p>
                        </div>
                    </div>
                </div>

                {/* Footer with video buttons */}
                <div className="px-6 pb-6 flex items-center gap-3">
                    <button
                        onClick={() => setPlayingVideo('walkthrough')}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5
                                   text-sm font-medium text-indigo-700 bg-indigo-50 hover:bg-indigo-100
                                   rounded-xl transition-all duration-200 group"
                    >
                        <Route className="w-4 h-4 text-indigo-500 group-hover:text-indigo-600" />
                        Play Walkthrough
                    </button>
                    <button
                        onClick={() => setPlayingVideo('presentation')}
                        className="flex-1 inline-flex items-center justify-center gap-2 px-4 py-2.5
                                   text-sm font-medium text-violet-700 bg-violet-50 hover:bg-violet-100
                                   rounded-xl transition-all duration-200 group"
                    >
                        <Presentation className="w-4 h-4 text-violet-500 group-hover:text-violet-600" />
                        Play Presentation
                    </button>
                </div>
            </div>
        </div>
    )
}
