'use client'

import { Bell, GraduationCap, ChevronDown, User, LogOut, Settings } from 'lucide-react'
import { useState } from 'react'
import { createClient } from '@/utils/supabase/client'
import { useRouter } from 'next/navigation'

export function Header({ user }: { user: any }) {
    const [profileOpen, setProfileOpen] = useState(false)
    const [workstream, setWorkstream] = useState('All Workstreams')
    const [team, setTeam] = useState('All Teams')
    const router = useRouter()
    const supabase = createClient()

    async function handleSignOut() {
        await supabase.auth.signOut()
        router.push('/login')
    }

    const name = user?.user_metadata?.full_name || user?.email || 'User'
    const initials = name.substring(0, 2).toUpperCase()

    return (
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0">
            <div className="flex items-center gap-4">
                {/* Filters MVP */}
                <div className="flex items-center gap-2">
                    <select
                        value={workstream}
                        onChange={(e) => setWorkstream(e.target.value)}
                        className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                    >
                        <option>All Workstreams</option>
                        <option>Global Markets</option>
                        <option>Banking & Treasury</option>
                    </select>
                    <select
                        value={team}
                        onChange={(e) => setTeam(e.target.value)}
                        className="text-sm border border-slate-200 rounded-md px-3 py-1.5 bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 text-slate-700"
                    >
                        <option>All Teams</option>
                        <option>Alpha Squad</option>
                        <option>Beta Squad</option>
                    </select>
                </div>
            </div>

            <div className="flex items-center gap-4">
                <button className="text-slate-500 hover:text-slate-700 transition-colors hidden sm:flex items-center gap-2 text-sm font-medium px-3 py-1.5 border border-slate-200 rounded-md">
                    <GraduationCap className="w-4 h-4" />
                    Academy
                </button>
                <button className="text-slate-500 hover:text-slate-700 transition-colors hidden sm:block relative">
                    <Bell className="w-5 h-5" />
                    <span className="absolute top-0 right-0 w-2 h-2 bg-red-500 rounded-full"></span>
                </button>

                <div className="relative">
                    <button
                        onClick={() => setProfileOpen(!profileOpen)}
                        className="flex items-center gap-2 hover:bg-slate-50 p-1.5 rounded-md transition-colors border border-transparent hover:border-slate-200"
                    >
                        <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-bold">
                            {initials}
                        </div>
                        <div className="hidden md:flex flex-col items-start">
                            <span className="text-sm font-semibold text-slate-700 leading-tight">{name}</span>
                            <span className="text-xs text-slate-500 leading-tight">Admin</span>
                        </div>
                        <ChevronDown className="w-4 h-4 text-slate-400" />
                    </button>

                    {profileOpen && (
                        <div className="absolute right-0 mt-2 w-48 bg-white border border-slate-200 rounded-md shadow-lg py-1 z-50">
                            <div className="px-4 py-2 border-b border-slate-100 flex flex-col">
                                <span className="text-sm font-semibold text-slate-700">{name}</span>
                                <span className="text-xs text-slate-500">{user?.email}</span>
                            </div>
                            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <User className="w-4 h-4" /> Profile
                            </button>
                            <button className="w-full text-left px-4 py-2 text-sm text-slate-700 hover:bg-slate-50 flex items-center gap-2">
                                <Settings className="w-4 h-4" /> Settings
                            </button>
                            <div className="border-t border-slate-100 my-1"></div>
                            <button
                                onClick={handleSignOut}
                                className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-slate-50 flex items-center gap-2"
                            >
                                <LogOut className="w-4 h-4" /> Sign out
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </header>
    )
}
