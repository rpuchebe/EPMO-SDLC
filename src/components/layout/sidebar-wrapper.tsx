'use client'

import { useState, useEffect } from 'react'
import { usePathname } from 'next/navigation'
import { Sidebar } from './sidebar'

// Routes where the sidebar should start collapsed to maximise content area
const AUTO_COLLAPSE_ROUTES = ['/phase-3']

export function SidebarWrapper() {
    const pathname = usePathname()
    const [isCollapsed, setIsCollapsed] = useState(false)
    const [mounted, setMounted] = useState(false)

    // Only render after mount to prevent hydration mismatch if we later
    // persist collapsed state to localStorage
    useEffect(() => {
        setMounted(true)
    }, [])

    // Auto-collapse when navigating to routes that need full width
    useEffect(() => {
        if (AUTO_COLLAPSE_ROUTES.includes(pathname)) {
            setIsCollapsed(true)
        }
    }, [pathname])

    if (!mounted) {
        // Render a skeleton matching the default (expanded) width
        return <div className="w-64 h-full bg-white border-r border-slate-200 shrink-0 hidden md:block" />
    }

    return (
        <div
            className={`relative h-full shrink-0 transition-all duration-300 ease-in-out hidden md:block ${isCollapsed ? 'w-20' : 'w-64'
                }`}
        >
            <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        </div>
    )
}
