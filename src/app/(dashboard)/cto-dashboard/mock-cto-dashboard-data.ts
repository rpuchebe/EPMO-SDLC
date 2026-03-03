// ---------------------------------------------------------------------------
// CTO Dashboard – Mock Data
// ---------------------------------------------------------------------------
// All values are hardcoded for now.
// To wire up real data, replace this file's exports with Supabase queries.
// ---------------------------------------------------------------------------

export interface WorkstreamRow {
    name: string
    velocity: number
    predictability: number
    changeFailureRate: number
    mttr: number
    i1a: number
    uptime: number
}

export interface SprintDataPoint {
    sprint: string
    velocity: number
    predictability: number
}

export interface IncidentDataPoint {
    week: string
    mttr: number
    i1aCount: number
}

export const mockCtoDashboardData = {
    /** ISO timestamp shown in the page header */
    lastUpdated: '2026-03-01T10:00:00Z',

    kpis: {
        teamVelocity: {
            /** Story points completed this sprint */
            completed: 108,
            /** Story points committed this sprint */
            committed: 120,
            /** Change vs last week (completed SP) */
            deltaAbsolute: 5,
            deltaPercent: 4.8,
            sparkline: [85, 90, 95, 102, 110, 108],
            helperText: 'Story points completed vs committed',
        },
        predictability: {
            /** % issues completed on time */
            value: 90,
            deltaAbsolute: 2,
            deltaPercent: 2.3,
            sparkline: [82, 85, 87, 88, 88, 90],
            helperText: '% issues completed on time',
        },
        changeFailureRate: {
            /** % deployments causing an incident */
            value: 3.2,
            deltaAbsolute: -0.8,
            deltaPercent: -20,
            sparkline: [5.5, 5.0, 4.5, 4.0, 4.0, 3.2],
            helperText: '% deployments causing incidents',
        },
        mttr: {
            /** Mean time to recovery in hours */
            value: 2.4,
            deltaAbsolute: -0.6,
            deltaPercent: -20,
            sparkline: [4.5, 4.0, 3.5, 3.2, 3.0, 2.4],
            helperText: 'Mean time to recovery (hours)',
        },
        customerImpactingI1a: {
            /** Count of customer-impacting P1a incidents */
            value: 1,
            deltaAbsolute: -2,
            deltaPercent: -67,
            sparkline: [5, 4, 3, 3, 3, 1],
            helperText: 'Customer-impacting P1a incidents',
        },
        systemUptime: {
            /** Overall system availability % */
            value: 99.94,
            deltaAbsolute: 0.02,
            deltaPercent: 0.02,
            sparkline: [99.85, 99.88, 99.9, 99.92, 99.92, 99.94],
            helperText: 'Overall system availability',
        },
    },

    /** Sprint-by-sprint velocity & predictability for the trend chart */
    sprintTrend: [
        { sprint: 'S-42', velocity: 98, predictability: 85 },
        { sprint: 'S-43', velocity: 102, predictability: 87 },
        { sprint: 'S-44', velocity: 105, predictability: 88 },
        { sprint: 'S-45', velocity: 110, predictability: 88 },
        { sprint: 'S-46', velocity: 112, predictability: 90 },
        { sprint: 'S-47', velocity: 108, predictability: 90 },
    ] as SprintDataPoint[],

    /** Week-by-week MTTR and I1a volume for the incidents trend chart */
    incidentsTrend: [
        { week: 'W-47', mttr: 4.5, i1aCount: 5 },
        { week: 'W-48', mttr: 4.0, i1aCount: 4 },
        { week: 'W-49', mttr: 3.5, i1aCount: 3 },
        { week: 'W-50', mttr: 3.2, i1aCount: 3 },
        { week: 'W-51', mttr: 3.0, i1aCount: 3 },
        { week: 'W-52', mttr: 2.4, i1aCount: 1 },
    ] as IncidentDataPoint[],

    /** Per-workstream summary table rows */
    workstreamSummary: [
        { name: 'Platform Engineering', velocity: 42, predictability: 92, changeFailureRate: 2.1, mttr: 1.8, i1a: 0, uptime: 99.98 },
        { name: 'Consumer Products', velocity: 28, predictability: 89, changeFailureRate: 4.2, mttr: 3.1, i1a: 1, uptime: 99.91 },
        { name: 'Data & Analytics', velocity: 18, predictability: 86, changeFailureRate: 1.8, mttr: 2.0, i1a: 0, uptime: 99.97 },
        { name: 'Enterprise Integrations', velocity: 12, predictability: 83, changeFailureRate: 5.5, mttr: 3.8, i1a: 0, uptime: 99.87 },
        { name: 'Mobile', velocity: 8, predictability: 75, changeFailureRate: 6.0, mttr: 4.2, i1a: 0, uptime: 99.82 },
    ] as WorkstreamRow[],
}
