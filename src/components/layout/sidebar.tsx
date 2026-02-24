'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
    Home,
    Lightbulb,
    Compass,
    ListTodo,
    PenTool,
    Code,
    Rocket,
    FileText,
    HelpCircle,
    ChevronLeft,
    ChevronRight,
    LayoutDashboard,
    ChevronDown,
    Server
} from 'lucide-react'

const sidebarSections = [
    {
        title: 'General',
        items: [
            { name: 'Home', href: '/home', icon: Home },
        ]
    },
    {
        title: 'SDLC Phases',
        isExpandable: true,
        items: [
            { name: 'Rollout Overview', href: '/rollout-overview', icon: LayoutDashboard },
            { name: 'Phase 0 – Ideation', href: '/phase-0', icon: Lightbulb },
            { name: 'Phase 1 – Discovery', href: '/phase-1', icon: Compass },
            { name: 'Phase 2 – Prioritization', href: '/phase-2', icon: ListTodo },
            { name: 'Phase 3 – Design', href: '/phase-3', icon: PenTool },
            { name: 'Phase 4 – Dev & Testing', href: '/phase-4', icon: Code },
            { name: 'Phase 5 – Deployment', href: '/phase-5', icon: Rocket },
        ]
    },
    {
        title: 'Stability & Scalability',
        isExpandable: true,
        items: [
            { name: 'Overview', href: '/stability-overview', icon: Server },
        ]
    },
    {
        title: 'Support Documents',
        items: [
            { name: 'SDLC Guide', href: '#', icon: FileText },
            { name: 'FAQ & Help', href: '#', icon: HelpCircle },
        ]
    }
]

export function Sidebar({
    isCollapsed,
    setIsCollapsed
}: {
    isCollapsed: boolean,
    setIsCollapsed: (v: boolean) => void
}) {
    const pathname = usePathname()

    const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
        'SDLC Phases': true,
        'Stability & Scalability': true
    })

    const toggleSection = (title: string) => {
        setExpandedSections((prev: Record<string, boolean>) => ({ ...prev, [title]: !prev[title] }))
    }

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200 w-full overflow-hidden absolute inset-0 z-40">

            {/* Header / Logo Section */}
            <div className="h-16 flex items-center shrink-0 border-b border-slate-200 relative group px-4">
                <div className="flex items-center flex-1 h-full overflow-hidden">
                    {/* Logo container that cross-fades based on state */}
                    <div className={`relative flex items-center w-full transition-all duration-300 ${isCollapsed ? 'justify-center' : 'justify-start'}`}>
                        <Image
                            src="/PRTH-Logo.png"
                            alt="PRTH Logo"
                            width={28}
                            height={28}
                            className={`absolute transition-opacity duration-300 pointer-events-none object-contain ${isCollapsed ? 'opacity-100' : 'opacity-0'
                                }`}
                            priority
                        />
                        <Image
                            src="/Priority-Logo.jpeg"
                            alt="Priority Tech Logo"
                            width={120}
                            height={32}
                            className={`transition-opacity duration-300 pointer-events-none object-contain ${isCollapsed ? 'opacity-0' : 'opacity-100'
                                }`}
                            priority
                        />
                    </div>
                </div>

                {/* Collapse Toggle Button */}
                <button
                    onClick={() => setIsCollapsed(!isCollapsed)}
                    className={`absolute right-3 top-5 bg-white border border-slate-200 text-slate-500 rounded-full p-0.5 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm hidden md:flex items-center justify-center z-50 group-hover:opacity-100 ${isCollapsed ? 'opacity-100' : 'opacity-0'
                        }`}
                >
                    {isCollapsed ? (
                        <ChevronRight className="w-3.5 h-3.5" />
                    ) : (
                        <ChevronLeft className="w-3.5 h-3.5" />
                    )}
                </button>
            </div>

            {/* Main Navigation */}
            <div className="flex-1 overflow-y-auto overflow-x-hidden hide-scrollbar py-6 flex flex-col px-3">
                {sidebarSections.map((section, idx) => {
                    const isSectionExpanded = section.isExpandable ? expandedSections[section.title] : true

                    return (
                        <div key={section.title}>
                            {/* Section Header */}
                            {section.isExpandable ? (
                                <button
                                    onClick={() => toggleSection(section.title)}
                                    className={`w-full flex items-center justify-between mb-2 transition-all duration-300 overflow-hidden shrink-0 group ${isCollapsed ? 'h-0 opacity-0 my-0' : 'h-6 opacity-100 px-3 hover:bg-slate-50 rounded-md py-4'
                                        }`}
                                >
                                    <h3 className="text-[13px] font-semibold text-slate-400 group-hover:text-slate-600 uppercase tracking-wider whitespace-nowrap transition-colors">
                                        {section.title}
                                    </h3>
                                    <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${!isSectionExpanded ? '-rotate-90' : ''}`} />
                                </button>
                            ) : (
                                <div className={`mb-2 transition-all duration-300 overflow-hidden shrink-0 ${isCollapsed ? 'h-0 opacity-0 my-0' : 'h-4 opacity-100 px-3'
                                    }`}>
                                    <h3 className="text-[13px] font-semibold text-slate-400 uppercase tracking-wider whitespace-nowrap">
                                        {section.title}
                                    </h3>
                                </div>
                            )}

                            {isCollapsed && idx > 0 && <div className="h-px bg-slate-200 mt-2 mb-4 mx-3 shrink-0" />}

                            {/* Section Items */}
                            {/* In collapsed mode, we ignore the local accordion state and force show icons, otherwise they'd vanish */}
                            <div className={`flex flex-col gap-1.5 transition-all duration-300 overflow-hidden ${(!isSectionExpanded && !isCollapsed) ? 'h-0 opacity-0' : 'opacity-100'}`}>
                                {section.items.map((item) => {
                                    const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/home')

                                    return (
                                        <Link
                                            key={item.name}
                                            href={item.href}
                                            className={`group flex items-center relative rounded-md transition-all duration-200 py-2 min-h-[40px] shrink-0 ${isActive
                                                ? 'bg-slate-100 text-slate-900 font-semibold'
                                                : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 font-medium'
                                                } ${isCollapsed ? 'px-0 justify-center' : 'px-3 gap-3'}`}
                                            title={isCollapsed ? item.name : undefined}
                                        >
                                            {/* Active Left Indicator Bar */}
                                            {isActive && (
                                                <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#0b4030] rounded-r-full" />
                                            )}

                                            {/* Icon */}
                                            <item.icon className={`shrink-0 transition-colors ${isActive ? 'text-[#0b4030] w-5 h-5' : 'text-slate-400 group-hover:text-slate-600 w-[18px] h-[18px]'
                                                }`} />

                                            {/* Label */}
                                            <span className={`text-[15px] tracking-tight whitespace-nowrap transition-opacity duration-300 ${isCollapsed ? 'opacity-0 hidden' : 'opacity-100 block'
                                                }`}>
                                                {item.name}
                                            </span>
                                        </Link>
                                    )
                                })}
                            </div>
                        </div>
                    )
                })}
            </div>

            {/* Footer Section */}
            <div className="border-t border-slate-200 bg-white shrink-0">
                <div className={`p-4 flex items-center justify-center transition-all duration-300 overflow-hidden whitespace-nowrap ${isCollapsed ? 'h-16 pt-[18px]' : 'h-14 gap-2.5'
                    }`}>
                    {!isCollapsed && (
                        <span className="text-[13px] font-medium text-slate-500">Powered by</span>
                    )}
                    <Image
                        src="/EPMO-Logo.png"
                        alt="EPMO Logo"
                        width={isCollapsed ? 30 : 45} // Slightly smaller when collapsed
                        height={isCollapsed ? 12 : 18}
                        className={`transition-all duration-300 object-contain ${isCollapsed ? 'opacity-80' : 'opacity-100'
                            }`}
                    />
                </div>
            </div>

        </div>
    )
}
