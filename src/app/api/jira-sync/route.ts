import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { searchAllIssues, extractStatusTransitions, type JiraIssue } from '@/utils/jira/client'

const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
)

const ROI_FIELD = process.env.JIRA_ROI_FIELD || 'customfield_16629'
const WORKSTREAM_FIELD = process.env.JIRA_WORKSTREAM_FIELD || 'customfield_12477'

function extractFieldValue(issue: JiraIssue, fieldId: string): string | number | null {
    const val = issue.fields[fieldId]
    if (val === null || val === undefined) return null
    if (typeof val === 'object' && val !== null && 'value' in (val as Record<string, unknown>)) {
        return (val as { value: string }).value
    }
    if (typeof val === 'object' && val !== null && 'name' in (val as Record<string, unknown>)) {
        return (val as { name: string }).name
    }
    if (typeof val === 'string' || typeof val === 'number') return val
    return String(val)
}

export async function POST(request: Request) {
    // Verify sync secret
    const authHeader = request.headers.get('authorization')
    const syncSecret = process.env.SYNC_SECRET
    if (syncSecret && authHeader !== `Bearer ${syncSecret}`) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    try {
        const jql = 'project = BPI ORDER BY created DESC'
        const fields = [
            'summary', 'status', 'assignee', 'created', 'resolutiondate',
            ROI_FIELD, WORKSTREAM_FIELD
        ]

        const issues = await searchAllIssues(jql, fields, true)

        // Upsert tickets
        const ticketRows = issues.map((issue) => {
            const roiRaw = extractFieldValue(issue, ROI_FIELD)
            const roi = roiRaw !== null ? Number(roiRaw) : null
            const workstream = extractFieldValue(issue, WORKSTREAM_FIELD)

            return {
                jira_key: issue.key,
                summary: issue.fields.summary,
                status: issue.fields.status?.name || 'Unknown',
                status_category: issue.fields.status?.statusCategory?.name || 'Unknown',
                workstream: workstream ? String(workstream) : null,
                assignee_account_id: issue.fields.assignee?.accountId || null,
                assignee_display_name: issue.fields.assignee?.displayName || null,
                assignee_avatar_url: issue.fields.assignee?.avatarUrls?.['48x48'] || null,
                roi_score: isNaN(roi as number) ? null : roi,
                created_at: issue.fields.created,
                completed_at: issue.fields.resolutiondate || null,
                updated_at: new Date().toISOString(),
            }
        })

        // Batch upsert tickets
        for (let i = 0; i < ticketRows.length; i += 50) {
            const batch = ticketRows.slice(i, i + 50)
            const { error } = await supabaseAdmin
                .from('bpi_tickets')
                .upsert(batch, { onConflict: 'jira_key' })
            if (error) throw new Error(`Upsert bpi_tickets error: ${error.message}`)
        }

        // Get ticket IDs mapping
        const { data: allTickets, error: fetchErr } = await supabaseAdmin
            .from('bpi_tickets')
            .select('id, jira_key')
        if (fetchErr) throw new Error(`Fetch tickets error: ${fetchErr.message}`)

        const keyToId: Record<string, string> = {}
        for (const t of allTickets || []) {
            keyToId[t.jira_key] = t.id
        }

        // Delete old status history and re-insert
        await supabaseAdmin.from('bpi_status_history').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        const allTransitions = issues.flatMap(issue => {
            const transitions = extractStatusTransitions(issue)
            return transitions.map(t => ({
                ticket_id: keyToId[t.jiraKey] || null,
                jira_key: t.jiraKey,
                from_status: t.fromStatus,
                to_status: t.toStatus,
                transitioned_at: t.transitionedAt,
            }))
        }).filter(t => t.ticket_id !== null)

        // Batch insert transitions
        for (let i = 0; i < allTransitions.length; i += 100) {
            const batch = allTransitions.slice(i, i + 100)
            if (batch.length > 0) {
                const { error } = await supabaseAdmin.from('bpi_status_history').insert(batch)
                if (error) throw new Error(`Insert status_history error: ${error.message}`)
            }
        }

        // Re-aggregate daily counts
        await supabaseAdmin.from('bpi_daily_counts').delete().neq('id', '00000000-0000-0000-0000-000000000000')

        const dailyCounts: Record<string, { count_date: string; workstream: string; ticket_count: number }> = {}
        for (const ticket of ticketRows) {
            const dateStr = new Date(ticket.created_at).toISOString().split('T')[0]
            const ws = ticket.workstream || '__all__'
            const key = `${dateStr}|${ws}`
            if (!dailyCounts[key]) {
                dailyCounts[key] = { count_date: dateStr, workstream: ws, ticket_count: 0 }
            }
            dailyCounts[key].ticket_count++
        }

        const countRows = Object.values(dailyCounts)
        for (let i = 0; i < countRows.length; i += 100) {
            const batch = countRows.slice(i, i + 100)
            if (batch.length > 0) {
                const { error } = await supabaseAdmin.from('bpi_daily_counts').insert(batch)
                if (error) throw new Error(`Insert daily_counts error: ${error.message}`)
            }
        }

        // Log sync
        await supabaseAdmin.from('bpi_sync_log').insert({
            tickets_synced: issues.length,
            status: 'success',
        })

        return NextResponse.json({
            success: true,
            ticketsSynced: issues.length,
            transitions: allTransitions.length,
            syncedAt: new Date().toISOString(),
        })
    } catch (err: unknown) {
        const message = err instanceof Error ? err.message : 'Unknown error'
        console.error('Jira sync error:', message)

        // Log failure
        await supabaseAdmin.from('bpi_sync_log').insert({
            tickets_synced: 0,
            status: `error: ${message}`,
        }).catch(() => { })

        return NextResponse.json({ error: message }, { status: 500 })
    }
}
