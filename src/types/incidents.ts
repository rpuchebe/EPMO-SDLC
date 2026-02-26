export interface Incident {
    id: string
    jira_key: string
    product: string | null
    impact: 1 | 2 | 3 | 4 | null
    status?: string | null
    postmortem_linked_issues?: any[] | null
    postmortem_linked_count?: number | null
    created_at: string
    updated_at: string
}

export interface FollowUpTicket {
    id: string
    jira_key: string
    score: number | null
    linked_tickets_count: number
    is_complete: boolean
    linked_tickets: LinkedTicket[] | null
    created_at: string
}

export interface LinkedTicket {
    key: string
    project: string
    status: string
}

export interface WorkstreamIncidentTicket {
    id: string
    jira_key: string
    impact: 1 | 2 | 3 | 4 | null
    project_key: string | null
    status: string | null
    created_at: string
}

export interface IncidentSyncLog {
    id: string
    last_updated: string
}

export interface IncidentDashboardData {
    incidents: Incident[]
    followups: FollowUpTicket[]
    workstreamTickets: WorkstreamIncidentTicket[]
    lastSync: string | null
}
