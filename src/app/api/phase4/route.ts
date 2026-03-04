import { NextResponse } from 'next/server'
import { getPhase4Data } from '@/lib/server/phase4'
import { requireAuth } from '@/utils/supabase/auth-guard'

export async function GET(req: Request) {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    try {
        const { searchParams } = new URL(req.url)
        const workstream = searchParams.get('workstream') || 'All Workstreams'
        const team = searchParams.get('team') || 'All Teams'
        const data = await getPhase4Data(workstream, team)
        return NextResponse.json(data)
    } catch (err) {
        console.error('[api/phase4]', err)
        return NextResponse.json(
            { error: 'Failed to load Phase 4 data. Check server logs.' },
            { status: 500 },
        )
    }
}
