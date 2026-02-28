import { createClient } from '@/utils/supabase/server'
import { Phase4Content } from '@/components/phase4/phase4-content'

export default async function Phase4Page() {
    const supabase = await createClient()
    const { data: { user } } = await supabase.auth.getUser()

    let isAdmin = false
    if (user) {
        const { data: profile } = await supabase
            .from('profiles')
            .select('role')
            .eq('id', user.id)
            .single()
        isAdmin = (profile?.role ?? '').toLowerCase() === 'admin'
    }

    return <Phase4Content isAdmin={isAdmin} />
}
