import { NextResponse, type NextRequest } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { Incident, FollowUpTicket, WorkstreamIncidentTicket, IncidentSyncLog } from '@/types/incidents'

async function fetchAll<T>(supabase: any, table: string): Promise<T[]> {
    let allData: T[] = []
    let page = 0
    const pageSize = 1000
    while (true) {
        const { data, error } = await supabase
            .from(table)
            .select('*')
            .range(page * pageSize, (page + 1) * pageSize - 1)

        if (error) {
            if (error.message?.includes('does not exist') || error.message?.includes('relation')) {
                return []
            }
            throw new Error(error.message)
        }
        if (!data || data.length === 0) break
        allData = allData.concat(data as T[])
        if (data.length < pageSize) break
        page++
    }
    return allData
}

export async function GET(request: NextRequest) {
    const supabase = await createClient()

    try {
        // Fetch all data using pagination
        const incidents = await fetchAll<Incident>(supabase, 'incidents')
        const followups = await fetchAll<FollowUpTicket>(supabase, 'followups')
        const workstreamTickets = await fetchAll<WorkstreamIncidentTicket>(supabase, 'workstream_incident_tickets')

        let lastSync: string | null = null
        try {
            const { data, error } = await supabase
                .from('incident_sync_log')
                .select('last_updated')
                .order('last_updated', { ascending: false })
                .limit(1)
            if (!error && data && data.length > 0) {
                lastSync = data[0].last_updated
            }
        } catch { }

        // We can just return everything to the client and let the client filter by dates/impacts,
        // or filter here. Since this is an internal dashboard, returning all is usually fine unless 
        // there's a huge volume.

        // --- MOCK DATA ---
        // TODO: Remove this mock data later
        const mockIncidents: Incident[] = [
            { id: '1', jira_key: 'INC-001', product: 'WMAPS', impact: 1, created_at: '2026-01-15T10:00:00Z', updated_at: '2026-01-15T10:00:00Z' },
            { id: '2', jira_key: 'INC-002', product: 'WMAPS', impact: 2, created_at: '2026-02-10T10:00:00Z', updated_at: '2026-02-10T10:00:00Z' },
            { id: '3', jira_key: 'INC-003', product: 'SEPMO', impact: 3, created_at: '2026-02-15T10:00:00Z', updated_at: '2026-02-15T10:00:00Z' },
            { id: '4', jira_key: 'INC-004', product: 'BPI', impact: 4, created_at: '2026-01-20T10:00:00Z', updated_at: '2026-01-20T10:00:00Z' },
            { id: '5', jira_key: 'INC-005', product: 'WCOREP', impact: 1, created_at: '2026-02-05T10:00:00Z', updated_at: '2026-02-05T10:00:00Z' },
            { id: '6', jira_key: 'INC-006', product: 'WMAPS', impact: 2, created_at: '2026-01-05T10:00:00Z', updated_at: '2026-01-05T10:00:00Z' },
            { id: '7', jira_key: 'INC-007', product: 'BPI', impact: 3, created_at: '2026-02-22T10:00:00Z', updated_at: '2026-02-22T10:00:00Z' },
            { id: '8', jira_key: 'INC-008', product: 'SEPMO', impact: 2, created_at: '2026-02-01T10:00:00Z', updated_at: '2026-02-01T10:00:00Z' },
            { id: '9', jira_key: 'INC-009', product: 'WCOREP', impact: 4, created_at: '2026-01-28T10:00:00Z', updated_at: '2026-01-28T10:00:00Z' },
            { id: '10', jira_key: 'INC-010', product: 'PCE', impact: 1, created_at: '2026-02-18T10:00:00Z', updated_at: '2026-02-18T10:00:00Z' },
            { id: '11', jira_key: 'INC-011', product: 'Banking', impact: 4, created_at: '2026-01-10T10:00:00Z', updated_at: '2026-01-10T10:00:00Z' },
            { id: '12', jira_key: 'INC-012', product: 'WMAPS', impact: 2, created_at: '2026-02-20T10:00:00Z', updated_at: '2026-02-20T10:00:00Z' }
        ];

        const mockFollowups: FollowUpTicket[] = [
            {
                id: '1', jira_key: 'FOL-101', score: 85, linked_tickets_count: 2, is_complete: false, created_at: '2026-02-20T10:00:00Z',
                linked_tickets: [{ key: 'MAPS-101', project: 'WMAPS', status: 'In Progress' }, { key: 'BPI-202', project: 'BPI', status: 'To Do' }]
            },
            {
                id: '2', jira_key: 'FOL-102', score: 40, linked_tickets_count: 0, is_complete: true, created_at: '2026-02-10T10:00:00Z',
                linked_tickets: []
            },
            {
                id: '3', jira_key: 'FOL-103', score: 92, linked_tickets_count: 3, is_complete: false, created_at: '2026-02-22T10:00:00Z',
                linked_tickets: [{ key: 'COR-301', project: 'WCOREP', status: 'Done' }, { key: 'MAPS-102', project: 'WMAPS', status: 'In Progress' }, { key: 'PCE-050', project: 'PCE', status: 'In Review' }]
            },
            {
                id: '4', jira_key: 'FOL-104', score: 65, linked_tickets_count: 1, is_complete: false, created_at: '2026-02-15T10:00:00Z',
                linked_tickets: [{ key: 'SEP-400', project: 'SEPMO', status: 'To Do' }]
            },
            {
                id: '5', jira_key: 'FOL-105', score: 100, linked_tickets_count: 2, is_complete: true, created_at: '2026-01-25T10:00:00Z',
                linked_tickets: [{ key: 'MAPS-099', project: 'WMAPS', status: 'Done' }, { key: 'BNK-111', project: 'Banking', status: 'Done' }]
            }
        ];

        const mockWorkstreamTickets: WorkstreamIncidentTicket[] = [
            { id: '1', jira_key: 'WS-001', impact: 1, project_key: 'WMAPS', status: 'In Progress', created_at: '2026-02-21T10:00:00Z' },
            { id: '2', jira_key: 'WS-002', impact: 2, project_key: 'BPI', status: 'To Do', created_at: '2026-02-18T10:00:00Z' },
            { id: '3', jira_key: 'WS-003', impact: 4, project_key: 'SEPMO', status: 'Done', created_at: '2026-01-30T10:00:00Z' },
            { id: '4', jira_key: 'WS-004', impact: 1, project_key: 'WCOREP', status: 'In Review', created_at: '2026-02-15T10:00:00Z' },
            { id: '5', jira_key: 'WS-005', impact: 3, project_key: 'PCE', status: 'In Progress', created_at: '2026-02-22T10:00:00Z' },
            { id: '6', jira_key: 'WS-006', impact: 2, project_key: 'WMAPS', status: 'To Do', created_at: '2026-02-23T10:00:00Z' },
            { id: '7', jira_key: 'WS-007', impact: 4, project_key: 'Banking', status: 'Done', created_at: '2026-01-15T10:00:00Z' }
        ];

        return NextResponse.json({
            incidents: incidents.length > 0 ? incidents : mockIncidents,
            followups: followups.length > 0 ? followups : mockFollowups,
            workstreamTickets: workstreamTickets.length > 0 ? workstreamTickets : mockWorkstreamTickets,
            lastSync: lastSync || new Date().toISOString()
        })

    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('Incidents API error:', message)
        return NextResponse.json({
            incidents: [],
            followups: [],
            workstreamTickets: [],
            lastSync: null,
            _error: message,
        })
    }
}
