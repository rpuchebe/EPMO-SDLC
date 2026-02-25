import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// MOCK DATA for Phase 2 Detail Endpoint

const mockInitiatives = [
    { key: 'INIT-1', summary: 'Q1 Roadmap AI', status: 'In Progress', workstream: 'MAPS', investment_category: 'Strategic', children_count: 5, open_children_count: 2, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 30 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'INIT-2', summary: 'Legacy Migration', status: 'Done', workstream: 'EG', investment_category: 'Maintenance', children_count: 3, open_children_count: 1, warning_types: ['ClosedWithOpenChildren'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 45 * 86400000).toISOString(), updated_at: new Date(Date.now() - 2 * 86400000).toISOString() },
    { key: 'INIT-3', summary: 'Cloud Optimization', status: 'Backlog', workstream: 'PCE', investment_category: null, children_count: 0, open_children_count: 0, warning_types: ['MissingInvestmentCategory', 'NoChildren'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date().toISOString() },
]

const mockProjects = [
    { key: 'PROJ-1', summary: 'AI Backend', status: 'In Progress', workstream: 'MAPS', parent_initiative_key: 'INIT-1', children_count: 10, open_children_count: 5, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 20 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'PROJ-2', summary: 'AI Frontend', status: 'Done', workstream: 'MAPS', parent_initiative_key: 'INIT-1', children_count: 4, open_children_count: 0, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 15 * 86400000).toISOString(), updated_at: new Date(Date.now() - 5 * 86400000).toISOString() },
    { key: 'PROJ-3', summary: 'Old DB Upgrade', status: 'In Progress', workstream: 'EG', parent_initiative_key: 'INIT-2', children_count: 0, open_children_count: 0, warning_types: ['NoChildren'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 40 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'PROJ-4', summary: 'Orphaned Project', status: 'Backlog', workstream: 'PCE', parent_initiative_key: 'EPMO-1', children_count: 2, open_children_count: 2, warning_types: ['MissingParentInit'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 5 * 86400000).toISOString(), updated_at: new Date().toISOString() },
]

const mockBWIs = [
    { key: 'BWI-1', summary: 'Model Training Pipeline', issue_type: 'New Feature', status: 'In Progress', workstream: 'MAPS', parent_project_key: 'PROJ-1', children_count: 3, open_children_count: 2, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 15 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'BWI-2', summary: 'API Endpoint', issue_type: 'Enhancement', status: 'Done', workstream: 'MAPS', parent_project_key: 'PROJ-1', children_count: 2, open_children_count: 1, warning_types: ['ClosedWithOpenChildren'], has_warning: true, wrong_status: true, created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'BWI-3', summary: 'UI Dashboard', issue_type: 'New Feature', status: 'In Progress', workstream: 'MAPS', parent_project_key: 'PROJ-2', children_count: 0, open_children_count: 0, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'BWI-4', summary: 'Fix Crash on Login', issue_type: 'Issue', status: 'Backlog', workstream: 'EG', parent_project_key: 'PROJ-3', children_count: 0, open_children_count: 0, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 5 * 86400000).toISOString(), updated_at: new Date().toISOString() },
    { key: 'BWI-5', summary: 'Orphaned BWI', issue_type: 'New Feature', status: 'In Progress', workstream: 'PCE', parent_project_key: 'EPMO-1', children_count: 0, open_children_count: 0, warning_types: ['MissingParentProject'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 2 * 86400000).toISOString(), updated_at: new Date().toISOString() },
]

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const workstream = searchParams.get('workstream') || 'All Workstreams'
    const team = searchParams.get('team') || 'All Teams'
    const period = searchParams.get('period') || '30'
    const entity = searchParams.get('entity') // 'initiatives', 'projects', 'bwi'
    const metric_id = searchParams.get('metric_id')

    if (!entity || !metric_id) {
        return NextResponse.json({ error: 'Missing entity or metric_id' }, { status: 400 })
    }

    // Filter based on context
    const filterByDate = (dateStr: string) => {
        if (period === 'all') return true
        const days = parseInt(period)
        if (isNaN(days)) return true
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        return new Date(dateStr) >= cutoffDate
    }
    const filterByWs = (ws: string) => workstream === 'All Workstreams' || ws === workstream

    let dataSet: any[] = []

    if (entity === 'initiatives') {
        dataSet = mockInitiatives.filter(i => filterByWs(i.workstream) && filterByDate(i.created_at))
        switch (metric_id) {
            case 'created': break;
            case 'in_progress': dataSet = dataSet.filter(i => i.status === 'In Progress'); break;
            case 'completed': dataSet = dataSet.filter(i => i.status === 'Done'); break;
            case 'completed_warnings': dataSet = dataSet.filter(i => i.status === 'Done' && i.has_warning); break;
            case 'no_investment_category': dataSet = dataSet.filter(i => !i.investment_category); break;
            case 'no_children': dataSet = dataSet.filter(i => i.children_count === 0); break;
            case 'wrong_status': dataSet = dataSet.filter(i => i.wrong_status); break;
        }
    } else if (entity === 'projects') {
        dataSet = mockProjects.filter(p => filterByWs(p.workstream) && filterByDate(p.created_at))
        switch (metric_id) {
            case 'created': break;
            case 'in_progress': dataSet = dataSet.filter(p => p.status === 'In Progress'); break;
            case 'completed': dataSet = dataSet.filter(p => p.status === 'Done'); break;
            case 'completed_warnings': dataSet = dataSet.filter(p => p.status === 'Done' && p.has_warning); break;
            case 'no_children': dataSet = dataSet.filter(p => p.children_count === 0); break;
            case 'no_parent': dataSet = dataSet.filter(p => p.parent_initiative_key === 'EPMO-1' || !p.parent_initiative_key); break;
            case 'wrong_status': dataSet = dataSet.filter(p => p.wrong_status); break;
        }
    } else if (entity === 'bwi') {
        dataSet = mockBWIs.filter(b => filterByWs(b.workstream) && filterByDate(b.created_at))
        switch (metric_id) {
            case 'created': break;
            case 'bwi_new_feature': dataSet = dataSet.filter(b => b.issue_type === 'New Feature'); break;
            case 'bwi_enhancement': dataSet = dataSet.filter(b => b.issue_type === 'Enhancement'); break;
            case 'bwi_issue': dataSet = dataSet.filter(b => b.issue_type === 'Issue'); break;
            case 'in_progress': dataSet = dataSet.filter(b => b.status === 'In Progress'); break;
            case 'completed': dataSet = dataSet.filter(b => b.status === 'Done'); break;
            case 'completed_warnings': dataSet = dataSet.filter(b => b.status === 'Done' && b.has_warning); break;
            case 'no_children': dataSet = dataSet.filter(b => b.children_count === 0); break;
            case 'no_parent': dataSet = dataSet.filter(b => b.parent_project_key === 'EPMO-1' || !b.parent_project_key); break;
            case 'wrong_status': dataSet = dataSet.filter(b => b.wrong_status); break;
            case 'by_workstream':
                const targetWs = searchParams.get('segment')
                if (targetWs) dataSet = dataSet.filter(b => b.workstream === targetWs);
                break;
        }
    }

    return NextResponse.json({ query: { entity, metric_id, workstream, team, period }, results: dataSet })
}
