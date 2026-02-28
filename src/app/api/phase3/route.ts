import { NextResponse } from 'next/server'
import { getRoadmapData } from '@/lib/server/roadmap'

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url)
        const workstream = searchParams.get('workstream') || 'All Workstreams'
        const data = await getRoadmapData(workstream)
        return NextResponse.json(data)
    } catch (err) {
        console.error('[api/phase3] Failed to load roadmap:', err)
        return NextResponse.json(
            { error: 'Failed to load roadmap data. Check server logs.' },
            { status: 500 }
        )
    }
}
