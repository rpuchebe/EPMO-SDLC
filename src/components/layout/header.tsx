'use client'

import { Bell, GraduationCap, ChevronDown, User, LogOut, Settings, Check, X, Search } from 'lucide-react'
import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter, usePathname } from 'next/navigation'

// Custom hook to handle clicks outside of a component
function useOnClickOutside(ref: React.RefObject<HTMLElement | null>, handler: () => void) {
    useEffect(() => {
        const listener = (event: MouseEvent | TouchEvent) => {
            if (!ref.current || ref.current.contains(event.target as Node)) {
                return
            }
            handler()
        }
        document.addEventListener('mousedown', listener)
        document.addEventListener('touchstart', listener)
        return () => {
            document.removeEventListener('mousedown', listener)
            document.removeEventListener('touchstart', listener)
        }
    }, [ref, handler])
}

export function Header({ user }: { user: any }) {
    const [profileOpen, setProfileOpen] = useState(false)
    const [workstreamOpen, setWorkstreamOpen] = useState(false)
    const [teamOpen, setTeamOpen] = useState(false)

    const [workstream, setWorkstream] = useState('All Workstreams')
    const [team, setTeam] = useState('All Teams')

    const [dbWorkstreams, setDbWorkstreams] = useState<{ id: string, name: string }[]>([])
    const [dbTeams, setDbTeams] = useState<{ id: string, name: string, workstream_id: string }[]>([])
    const [userProfile, setUserProfile] = useState<{ full_name: string | null, avatar_url: string | null, role: string | null } | null>(null)
    const [searchQuery, setSearchQuery] = useState('')

    const profileRef = useRef<HTMLDivElement>(null)
    const workstreamRef = useRef<HTMLDivElement>(null)
    const teamRef = useRef<HTMLDivElement>(null)
    const searchInputRef = useRef<HTMLInputElement>(null)

    const router = useRouter()
    const pathname = usePathname()
    const supabase = createClient()

    useOnClickOutside(profileRef, () => setProfileOpen(false))
    useOnClickOutside(workstreamRef, () => setWorkstreamOpen(false))
    useOnClickOutside(teamRef, () => setTeamOpen(false))

    // Handle Cmd+K / Ctrl+K shortcut for search
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                searchInputRef.current?.focus()
            }
        }
        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [])

    useEffect(() => {
        async function fetchFilters() {
            const { data: wsData } = await supabase.from('workstreams').select('id, name').order('name')
            const { data: tData } = await supabase.from('teams').select('id, name, workstream_id').order('name')

            if (wsData) setDbWorkstreams(wsData)
            if (tData) setDbTeams(tData)

            if (user?.id) {
                const { data: profile } = await supabase.from('profiles').select('full_name, avatar_url, role').eq('id', user.id).single()
                if (profile) setUserProfile(profile)
            }
        }
        fetchFilters()
    }, [supabase, user?.id])

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const name = userProfile?.full_name || user?.user_metadata?.full_name || user?.email || 'User'
    const initials = name.substring(0, 2).toUpperCase()
    const role = userProfile?.role || 'Viewer'
    const avatar = userProfile?.avatar_url

    // Filter teams based on selected workstream
    const selectedWorkstreamId = dbWorkstreams.find(ws => ws.name === workstream)?.id
    const availableTeams = selectedWorkstreamId
        ? dbTeams.filter(t => t.workstream_id === selectedWorkstreamId)
        : dbTeams

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex justify-center w-full shrink-0 relative z-40">
            <div className="w-full px-6 md:px-8 flex items-center h-full">
                <div className="max-w-7xl mx-auto w-full flex items-center justify-between h-full">
                    <div className="flex items-center gap-4">
                        {/* Modern Filters or Search Bar */}
                        {pathname?.startsWith('/phase-') ? (
                            <div className="flex items-center gap-2 sm:gap-3">
                                <span className="text-sm font-medium text-slate-500 mr-1 hidden sm:inline">Filters:</span>
                                {/* Workstream Filter */}
                                <div className="relative" ref={workstreamRef}>
                                    <button
                                        onClick={() => {
                                            setWorkstreamOpen(!workstreamOpen)
                                            setTeamOpen(false)
                                            setProfileOpen(false)
                                        }}
                                        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all shadow-sm w-[140px] sm:w-[200px] lg:w-[280px] group relative h-12"
                                    >
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Workstream</span>
                                            <span className="truncate text-sm font-medium text-slate-700 w-full text-left leading-none">{workstream}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {workstream !== 'All Workstreams' && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setWorkstream('All Workstreams');
                                                        setTeam('All Teams');
                                                        setWorkstreamOpen(false);
                                                    }}
                                                    className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${workstreamOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>
                                    {workstreamOpen && (
                                        <div className="absolute left-0 mt-2 w-[240px] sm:w-[300px] lg:w-[360px] bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50">
                                            <button
                                                onClick={() => { setWorkstream('All Workstreams'); setTeam('All Teams'); setWorkstreamOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                                            >
                                                All Workstreams
                                                {workstream === 'All Workstreams' && <Check className="w-4 h-4 text-blue-600" />}
                                            </button>
                                            {dbWorkstreams.map(ws => (
                                                <button
                                                    key={ws.id}
                                                    onClick={() => { setWorkstream(ws.name); setTeam('All Teams'); setWorkstreamOpen(false); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                                                >
                                                    <span className="truncate">{ws.name}</span>
                                                    {workstream === ws.name && <Check className="w-4 h-4 text-blue-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>

                                {/* Team Filter */}
                                <div className="relative" ref={teamRef}>
                                    <button
                                        onClick={() => {
                                            setTeamOpen(!teamOpen)
                                            setWorkstreamOpen(false)
                                            setProfileOpen(false)
                                        }}
                                        className="flex items-center justify-between gap-2 px-3 py-1.5 bg-white border border-slate-200 hover:border-slate-300 hover:bg-slate-50 rounded-lg transition-all shadow-sm w-[140px] sm:w-[200px] lg:w-[280px] group relative h-12"
                                    >
                                        <div className="flex flex-col items-start overflow-hidden">
                                            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider leading-none mb-1">Team</span>
                                            <span className="truncate text-sm font-medium text-slate-700 w-full text-left leading-none">{team}</span>
                                        </div>
                                        <div className="flex items-center gap-1 shrink-0">
                                            {team !== 'All Teams' && (
                                                <div
                                                    onClick={(e) => {
                                                        e.stopPropagation();
                                                        setTeam('All Teams');
                                                        setTeamOpen(false);
                                                    }}
                                                    className="p-1 hover:bg-slate-200 rounded-full text-slate-400 hover:text-slate-600 transition-colors"
                                                >
                                                    <X className="w-3.5 h-3.5" />
                                                </div>
                                            )}
                                            <ChevronDown className={`w-4 h-4 text-slate-400 shrink-0 transition-transform ${teamOpen ? 'rotate-180' : ''}`} />
                                        </div>
                                    </button>
                                    {teamOpen && (
                                        <div className="absolute left-0 mt-2 w-[240px] sm:w-[300px] lg:w-[360px] bg-white border border-slate-200 rounded-xl shadow-lg py-1 z-50 max-h-64 overflow-y-auto">
                                            <button
                                                onClick={() => { setTeam('All Teams'); setTeamOpen(false); }}
                                                className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                                            >
                                                All Teams
                                                {team === 'All Teams' && <Check className="w-4 h-4 text-blue-600" />}
                                            </button>
                                            {availableTeams.map(t => (
                                                <button
                                                    key={t.id}
                                                    onClick={() => { setTeam(t.name); setTeamOpen(false); }}
                                                    className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center justify-between"
                                                >
                                                    <span className="truncate">{t.name}</span>
                                                    {team === t.name && <Check className="w-4 h-4 text-blue-600" />}
                                                </button>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ) : (
                            <form
                                onSubmit={(e) => {
                                    e.preventDefault()
                                    if (searchQuery.trim()) {
                                        router.push(`/search?q=${encodeURIComponent(searchQuery)}`)
                                    }
                                }}
                                className="relative hidden md:block"
                            >
                                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                                <input
                                    ref={searchInputRef}
                                    type="text"
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    placeholder="Search anything..."
                                    className="h-10 w-[260px] lg:w-[360px] bg-white border border-slate-200 hover:border-slate-300 rounded-full pl-9 pr-14 text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-slate-200 transition-all shadow-sm"
                                />
                                <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center justify-center h-6 px-1.5 bg-slate-50 border border-slate-200 rounded text-[10px] font-medium text-slate-500 tracking-wider">
                                    ⌘K
                                </div>
                            </form>
                        )}
                    </div>

                    <div className="flex items-center gap-4">
                        <button className="text-emerald-50 bg-emerald-600 hover:bg-emerald-700 hover:shadow-md transition-all hidden sm:flex items-center gap-2 text-sm font-medium px-4 py-1.5 rounded-full shadow-sm">
                            <GraduationCap className="w-4 h-4 text-emerald-100" />
                            Academy
                        </button>

                        <button className="text-slate-500 hover:text-slate-800 transition-colors hidden sm:block relative p-2 hover:bg-slate-100 rounded-full">
                            <Bell className="w-5 h-5" />
                            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </button>

                        <div className="relative" ref={profileRef}>
                            <button
                                onClick={() => {
                                    setProfileOpen(!profileOpen)
                                    setWorkstreamOpen(false)
                                    setTeamOpen(false)
                                }}
                                className="flex items-center gap-3 hover:bg-slate-50 p-1.5 pr-2 rounded-full transition-colors border border-transparent hover:border-slate-200"
                            >
                                {avatar ? (
                                    <img src={avatar} alt={name} className="w-8 h-8 rounded-full border border-slate-200 object-cover" />
                                ) : (
                                    <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center text-white text-xs font-bold shadow-inner">
                                        {initials}
                                    </div>
                                )}
                                <div className="hidden md:flex flex-col items-start mr-1">
                                    <span className="text-sm font-semibold text-slate-800 leading-tight">{name}</span>
                                    <span className="text-xs text-slate-500 leading-tight font-medium">{role}</span>
                                </div>
                                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${profileOpen ? 'rotate-180' : ''}`} />
                            </button>

                            {profileOpen && (
                                <div className="absolute right-0 mt-2 w-56 bg-white border border-slate-200 rounded-xl shadow-xl py-1 z-50">
                                    <div className="px-4 py-3 border-b border-slate-100 flex flex-col gap-0.5">
                                        <span className="text-sm font-semibold text-slate-800">{name}</span>
                                        <span className="text-xs font-medium text-slate-500">Account settings</span>
                                    </div>
                                    <div className="py-1">
                                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-3 transition-colors">
                                            <User className="w-4 h-4 text-slate-400" /> Profile
                                        </button>
                                        <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 hover:text-slate-900 flex items-center gap-3 transition-colors">
                                            <Settings className="w-4 h-4 text-slate-400" /> Settings
                                        </button>
                                    </div>
                                    <div className="border-t border-slate-100 my-1"></div>
                                    <button
                                        onClick={handleSignOut}
                                        className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50 hover:text-red-700 flex items-center gap-3 transition-colors"
                                    >
                                        <LogOut className="w-4 h-4" /> Sign out
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </header>
    )
}
