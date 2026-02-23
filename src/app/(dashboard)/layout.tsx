import { SidebarWrapper } from '@/components/layout/sidebar-wrapper'
import { Header } from '@/components/layout/header'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode
}) {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) {
        redirect('/login')
    }

    return (
        <div className="flex h-screen w-full bg-slate-50 overflow-hidden text-slate-900 font-sans">
            <SidebarWrapper />
            <div className="flex-1 flex flex-col h-full overflow-hidden">
                <Header user={user} />
                <main className="flex-1 overflow-y-auto p-6 md:p-8">
                    <div className="max-w-7xl mx-auto">
                        {children}
                    </div>
                </main>
            </div>
        </div>
    )
}
