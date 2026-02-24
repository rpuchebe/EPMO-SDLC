// Jira REST API v3 client for BPI project
const JIRA_BASE_URL = process.env.JIRA_BASE_URL!
const JIRA_EMAIL = process.env.JIRA_EMAIL!
const JIRA_API_TOKEN = process.env.JIRA_API_TOKEN!

const authHeader = `Basic ${Buffer.from(`${JIRA_EMAIL}:${JIRA_API_TOKEN}`).toString('base64')}`

interface JiraSearchResult {
    startAt: number
    maxResults: number
    total: number
    issues: JiraIssue[]
}

export interface JiraIssue {
    key: string
    fields: {
        summary: string
        status: {
            name: string
            statusCategory: { name: string }
        }
        assignee: {
            accountId: string
            displayName: string
            avatarUrls: { '48x48': string }
        } | null
        created: string
        resolutiondate: string | null
        [key: string]: unknown
    }
    changelog?: {
        histories: JiraHistory[]
    }
}

interface JiraHistory {
    created: string
    items: {
        field: string
        fromString: string | null
        toString: string | null
    }[]
}

export interface StatusTransition {
    jiraKey: string
    fromStatus: string | null
    toStatus: string | null
    transitionedAt: string
}

async function jiraFetch(path: string, options?: RequestInit): Promise<Response> {
    const url = `${JIRA_BASE_URL}/rest/api/3${path}`
    const res = await fetch(url, {
        ...options,
        headers: {
            'Authorization': authHeader,
            'Accept': 'application/json',
            'Content-Type': 'application/json',
            ...options?.headers,
        },
    })
    if (!res.ok) {
        const body = await res.text()
        throw new Error(`Jira API error ${res.status}: ${body}`)
    }
    return res
}

export async function searchAllIssues(
    jql: string,
    fields: string[],
    expandChangelog = false
): Promise<JiraIssue[]> {
    const allIssues: JiraIssue[] = []
    let startAt = 0
    const maxResults = 100

    while (true) {
        const params = new URLSearchParams({
            jql,
            fields: fields.join(','),
            startAt: String(startAt),
            maxResults: String(maxResults),
        })
        if (expandChangelog) {
            params.set('expand', 'changelog')
        }

        const res = await jiraFetch(`/search?${params}`)
        const data: JiraSearchResult = await res.json()

        allIssues.push(...data.issues)

        if (startAt + data.maxResults >= data.total) break
        startAt += data.maxResults
    }

    return allIssues
}

export function extractStatusTransitions(issue: JiraIssue): StatusTransition[] {
    if (!issue.changelog?.histories) return []

    const transitions: StatusTransition[] = []

    for (const history of issue.changelog.histories) {
        for (const item of history.items) {
            if (item.field === 'status') {
                transitions.push({
                    jiraKey: issue.key,
                    fromStatus: item.fromString,
                    toStatus: item.toString,
                    transitionedAt: history.created,
                })
            }
        }
    }

    return transitions
}
