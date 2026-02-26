import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

// MOCK DATA for Phase 2 Dashboard while Migration is pending

const mockInitiatives = [
    { key: 'INIT-1', summary: 'Q1 Roadmap AI', status: 'In Progress', workstream: 'MAPS', investment_category: 'Strategic Innovation', children_count: 5, open_children_count: 2, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 30 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: new Date(Date.now() - 25 * 86400000).toISOString(), due_date: new Date(Date.now() + 30 * 86400000).toISOString() },
    { key: 'INIT-2', summary: 'Legacy Migration', status: 'Done', workstream: 'EG', investment_category: 'Scale & Reliability', children_count: 3, open_children_count: 1, warning_types: ['ClosedWithOpenChildren'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 45 * 86400000).toISOString(), updated_at: new Date(Date.now() - 2 * 86400000).toISOString(), start_date: new Date(Date.now() - 40 * 86400000).toISOString(), due_date: new Date(Date.now() - 5 * 86400000).toISOString() },
    { key: 'INIT-3', summary: 'Cloud Optimization', status: 'Backlog', workstream: 'PCE', investment_category: null, children_count: 0, open_children_count: 0, warning_types: ['MissingInvestmentCategory', 'NoChildren'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 10 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: null, due_date: null },
    { key: 'INIT-4', summary: 'Revenue Dashboard', status: 'To Do', workstream: 'MAPS', investment_category: 'Revenue-Commit', children_count: 2, open_children_count: 2, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 15 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: new Date(Date.now() - 5 * 86400000).toISOString(), due_date: new Date(Date.now() + 10 * 86400000).toISOString() },
    { key: 'INIT-5', summary: 'Support Portal Redesign', status: 'In Progress', workstream: 'EG', investment_category: 'Support', children_count: 4, open_children_count: 0, warning_types: [], has_warning: false, wrong_status: true, created_at: new Date(Date.now() - 20 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: new Date(Date.now() - 15 * 86400000).toISOString(), due_date: new Date(Date.now() + 5 * 86400000).toISOString() },
    { key: 'INIT-6', summary: 'Security Compliance Q2', status: 'To Do', workstream: 'SEC', investment_category: 'Strategic Innovation', children_count: 1, open_children_count: 1, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 22 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: new Date(Date.now() - 2 * 86400000).toISOString(), due_date: new Date(Date.now() + 45 * 86400000).toISOString() },
    { key: 'INIT-7', summary: 'Mobile App Launch', status: 'In Progress', workstream: 'MAPS', investment_category: 'Sales Activation', children_count: 8, open_children_count: 4, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 50 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: new Date(Date.now() - 40 * 86400000).toISOString(), due_date: new Date(Date.now() - 2 * 86400000).toISOString() },
    { key: 'INIT-8', summary: 'Database Sharding', status: 'Backlog', workstream: 'PCE', investment_category: 'Scale & Reliability', children_count: 0, open_children_count: 0, warning_types: ['NoChildren'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 60 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: new Date(Date.now() + 10 * 86400000).toISOString(), due_date: new Date(Date.now() + 60 * 86400000).toISOString() },
    { key: 'INIT-9', summary: 'Partner API Integration', status: 'Done', workstream: 'EG', investment_category: 'Revenue-Commit', children_count: 2, open_children_count: 0, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 80 * 86400000).toISOString(), updated_at: new Date(Date.now() - 10 * 86400000).toISOString(), start_date: new Date(Date.now() - 70 * 86400000).toISOString(), due_date: new Date(Date.now() - 15 * 86400000).toISOString() },
    { key: 'INIT-10', summary: 'Internal Tools Upgrade', status: 'Done', workstream: 'PCE', investment_category: 'Support', children_count: 5, open_children_count: 2, warning_types: ['ClosedWithOpenChildren'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 90 * 86400000).toISOString(), updated_at: new Date(Date.now() - 1 * 86400000).toISOString(), start_date: new Date(Date.now() - 80 * 86400000).toISOString(), due_date: new Date(Date.now() - 20 * 86400000).toISOString() },
    { key: 'INIT-11', summary: 'Salesforce Sync', status: 'To Do', workstream: 'EG', investment_category: 'Sales Activation', children_count: 3, open_children_count: 1, warning_types: [], has_warning: false, wrong_status: true, created_at: new Date(Date.now() - 5 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: new Date(Date.now() - 1 * 86400000).toISOString(), due_date: new Date(Date.now() + 20 * 86400000).toISOString() },
    { key: 'INIT-12', summary: 'UX Accessibility Audit', status: 'In Progress', workstream: 'MAPS', investment_category: null, children_count: 2, open_children_count: 2, warning_types: ['MissingInvestmentCategory'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 12 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: null, due_date: new Date(Date.now() + 15 * 86400000).toISOString() },
    { key: 'INIT-13', summary: 'Payment Gateway V2', status: 'In Progress', workstream: 'EG', investment_category: 'Revenue-Commit', children_count: 6, open_children_count: 6, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 40 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: new Date(Date.now() - 30 * 86400000).toISOString(), due_date: new Date(Date.now() - 5 * 86400000).toISOString() },
    { key: 'INIT-14', summary: 'Q3 Goal Planning', status: 'Backlog', workstream: 'MAPS', investment_category: 'Strategic Innovation', children_count: 0, open_children_count: 0, warning_types: ['NoChildren'], has_warning: true, wrong_status: false, created_at: new Date(Date.now() - 2 * 86400000).toISOString(), updated_at: new Date().toISOString(), start_date: null, due_date: null },
    { key: 'INIT-15', summary: 'Infra Cost Reduction', status: 'Done', workstream: 'PCE', investment_category: 'Scale & Reliability', children_count: 4, open_children_count: 0, warning_types: [], has_warning: false, wrong_status: false, created_at: new Date(Date.now() - 100 * 86400000).toISOString(), updated_at: new Date(Date.now() - 50 * 86400000).toISOString(), start_date: new Date(Date.now() - 90 * 86400000).toISOString(), due_date: new Date(Date.now() - 55 * 86400000).toISOString() },
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

    // Normally here we would fetch from Supabase.
    // const supabase = await createClient()

    // Apply basic filtering to mock data
    const filterByDate = (dateStr: string) => {
        if (period === 'all') return true
        const days = parseInt(period)
        if (isNaN(days)) return true
        const cutoffDate = new Date()
        cutoffDate.setDate(cutoffDate.getDate() - days)
        return new Date(dateStr) >= cutoffDate
    }

    const filterByWs = (ws: string) => workstream === 'All Workstreams' || ws === workstream

    const filteredInit = mockInitiatives.filter(i => filterByWs(i.workstream) && filterByDate(i.created_at))
    const filteredProj = mockProjects.filter(p => filterByWs(p.workstream) && filterByDate(p.created_at))
    const filteredBWI = mockBWIs.filter(b => filterByWs(b.workstream) && filterByDate(b.created_at))

    // Generate mock 7-day trend data
    const generateTrend = (base: number) => {
        return Array.from({ length: 7 }).map((_, i) => ({
            name: `Day ${i + 1}`,
            value: Math.max(0, Math.floor(base / 7 + (Math.random() * 4 - 2)))
        }))
    }

    // Aggregate KPI data
    const data = {
        cleanupProgress: {
            currentWeek: {
                initiativesNoCategory: 1,
                initiativesWrongStatus: 0,
                projectsNoChildren: 1,
                projectsNoParent: 0,
                projectsWrongStatus: 1,
                bwiNoChildren: 2,
                bwiNoParent: 1,
                bwiWrongStatus: 1
            },
            lastWeek: {
                initiativesNoCategory: 5,
                initiativesWrongStatus: 3,
                projectsNoChildren: 8,
                projectsNoParent: 2,
                projectsWrongStatus: 4,
                bwiNoChildren: 12,
                bwiNoParent: 6,
                bwiWrongStatus: 3
            }
        },
        initiatives: {
            raw: filteredInit,
            created: filteredInit.length,
            createdTrend: generateTrend(filteredInit.length),
            inProgress: filteredInit.filter(i => i.status === 'In Progress').length,
            completed: filteredInit.filter(i => i.status === 'Done' || i.status === 'Closed').length,
            completedTrend: generateTrend(filteredInit.filter(i => i.status === 'Done' || i.status === 'Closed').length),
            completedWithWarnings: filteredInit.filter(i => (i.status === 'Done' || i.status === 'Closed') && i.has_warning).length,
            noInvestmentCategory: filteredInit.filter(i => !i.investment_category).length,
            noChildren: filteredInit.filter(i => i.children_count === 0).length,
            wrongStatus: filteredInit.filter(i => i.wrong_status).length,
            issues: filteredInit.filter(i => i.has_warning || i.wrong_status)
        },
        projects: {
            raw: filteredProj,
            created: filteredProj.length,
            createdTrend: generateTrend(filteredProj.length),
            inProgress: filteredProj.filter(p => p.status === 'In Progress').length,
            completed: filteredProj.filter(p => p.status === 'Done' || p.status === 'Closed').length,
            completedTrend: generateTrend(filteredProj.filter(p => p.status === 'Done' || p.status === 'Closed').length),
            completedWithWarnings: filteredProj.filter(p => (p.status === 'Done' || p.status === 'Closed') && p.has_warning).length,
            noChildren: filteredProj.filter(p => p.children_count === 0).length,
            noParent: filteredProj.filter(p => p.parent_initiative_key === 'EPMO-1' || !p.parent_initiative_key).length,
            wrongStatus: filteredProj.filter(p => p.wrong_status).length,
            issues: filteredProj.filter(p => p.has_warning || p.wrong_status)
        },
        bwi: {
            raw: filteredBWI,
            created: filteredBWI.length,
            breakdown: {
                newFeature: filteredBWI.filter(b => b.issue_type === 'New Feature').length,
                enhancement: filteredBWI.filter(b => b.issue_type === 'Enhancement').length,
                issue: filteredBWI.filter(b => b.issue_type === 'Issue').length,
            },
            inProgress: filteredBWI.filter(b => b.status === 'In Progress').length,
            completed: filteredBWI.filter(b => b.status === 'Done').length,
            completedWithWarnings: filteredBWI.filter(b => b.status === 'Done' && b.has_warning).length,
            noChildren: filteredBWI.filter(b => b.children_count === 0).length,
            noParent: filteredBWI.filter(b => b.parent_project_key === 'EPMO-1' || !b.parent_project_key).length,
            wrongStatus: filteredBWI.filter(b => b.wrong_status).length,
            issues: filteredBWI.filter(b => b.has_warning || b.wrong_status),
            byWorkstream: [] as { name: string, value: number }[]
        },
        lastSync: new Date().toISOString()
    }

    // Generate BWI Distribution
    const wsMap: Record<string, number> = {}
    filteredBWI.forEach(b => {
        wsMap[b.workstream] = (wsMap[b.workstream] || 0) + 1
    })
    data.bwi.byWorkstream = Object.keys(wsMap).map(k => ({ name: k, value: wsMap[k] }))

    return NextResponse.json(data)
}
