import { Phase3Content } from '@/components/phase3/phase3-content'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'

export default async function Phase3Page() {
    const supabase = await createClient()
    const {
        data: { user },
    } = await supabase.auth.getUser()

    if (!user) redirect('/login')

    const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', user!.id)
        .single()

    const isAdmin = (profile?.role ?? '').toLowerCase() === 'admin'

    return <Phase3Content isAdmin={isAdmin} />
}
