import { Lock } from 'lucide-react'
import { createClient } from '@/utils/supabase/server'
import { CtoDashboardClient } from './cto-dashboard-client'

export default async function CtoDashboardPage() {
    const supabase = await createClient()

    // User is guaranteed to exist — the dashboard layout already redirects
    // unauthenticated visitors to /login before this page renders.
    const {
        data: { user },
    } = await supabase.auth.getUser()

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .single()

    // ── Admin guard ───────────────────────────────────────────────────────────
    if (profile?.role !== 'Admin') {
        return (
            <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
                <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden p-8 flex flex-col items-center justify-center min-h-[400px]">
                    <div className="bg-rose-50 text-rose-500 p-4 rounded-full mb-4">
                        <Lock className="w-8 h-8" />
                    </div>
                    <h1 className="text-2xl font-bold text-slate-900 mb-2">Access Denied</h1>
                    <p className="text-slate-500 text-center max-w-md">
                        The CTO Dashboard is restricted to Admin users. Please contact your administrator if you believe you should have access.
                    </p>
                </div>
            </div>
        )
    }

    return <CtoDashboardClient />
}
