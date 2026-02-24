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
        icon: Home,
        items: [
            { name: 'Home', href: '/home' },
        ]
    },
    {
        title: 'SDLC Phases',
        isExpandable: true,
        icon: LayoutDashboard,
        items: [
            { name: 'Rollout Overview', href: '/rollout-overview' },
            { name: 'Phase 0 – Ideation', href: '/phase-0' },
            { name: 'Phase 1 – Discovery', href: '/phase-1' },
            { name: 'Phase 2 – Prioritization', href: '/phase-2' },
            { name: 'Phase 3 – Design', href: '/phase-3' },
            { name: 'Phase 4 – Dev & Testing', href: '/phase-4' },
            { name: 'Phase 5 – Deployment', href: '/phase-5' },
        ]
    },
    {
        title: 'Stability & Scalability',
        isExpandable: true,
        icon: Server,
        items: [
            { name: 'Overview', href: '/stability-overview' },
        ]
    },
    {
        title: 'Support Documents',
        icon: FileText,
        items: [
            { name: 'SDLC Guide', href: '#' },
            { name: 'FAQ & Help', href: '#' },
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
        <div className={`flex flex-col h-full bg-white border-r border-slate-200 w-full absolute inset-0 z-40 ${isCollapsed ? 'overflow-visible' : 'overflow-hidden'}`}>

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
                    className={`absolute top-5 bg-white border border-slate-200 text-slate-500 rounded-full p-0.5 hover:bg-slate-50 hover:text-slate-800 transition-colors shadow-sm hidden md:flex items-center justify-center z-50 group-hover:opacity-100 ${isCollapsed ? 'right-[-12px] opacity-100' : 'right-3 opacity-0'
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
            <div className={`flex-1 hide-scrollbar py-6 flex flex-col px-3 ${isCollapsed ? 'overflow-visible' : 'overflow-y-auto overflow-x-hidden'}`}>
                {sidebarSections.map((section, idx) => {
                    const isSectionExpanded = section.isExpandable ? expandedSections[section.title] : true
                    const isSectionActive = section.items.some(item => pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/home'))

                    return (
                        <div key={section.title} className={isCollapsed ? "relative group/section flex flex-col items-center w-full" : ""}>
                            {/* COLLAPSED STATE */}
                            {isCollapsed ? (
                                <>
                                    <div
                                        className={`w-10 h-10 mb-2 rounded-[14px] flex items-center justify-center transition-all duration-200 cursor-pointer ${isSectionActive
                                            ? 'bg-slate-900 text-white shadow-sm'
                                            : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900'
                                            }`}
                                    >
                                        {section.icon && <section.icon className="w-5 h-5 pointer-events-none" />}
                                    </div>

                                    {/* Flyout Menu */}
                                    <div className="absolute left-[52px] top-0 hidden group-hover/section:flex flex-col bg-white border border-slate-200 shadow-sm rounded-xl min-w-[200px] py-1.5 z-50">
                                        <div className="px-3 py-2 border-b border-slate-100 mb-1">
                                            <span className="text-[12px] font-bold text-slate-400 uppercase tracking-wider">{section.title}</span>
                                        </div>
                                        {section.items.map(item => {
                                            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/home')
                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    className={`mx-1.5 px-3 py-2 text-[14px] rounded-lg transition-colors my-0.5 ${isActive
                                                        ? 'bg-slate-100/80 text-slate-900 font-semibold'
                                                        : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                                                        }`}
                                                >
                                                    {item.name}
                                                </Link>
                                            )
                                        })}
                                    </div>

                                    {/* Divider */}
                                    {idx < sidebarSections.length - 1 && <div className="w-8 h-px bg-slate-200 my-2 shrink-0" />}
                                </>
                            ) : (
                                <>
                                    {/* EXPANDED STATE */}
                                    {/* Section Header */}
                                    {section.isExpandable ? (
                                        <button
                                            onClick={() => toggleSection(section.title)}
                                            className="w-full flex items-center justify-between mb-0.5 transition-all duration-300 overflow-hidden shrink-0 group h-10 px-3 hover:bg-slate-50/80 rounded-lg py-2 mx-1"
                                        >
                                            <div className="flex items-center gap-2.5">
                                                {section.icon && (
                                                    <section.icon className="w-[18px] h-[18px] text-slate-500 group-hover:text-slate-800 transition-colors" />
                                                )}
                                                <h3 className="text-[14px] font-semibold text-slate-800 transition-colors">
                                                    {section.title}
                                                </h3>
                                            </div>
                                            <ChevronDown className={`w-4 h-4 text-slate-400 group-hover:text-slate-600 transition-transform duration-200 ${!isSectionExpanded ? '-rotate-90' : ''}`} />
                                        </button>
                                    ) : (
                                        <div className="flex items-center gap-2.5 mb-1 transition-all duration-300 overflow-hidden shrink-0 h-10 px-3 mx-1">
                                            {section.icon && (
                                                <section.icon className="w-[18px] h-[18px] text-slate-500" />
                                            )}
                                            <h3 className="text-[14px] font-semibold text-slate-500">
                                                {section.title}
                                            </h3>
                                        </div>
                                    )}

                                    {/* Section Items */}
                                    <div className={`flex flex-col gap-0.5 transition-all duration-300 overflow-hidden ${!isSectionExpanded ? 'h-0 opacity-0' : 'opacity-100'}`}>
                                        {section.items.map((item) => {
                                            const isActive = pathname === item.href || (pathname.startsWith(item.href) && item.href !== '/home')

                                            return (
                                                <Link
                                                    key={item.name}
                                                    href={item.href}
                                                    className={`group flex items-center relative rounded-xl transition-all duration-200 py-2.5 min-h-[38px] shrink-0 ${isActive
                                                        ? 'bg-slate-100/80 text-slate-900 font-semibold shadow-sm'
                                                        : 'text-slate-500 hover:bg-slate-50 hover:text-slate-800 font-medium'
                                                        } pl-[42px] pr-4 mx-1`}
                                                >
                                                    {/* Label */}
                                                    <span className="text-[14px] tracking-wide whitespace-nowrap transition-opacity duration-300 opacity-100 block">
                                                        {item.name}
                                                    </span>
                                                </Link>
                                            )
                                        })}
                                    </div>
                                </>
                            )
                            }
                        </div>
                    )
                })}
            </div>

            {/* Footer Section */}
            < div className="border-t border-slate-200 bg-white shrink-0" >
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
            </div >

        </div >
    )
}
