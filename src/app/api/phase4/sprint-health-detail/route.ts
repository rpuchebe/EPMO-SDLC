import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server'

/**
 * GET /api/phase4/sprint-health-detail?sprintLabel=Sprint+5+-+2026&category=committed
 *
 * Returns the individual issues for a given sprint + category.
 * Categories:  committed | carryover | carryover2x | completed
 *
 * The carryover distinction uses the total number of distinct sprint_labels
 * each issue has been in (across all its sprint assignments):
 *   committed   → total_sprint_labels = 1  (first-ever sprint)
 *   carryover   → total_sprint_labels = 2  (exactly 2 sprints)
 *   carryover2x → total_sprint_labels >= 3  (3+ sprints)
 *   completed   → status_category = 'Done'
 */
const ALLOWED_ISSUE_TYPES = [
    'Bug', 'Story', 'Business Task', 'Task', 'Hot Fix', 'Sec Remediation', 'Clarification',
]

export async function GET(request: NextRequest) {
    const { searchParams } = new URL(request.url)
    const sprintLabel = searchParams.get('sprintLabel')
    const category = searchParams.get('category')

    if (!sprintLabel || !category) {
        return NextResponse.json({ error: 'sprintLabel and category are required' }, { status: 400 })
    }

    const supabase = await createClient()

    // 1. Get sprint_ids for this sprint_label
    const { data: sprints, error: sprintError } = await supabase
        .from('jira_sprints')
        .select('sprint_id')
        .eq('sprint_label', sprintLabel)
        .not('workstream_code', 'is', null)

    if (sprintError || !sprints?.length) {
        return NextResponse.json({ issues: [] })
    }

    const sprintIds = sprints.map(s => s.sprint_id)

    // 2. Get all issue_ids in these sprints
    const { data: sprintIssues, error: siError } = await supabase
        .from('jira_sprint_issues')
        .select('jira_issue_id')
        .in('sprint_id', sprintIds)

    if (siError || !sprintIssues?.length) {
        return NextResponse.json({ issues: [] })
    }

    const issueIds = [...new Set(sprintIssues.map(si => si.jira_issue_id))]

    // 3. Get the issues with their details
    const { data: issues, error: issuesError } = await supabase
        .from('jira_issues')
        .select('jira_issue_id, jira_key, summary, status_name, status_category, issue_type, workstream, story_points')
        .in('jira_issue_id', issueIds)
        .in('issue_type', ALLOWED_ISSUE_TYPES)

    if (issuesError || !issues?.length) {
        return NextResponse.json({ issues: [] })
    }

    // 4. For carryover categories, we need to know how many sprint_labels each issue has
    // Get all sprint_label counts for matching issues
    const { data: allSprintIssues } = await supabase
        .from('jira_sprint_issues')
        .select('jira_issue_id, sprint_id')
        .in('jira_issue_id', issueIds)

    // Map sprint_id -> sprint_label
    const { data: allSprints } = await supabase
        .from('jira_sprints')
        .select('sprint_id, sprint_label')
        .not('sprint_label', 'is', null)
        .not('workstream_code', 'is', null)

    const sprintIdToLabel = new Map<number, string>()
    for (const s of allSprints || []) {
        sprintIdToLabel.set(s.sprint_id, s.sprint_label)
    }

    // Count distinct sprint_labels per issue
    const issueLabelCounts = new Map<string, number>()
    const issueSprintLabels = new Map<string, Set<string>>()
    for (const si of allSprintIssues || []) {
        const label = sprintIdToLabel.get(si.sprint_id)
        if (!label) continue
        if (!issueSprintLabels.has(si.jira_issue_id)) {
            issueSprintLabels.set(si.jira_issue_id, new Set())
        }
        issueSprintLabels.get(si.jira_issue_id)!.add(label)
    }
    for (const [id, labels] of issueSprintLabels) {
        issueLabelCounts.set(id, labels.size)
    }

    // 5. Filter by category
    const filtered = issues.filter(issue => {
        const labelCount = issueLabelCounts.get(issue.jira_issue_id) || 1
        switch (category) {
            case 'committed':
                return labelCount === 1
            case 'carryover':
                return labelCount === 2
            case 'carryover2x':
                return labelCount >= 3
            case 'completed':
                return issue.status_category === 'Done'
            default:
                return true
        }
    })

    // 6. Add sprint count info to each issue
    const result = filtered.map(issue => ({
        jira_key: issue.jira_key,
        summary: issue.summary,
        status: issue.status_name,
        statusCategory: issue.status_category,
        issueType: issue.issue_type,
        workstream: issue.workstream,
        storyPoints: issue.story_points,
        sprintCount: issueLabelCounts.get(issue.jira_issue_id) || 1,
    }))

    return NextResponse.json({ issues: result })
}
