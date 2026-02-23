import { createClient } from '@/utils/supabase/server'
import { WhatIsSDLC } from '@/components/home/what-is-sdlc'
import { RolloutProgress } from '@/components/home/rollout-progress'
import { WeeklyUpdates } from '@/components/home/weekly-updates'
import { ResourceHub } from '@/components/home/resource-hub'

export default async function HomePage() {
    const supabase = await createClient()

    // Fetch Rollout Phases
    const { data: phases } = await supabase
        .from('rollout_phases')
        .select('*')
        .order('order_index')

    // Fetch Weekly Updates (get all, sort descending by date assumed from week_id)
    const { data: updatesData } = await supabase
        .from('weekly_updates')
        .select(`
      *,
      items:weekly_update_items(*)
    `)
        .order('created_at', { ascending: false })

    // Transform weekly updates to group items
    const updates = updatesData || []

    // Fetch Resources and Links
    const { data: resourceCards } = await supabase
        .from('resource_cards')
        .select(`
      *,
      links:resource_links(*)
    `)
        .order('order_index')

    // Sort links within cards
    const resources = (resourceCards || []).map(card => {
        if (card.links) {
            card.links.sort((a: any, b: any) => a.order_index - b.order_index)
        }
        return card;
    })

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">
            <RolloutProgress phases={phases || []} />
            <WeeklyUpdates updates={updates} />
            <WhatIsSDLC />
            <ResourceHub resources={resources} />
        </div>
    )
}
