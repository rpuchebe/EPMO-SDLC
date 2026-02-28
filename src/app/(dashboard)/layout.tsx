import { SidebarWrapper } from '@/components/layout/sidebar-wrapper'
import { Header } from '@/components/layout/header'
import { MainContent } from '@/components/layout/main-content'
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
                <MainContent>{children}</MainContent>
            </div>
        </div>
    )
}
