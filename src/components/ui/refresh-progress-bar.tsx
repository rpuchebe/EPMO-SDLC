'use client'

import React, { useState, useEffect } from 'react'

export function RefreshProgressBar({ duration = 80000 }: { duration?: number }) {
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        const startTime = Date.now()

        const interval = setInterval(() => {
            const elapsed = Date.now() - startTime
            const nextProgress = Math.min(99, (elapsed / duration) * 100)
            setProgress(nextProgress)
        }, 200)

        return () => clearInterval(interval)
    }, [duration])

    return (
        <div className="absolute top-full left-0 w-full z-50 animate-in fade-in duration-300">
            <div className="h-1 w-full bg-slate-100/50 backdrop-blur-sm relative overflow-hidden">
                <div
                    className="h-full bg-gradient-to-r from-indigo-500 via-violet-500 to-indigo-500 bg-[length:200%_100%] animate-shimmer rounded-r-full shadow-[0_0_10px_rgba(99,102,241,0.5)] transition-all duration-500 ease-out"
                    style={{ width: `${progress}%` }}
                />
            </div>
            <div className="bg-white/90 backdrop-blur-md border border-slate-200 border-t-0 rounded-b-lg px-3 py-1.5 flex items-center gap-3 shadow-sm mx-auto w-fit -mt-[1px]">
                <div className="flex items-center gap-1.5">
                    <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse" />
                    <span className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest whitespace-nowrap">
                        Refreshing Dashboard Data • {Math.round(progress)}%
                    </span>
                </div>
            </div>
        </div>
    )
}
