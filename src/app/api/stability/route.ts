import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'
import { requireAuth } from '@/utils/supabase/auth-guard'
import { format, subWeeks } from 'date-fns'

export async function GET(request: NextRequest) {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()

    // 1. Get latest weekly update
    const { data: weeklyUpdate, error: weeklyError } = await supabase
        .from('stability_weekly_update')
        .select('*')
        .order('week_of', { ascending: false })
        .limit(1)
        .single()

    // 2. Get stability initiatives from stability_issues (already filtered by n8n)
    const { data: initiatives, error: initError } = await supabase
        .from('stability_issues')
        .select(`
            jira_issue_id,
            jira_key,
            summary,
            status_name,
            status_category,
            issue_type,
            start_date,
            due_date,
            parent_jira_issue_id,
            labels
        `)

    if (initError) {
        console.error('Error fetching stability initiatives:', initError)
    }

    const initIds = initiatives?.map(i => i.jira_issue_id) || []
    const fakeInitiativeId = 'fake-init-999';

    // 3. Get latest manual updates for these initiatives + fake ones
    const fakeIds = [fakeInitiativeId, 'fake-proj-992', 'fake-proj-993'];
    const allRelevantIds = [...initIds, ...fakeIds];

    const { data: manualUpdates, error: manualError } = await supabase
        .from('stability_deliverable_updates')
        .select('*')
        .in('initiative_jira_issue_id', allRelevantIds)
        .order('initiative_jira_issue_id')
        .order('week_of', { ascending: false })
        .order('created_at', { ascending: false })

    if (manualError) {
        console.error('Error fetching manual updates:', manualError);
    }

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const updatesHistory: Record<string, any[]> = {}
    if (manualUpdates) {
        manualUpdates.forEach(update => {
            if (!updatesHistory[update.initiative_jira_issue_id]) {
                updatesHistory[update.initiative_jira_issue_id] = []
            }
            updatesHistory[update.initiative_jira_issue_id].push(update)
        })
    }

    // 4. Get rollups for "System Progress"
    const { data: rollups } = await supabase
        .from('initiative_rollups_latest')
        .select('*')
        .in('initiative_jira_issue_id', initIds)

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rollupMap: Record<string, any> = {}
    rollups?.forEach(r => {
        rollupMap[r.initiative_jira_issue_id] = r
    })

    // Helper to merge history and structure notes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const enrichDeliverable = (d: any) => {
        const history = updatesHistory[d.jira_issue_id] || []
        const latestManual = history[0]

        // Parse note to extract structured data if it's JSON
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        let parsedNote: any = { note: latestManual?.note ?? null };
        try {
            if (latestManual?.note && latestManual.note.startsWith('{')) {
                const parsed = JSON.parse(latestManual.note);
                if (parsed.text !== undefined) {
                    parsedNote = {
                        note: parsed.text,
                        risks: parsed.risks,
                        nextSteps: parsed.nextSteps,
                        kpis: parsed.kpis
                    };
                }
            }
        } catch (e) {
            // ignore error
        }

        return {
            ...d,
            reportedProgress: latestManual?.reported_progress_pct ?? d.reportedProgress ?? null,
            reportedNote: parsedNote.note ?? d.reportedNote ?? null,
            reportedRisks: parsedNote.risks ?? d.reportedRisks ?? null,
            reportedNextSteps: parsedNote.nextSteps ?? d.reportedNextSteps ?? null,
            reportedKpis: (parsedNote.kpis || (d.reportedKpis || [])).map((k: any) => ({ ...k, id: String(k.id) })),
            reportedAt: latestManual?.created_at ?? d.reportedAt ?? null,
            weekOf: latestManual?.week_of ?? d.weekOf ?? null,
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            updatesHistory: [
                ...history.map((h: any) => {
                    let pNote: any = { note: h.note };
                    try {
                        if (h.note && h.note.startsWith('{')) {
                            const parsed = JSON.parse(h.note);
                            if (parsed.text !== undefined) {
                                pNote = {
                                    note: parsed.text,
                                    risks: parsed.risks,
                                    nextSteps: parsed.nextSteps,
                                    kpis: parsed.kpis
                                };
                            }
                        }
                    } catch (e) {
                        // ignore error
                    }
                    return {
                        reported_progress_pct: h.reported_progress_pct,
                        created_at: h.created_at,
                        week_of: h.week_of,
                        ...pNote
                    }
                }),
                ...(d.updatesHistory || []).map((h: any) => ({
                    ...h,
                    risks: h.risks || null,
                    nextSteps: h.nextSteps || null
                }))
            ]
        }
    }

    // Combine data
    const realDeliverables = initiatives?.map(init => {
        const rollup = rollupMap[init.jira_issue_id]
        // System progress: ((Total - Open) / Total) * 100
        const systemProgress = rollup && rollup.children_total > 0
            ? Math.round(((rollup.children_total - rollup.children_open) / rollup.children_total) * 100)
            : (init.status_category === 'Done' ? 100 : 0)

        return enrichDeliverable({
            ...init,
            systemProgress,
        })
    }) || []

    // Append fake workstream and projects to demo the end result
    const fakeData = [
        {
            jira_issue_id: fakeInitiativeId,
            jira_key: 'EPMO-991',
            summary: 'Global Infrastructure Modernization & Migration',
            status_name: 'In Progress',
            status_category: 'In Progress',
            issue_type: 'Workstream Initiative',
            start_date: '2025-07-01',
            due_date: '2025-12-15',
            parent_jira_issue_id: null,
            labels: ['stability_scalability'],
            systemProgress: 45,
            reportedProgress: 45,
            reportedNote: 'Overall cloud migration is on track. Working through networking dependencies.',
            reportedRisks: 'Dependencies on external vendors for transit gateways might delay Q4 goals.',
            reportedNextSteps: 'Finalize networking architecture review by next week.',
            reportedKpis: [],
            reportedAt: new Date().toISOString(),
            weekOf: new Date().toISOString(),
            updatesHistory: [
                {
                    reported_progress_pct: 45,
                    created_at: new Date().toISOString(),
                    week_of: new Date().toISOString(),
                    note: 'Overall cloud migration is on track. Working through networking dependencies.'
                },
                {
                    reported_progress_pct: 20,
                    created_at: '2025-08-15T00:00:00Z',
                    week_of: '2025-08-15',
                    note: 'Initial analysis completed.'
                }
            ]
        },
        {
            jira_issue_id: 'fake-proj-992',
            jira_key: 'EPMO-992',
            summary: 'Database Cluster Upgrade & failover testing',
            status_name: 'In Progress',
            status_category: 'In Progress',
            issue_type: 'Project',
            start_date: '2025-08-01',
            due_date: '2025-10-15',
            parent_jira_issue_id: fakeInitiativeId,
            labels: ['stability_scalability'],
            systemProgress: 75,
            reportedProgress: 80,
            reportedNote: 'Failover testing in staging environment successful. Planning production cutover.',
            reportedRisks: 'Production cutover window is tight. Need coordination with all engineering leads.',
            reportedNextSteps: 'Schedule CAB review for cutover.',
            reportedKpis: [
                {
                    id: '1', label: 'Cluster Provisioning & Network Setup', progress: 100, note: 'All instances are up and running in VPC.', risks: null, nextSteps: 'Monitor initial sync.',
                    tasks: [
                        { id: '1-1', label: 'Provision EC2 instances', completed: true },
                        { id: '1-2', label: 'Configure Security Groups', completed: true },
                        { id: '1-3', label: 'Setup VPC Peering', completed: true }
                    ]
                },
                {
                    id: '2', label: 'Data Migration & Replication Sync', progress: 65, note: 'Primary sync completed. Secondary nodes are catching up.', risks: 'Latency spikes during peak hours.', nextSteps: 'Optimize replication batch size.',
                    tasks: [
                        { id: '2-1', label: 'Define migration strategy', completed: true },
                        { id: '2-2', label: 'Initial snapshot load', completed: true },
                        { id: '2-3', label: 'Enable binary logging', completed: true },
                        { id: '2-4', label: 'Verify data integrity', completed: false }
                    ]
                },
                {
                    id: '3', label: 'High Availability Failover Testing', progress: 85, note: 'Staging tests passed. Readiness review scheduled.', risks: 'DR region switch needs validation.', nextSteps: 'Run simulation in pre-prod.',
                    tasks: [
                        { id: '3-1', label: 'Setup monitoring alerts', completed: true },
                        { id: '3-2', label: 'Simulate Primary failure', completed: true },
                        { id: '3-3', label: 'Verify automatic promotion', completed: true },
                        { id: '3-4', label: 'Automate rollback procedure', completed: false }
                    ]
                },
                {
                    id: '4', label: 'Production Cutover & Traffic Routing', progress: 45, note: 'CAB review ongoing. Approval expected by tomorrow.', risks: 'Tight window for downtime.', nextSteps: 'Finalize DNS switchover scripts.',
                    tasks: [
                        { id: '4-1', label: 'Draft cutover plan', completed: true },
                        { id: '4-2', label: 'Communicate downtime to clients', completed: true },
                        { id: '4-3', label: 'Execute DNS migration', completed: false },
                        { id: '4-4', label: 'Post-migration health check', completed: false },
                        { id: '4-5', label: 'Archive old cluster', completed: false }
                    ]
                }
            ],
            reportedAt: new Date().toISOString(),
            weekOf: new Date().toISOString(),
            updatesHistory: [
                {
                    reported_progress_pct: 80,
                    created_at: new Date().toISOString(),
                    week_of: new Date().toISOString(),
                    note: 'Failover testing in staging environment successful. Planning production cutover.',
                    risks: 'Cutover requires a 4-hour downtime window; still negotiating with stakeholders.',
                    nextSteps: 'Finalize production rollback scripts.'
                },
                {
                    reported_progress_pct: 65,
                    created_at: subWeeks(new Date(), 1).toISOString(),
                    week_of: format(subWeeks(new Date(), 1), 'yyyy-MM-dd'),
                    note: 'Database cluster sync in progress. Performance benchmarks look promising.',
                    risks: 'Initial sync is taking longer than expected due to data volume.',
                    nextSteps: 'Optimize indexing before final sync phase.'
                },
                {
                    reported_progress_pct: 50,
                    created_at: subWeeks(new Date(), 2).toISOString(),
                    week_of: format(subWeeks(new Date(), 2), 'yyyy-MM-dd'),
                    note: 'Upgrading staging clusters. Initial latency spikes resolved.',
                    risks: 'Replication lag observed during high-load tests.',
                    nextSteps: 'Tune buffer pool sizes for the new instance types.'
                },
                {
                    reported_progress_pct: 35,
                    created_at: subWeeks(new Date(), 3).toISOString(),
                    week_of: format(subWeeks(new Date(), 3), 'yyyy-MM-dd'),
                    note: 'Infrastructure setup complete. Beginning staging data migration.',
                    risks: 'Disk throughput limits reached on standard storage.',
                    nextSteps: 'Switch to Provisioned IOPS for the DB volumes.'
                },
                {
                    reported_progress_pct: 15,
                    created_at: subWeeks(new Date(), 4).toISOString(),
                    week_of: format(subWeeks(new Date(), 4), 'yyyy-MM-dd'),
                    note: 'Project kickoff. Defined migration strategy and success criteria.',
                    risks: null,
                    nextSteps: 'Order infrastructure resources for the first cluster.'
                }
            ]
        },
        {
            jira_issue_id: 'fake-proj-993',
            jira_key: 'EPMO-993',
            summary: 'Implement New API Gateway Rate Limiting',
            status_name: 'To Do',
            status_category: 'To Do',
            issue_type: 'Project',
            start_date: '2025-10-10',
            due_date: '2025-12-05',
            parent_jira_issue_id: fakeInitiativeId,
            labels: ['stability_scalability'],
            systemProgress: 0,
            reportedProgress: 0,
            reportedNote: 'Pending completion of the DB clusters. Requirements gathered.',
            reportedRisks: null,
            reportedNextSteps: 'Begin drafting rate limit configuration rules.',
            reportedKpis: [],
            reportedAt: null,
            weekOf: null,
            updatesHistory: []
        }
    ];

    const deliverables = [...realDeliverables, ...fakeData.map(f => enrichDeliverable(f))];

    return NextResponse.json({
        weeklyUpdate: weeklyUpdate || null,
        deliverables,
        lastSync: new Date().toISOString()
    })
}

export async function POST(request: NextRequest) {
    const auth = await requireAuth()
    if (auth instanceof NextResponse) return auth

    const supabase = await createClient()

    // Safety timeout or explicitly catch profile error
    const profilePromise = supabase
        .from('profiles')
        .select('role')
        .eq('id', auth.id)
        .maybeSingle();

    const { data: profile, error: profError } = await profilePromise;

    if (profError || profile?.role !== 'Admin') {
        console.error('Unauthorized access attempt:', profError || 'Not an admin');
        return NextResponse.json({ error: 'Unauthorized: Admins only' }, { status: 401 })
    }

    try {
        const body = await request.json()
        const { type, week_of, ...rest } = body

        if (!type || !week_of) {
            return NextResponse.json({ error: 'Missing required fields: type, week_of' }, { status: 400 })
        }

        if (type === 'global') {
            const { data, error } = await supabase
                .from('stability_weekly_update')
                .upsert({
                    week_of,
                    ...rest,
                    created_by: auth.email
                })
            if (error) throw error
            return NextResponse.json({ success: true, data })
        } else if (type === 'deliverable') {
            const { note, risks, nextSteps, kpis, ...otherRest } = rest;
            const finalNote = JSON.stringify({ text: note, risks, nextSteps, kpis });

            const { data, error } = await supabase
                .from('stability_deliverable_updates')
                .insert({
                    week_of,
                    initiative_jira_issue_id: otherRest.initiative_jira_issue_id,
                    initiative_key: otherRest.initiative_key,
                    reported_progress_pct: otherRest.reported_progress_pct,
                    note: finalNote,
                    created_by: auth.email
                })
            if (error) throw error
            return NextResponse.json({ success: true, data })
        }

        return NextResponse.json({ error: 'Invalid type' }, { status: 400 })
    } catch (error: any) {
        console.error('API Error in Stability POST:', error);
        return NextResponse.json({ error: error.message || 'An error occurred' }, { status: 500 })
    }
}
