import { NextResponse } from 'next/server'

// ──── MOCK DATA for Phase 5 – Deployment & Release Governance ────

function generateSparkline(base: number, length = 8): number[] {
    return Array.from({ length }, (_, i) =>
        Math.max(0, Math.round(base + (Math.random() - 0.45) * base * 0.4))
    )
}

function generateTrend(points: number, baseValue: number, variance = 0.3) {
    return Array.from({ length: points }, (_, i) => ({
        label: `W${i + 1}`,
        value: Math.max(0, +(baseValue + (Math.random() - 0.5) * baseValue * variance).toFixed(1))
    }))
}

const mockReleases = [
    { id: 'REL-101', name: 'Sprint 22 Release', type: 'Planned', workstream: 'MAPS', product: 'Core Platform', sprint: 'Sprint 22', status: 'Completed', onSchedule: true, sandboxDate: '2026-01-10T08:00:00Z', prodDate: '2026-01-13T14:00:00Z', scopeChanges: false, hotfixCollision: false, regressionDelay: false, rollback: false, incidents: 0 },
    { id: 'REL-102', name: 'Hotfix Payment Gateway', type: 'Hotfix', workstream: 'EG', product: 'Payments', sprint: 'Sprint 22', status: 'Completed', onSchedule: false, sandboxDate: '2026-01-14T10:00:00Z', prodDate: '2026-01-14T18:00:00Z', scopeChanges: true, hotfixCollision: true, regressionDelay: false, rollback: false, incidents: 1 },
    { id: 'REL-103', name: 'Sprint 23 Release', type: 'Planned', workstream: 'PCE', product: 'Analytics', sprint: 'Sprint 23', status: 'Completed', onSchedule: true, sandboxDate: '2026-01-20T09:00:00Z', prodDate: '2026-01-24T14:00:00Z', scopeChanges: false, hotfixCollision: false, regressionDelay: false, rollback: false, incidents: 0 },
    { id: 'REL-104', name: 'Sprint 23 Release B', type: 'Planned', workstream: 'MAPS', product: 'Core Platform', sprint: 'Sprint 23', status: 'Completed', onSchedule: true, sandboxDate: '2026-01-22T08:00:00Z', prodDate: '2026-01-26T10:00:00Z', scopeChanges: true, hotfixCollision: false, regressionDelay: true, rollback: false, incidents: 0 },
    { id: 'REL-105', name: 'Hotfix Auth Service', type: 'Hotfix', workstream: 'SEC', product: 'Security', sprint: 'Sprint 23', status: 'Completed', onSchedule: false, sandboxDate: '2026-01-25T12:00:00Z', prodDate: '2026-01-25T20:00:00Z', scopeChanges: false, hotfixCollision: false, regressionDelay: false, rollback: true, incidents: 2 },
    { id: 'REL-106', name: 'Sprint 24 Release', type: 'Planned', workstream: 'EG', product: 'Payments', sprint: 'Sprint 24', status: 'Completed', onSchedule: true, sandboxDate: '2026-02-03T09:00:00Z', prodDate: '2026-02-06T14:00:00Z', scopeChanges: false, hotfixCollision: false, regressionDelay: false, rollback: false, incidents: 0 },
    { id: 'REL-107', name: 'Sprint 24 Release B', type: 'Planned', workstream: 'PCE', product: 'Analytics', sprint: 'Sprint 24', status: 'Completed', onSchedule: false, sandboxDate: '2026-02-05T08:00:00Z', prodDate: '2026-02-07T16:00:00Z', scopeChanges: true, hotfixCollision: false, regressionDelay: true, rollback: false, incidents: 1 },
    { id: 'REL-108', name: 'Hotfix Reporting Bug', type: 'Hotfix', workstream: 'MAPS', product: 'Core Platform', sprint: 'Sprint 24', status: 'Completed', onSchedule: false, sandboxDate: '2026-02-08T10:00:00Z', prodDate: '2026-02-08T15:00:00Z', scopeChanges: false, hotfixCollision: true, regressionDelay: false, rollback: false, incidents: 0 },
    { id: 'REL-109', name: 'Sprint 25 Release', type: 'Planned', workstream: 'MAPS', product: 'Core Platform', sprint: 'Sprint 25', status: 'Completed', onSchedule: true, sandboxDate: '2026-02-15T08:00:00Z', prodDate: '2026-02-19T14:00:00Z', scopeChanges: false, hotfixCollision: false, regressionDelay: false, rollback: false, incidents: 0 },
    { id: 'REL-110', name: 'Sprint 25 Release B', type: 'Planned', workstream: 'SEC', product: 'Security', sprint: 'Sprint 25', status: 'Completed', onSchedule: true, sandboxDate: '2026-02-17T09:00:00Z', prodDate: '2026-02-21T11:00:00Z', scopeChanges: false, hotfixCollision: false, regressionDelay: false, rollback: false, incidents: 0 },
    { id: 'REL-111', name: 'Sprint 26 Release', type: 'Planned', workstream: 'EG', product: 'Payments', sprint: 'Sprint 26', status: 'In Progress', onSchedule: true, sandboxDate: '2026-02-24T08:00:00Z', prodDate: null, scopeChanges: false, hotfixCollision: false, regressionDelay: false, rollback: false, incidents: 0 },
    { id: 'REL-112', name: 'Hotfix Mobile Crash', type: 'Hotfix', workstream: 'MAPS', product: 'Mobile', sprint: 'Sprint 26', status: 'Completed', onSchedule: false, sandboxDate: '2026-02-25T11:00:00Z', prodDate: '2026-02-25T16:00:00Z', scopeChanges: true, hotfixCollision: false, regressionDelay: false, rollback: false, incidents: 1 },
]

const mockIncidents = [
    { releaseId: 'REL-102', detected: '2026-01-14T19:30:00Z', resolved: '2026-01-14T21:00:00Z', severity: 'High' },
    { releaseId: 'REL-105', detected: '2026-01-25T22:00:00Z', resolved: '2026-01-26T02:30:00Z', severity: 'Critical' },
    { releaseId: 'REL-105', detected: '2026-01-26T08:00:00Z', resolved: '2026-01-26T09:15:00Z', severity: 'Medium' },
    { releaseId: 'REL-107', detected: '2026-02-07T18:00:00Z', resolved: '2026-02-07T19:30:00Z', severity: 'Medium' },
    { releaseId: 'REL-112', detected: '2026-02-25T17:00:00Z', resolved: '2026-02-25T18:45:00Z', severity: 'High' },
]

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url)
    const workstream = searchParams.get('workstream') || 'All'
    const product = searchParams.get('product') || 'All'
    const sprint = searchParams.get('sprint') || 'All'
    const releaseType = searchParams.get('releaseType') || 'All'

    // Filter releases
    let filtered = [...mockReleases]
    if (workstream !== 'All') filtered = filtered.filter(r => r.workstream === workstream)
    if (product !== 'All') filtered = filtered.filter(r => r.product === product)
    if (sprint !== 'All') filtered = filtered.filter(r => r.sprint === sprint)
    if (releaseType !== 'All') filtered = filtered.filter(r => r.type === releaseType)

    const completed = filtered.filter(r => r.status === 'Completed')
    const planned = filtered.filter(r => r.type === 'Planned')
    const hotfixes = filtered.filter(r => r.type === 'Hotfix')

    // ── Section 2: Release Volume ──
    const totalReleases = filtered.length
    const plannedPct = totalReleases > 0 ? Math.round((planned.length / totalReleases) * 100) : 0
    const hotfixPct = totalReleases > 0 ? 100 - plannedPct : 0
    const onSchedulePct = completed.length > 0
        ? Math.round((completed.filter(r => r.onSchedule).length / completed.length) * 100)
        : 0
    const uniqueSprints = [...new Set(filtered.map(r => r.sprint))]
    const avgPerSprint = uniqueSprints.length > 0
        ? +(totalReleases / uniqueSprints.length).toFixed(1)
        : 0

    const releaseVolume = {
        totalReleases,
        totalPrevQuarter: 9,
        plannedPct,
        hotfixPct,
        plannedPctPrev: 78,
        hotfixPctPrev: 22,
        onSchedulePct,
        onSchedulePctPrev: 82,
        avgPerSprint,
        avgPerSprintPrev: 1.8,
        sparklines: {
            total: generateSparkline(totalReleases / 4),
            planned: generateSparkline(plannedPct, 8),
            onSchedule: generateSparkline(onSchedulePct / 10, 8),
            avgPerSprint: generateSparkline(Math.round(avgPerSprint), 8),
        }
    }

    // ── Section 3: Cycle Time Metrics ──
    const cycleTime = {
        regressionToProd: { current: 4.2, unit: 'days', sla: 5, trend: generateTrend(12, 4.2) },
        dipCreationToApproval: { current: 1.8, unit: 'days', sla: 2, trend: generateTrend(12, 1.8) },
        sandboxToProdGap: { current: 82, unit: 'hours', sla: 72, trend: generateTrend(12, 82) },
        sandboxDeployDuration: { current: 35, unit: 'min', sla: 45, trend: generateTrend(12, 35) },
        prodDeployDuration: { current: 42, unit: 'min', sla: 60, trend: generateTrend(12, 42) },
    }

    // ── Section 4: Risk Indicators ──
    const scopeChangeReleases = completed.filter(r => r.scopeChanges).length
    const hotfixCollisionReleases = completed.filter(r => r.hotfixCollision).length
    const regressionDelayReleases = completed.filter(r => r.regressionDelay).length
    const failedRollbacks = completed.filter(r => r.rollback).length

    const riskIndicators = {
        scopeChangePct: completed.length > 0 ? Math.round((scopeChangeReleases / completed.length) * 100) : 0,
        scopeChangeThreshold: 15,
        hotfixCollisionPct: completed.length > 0 ? Math.round((hotfixCollisionReleases / completed.length) * 100) : 0,
        hotfixCollisionThreshold: 10,
        regressionDelayPct: completed.length > 0 ? Math.round((regressionDelayReleases / completed.length) * 100) : 0,
        regressionDelayThreshold: 10,
        failedDeployments: failedRollbacks,
        failedDeploymentThreshold: 1,
    }

    // ── Section 5: Governance Score ──
    const governanceDimensions = [
        { name: 'DIP Finalised On Time', score: 88, weight: 0.25 },
        { name: 'TSD Completion Rate', score: 92, weight: 0.20 },
        { name: 'DOR & DOD Checklist Completion', score: 78, weight: 0.20 },
        { name: 'TSD Approval SLA Adherence', score: 85, weight: 0.15 },
        { name: '72-Hour Sandbox → Production Rule', score: 72, weight: 0.20 },
    ]
    const overallScore = Math.round(
        governanceDimensions.reduce((acc, d) => acc + d.score * d.weight, 0)
    )

    const governance = {
        overallScore,
        dimensions: governanceDimensions,
    }

    // ── Section 6: Incident & Stability ──
    const relatedIncidents = mockIncidents.filter(inc => {
        const rel = filtered.find(r => r.id === inc.releaseId)
        return !!rel
    })

    const totalIncidents = relatedIncidents.length
    const incidentsPerRelease = completed.length > 0
        ? +(totalIncidents / completed.length).toFixed(2)
        : 0

    const mttdMinutes = relatedIncidents.map(inc => {
        const rel = mockReleases.find(r => r.id === inc.releaseId)
        if (!rel?.prodDate) return 0
        return (new Date(inc.detected).getTime() - new Date(rel.prodDate).getTime()) / 60000
    })
    const avgMTTD = mttdMinutes.length > 0
        ? Math.round(mttdMinutes.reduce((a, b) => a + b, 0) / mttdMinutes.length)
        : 0

    const mttrMinutes = relatedIncidents.map(inc =>
        (new Date(inc.resolved).getTime() - new Date(inc.detected).getTime()) / 60000
    )
    const avgMTTR = mttrMinutes.length > 0
        ? Math.round(mttrMinutes.reduce((a, b) => a + b, 0) / mttrMinutes.length)
        : 0

    // Last 6 releases trend
    const last6 = completed.slice(-6)
    const incidentTrend = last6.map(rel => ({
        release: rel.name.length > 18 ? rel.name.substring(0, 18) + '…' : rel.name,
        incidents: mockIncidents.filter(i => i.releaseId === rel.id).length,
    }))

    const incidents = {
        totalIncidents,
        totalIncidentsPrev: 3,
        incidentsPerRelease,
        incidentsPerReleasePrev: 0.33,
        avgMTTD,
        avgMTTDPrev: 50,
        avgMTTR,
        avgMTTRPrev: 80,
        trend: incidentTrend,
        tolerancePerRelease: 0.5,
    }

    // ── Section 7: AI Insights ──
    const aiInsights = [
        {
            category: 'Bottleneck',
            icon: '⚠️',
            text: 'DIP approval delays are correlated with 62% of releases missing the 72-hour sandbox-to-production gap. Recommend streamlining DIP review workflows.',
        },
        {
            category: 'Correlation',
            icon: '🔗',
            text: `Hotfix releases have a ${(totalIncidents > 0 ? 80 : 0)}% higher incident rate than planned releases. Consider extending regression testing for expedited deploys.`,
        },
        {
            category: 'Governance',
            icon: '📋',
            text: 'DOR & DOD checklist completion has dropped 8% over the last 3 sprints. Teams MAPS and PCE are the primary contributors to non-compliance.',
        },
        {
            category: 'Recommendation',
            icon: '💡',
            text: 'Introducing automated gate checks for scope freeze at regression start could reduce last-minute scope changes by an estimated 40%.',
        },
    ]

    // ── Filter Options ──
    const filterOptions = {
        workstreams: ['All', ...new Set(mockReleases.map(r => r.workstream))],
        products: ['All', ...new Set(mockReleases.map(r => r.product))],
        sprints: ['All', ...new Set(mockReleases.map(r => r.sprint))],
        releaseTypes: ['All', 'Planned', 'Hotfix'],
    }

    return NextResponse.json({
        releaseVolume,
        cycleTime,
        riskIndicators,
        governance,
        incidents,
        aiInsights,
        filterOptions,
        lastSync: new Date().toISOString(),
    })
}
