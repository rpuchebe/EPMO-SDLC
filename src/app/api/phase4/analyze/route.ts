/**
 * POST /api/phase4/analyze
 *
 * Accepts a metrics payload from the Phase 4 Overview tab and returns an
 * AI-generated analysis using the Anthropic Claude API.
 *
 * Required env var: ANTHROPIC_API_KEY
 *
 * The endpoint is intentionally lightweight — it accepts the pre-computed
 * DTO fields so no additional DB access is needed.
 */

import { NextResponse } from 'next/server'

// ─── Types ────────────────────────────────────────────────────────────────────

interface TypeCardPayload {
    pct: number
    total: number
    completedCount: number
    completedPct: number
    avgAgeDays: number | null
    wowDelta: number
    wowPct: number
}

interface StatusRow {
    status: string
    category: string
    count: number
}

interface InvestmentRow {
    label: string
    count: number
    pct: number
}

interface AnalyzePayload {
    workstream: string
    team: string
    total: number
    done: number
    completionRate: number
    completionWoWDelta: number
    completionWoWPct: number
    completionMoMDelta: number
    completionMoMPct: number
    inProgress: number
    backlog: number
    avgBacklogAgeDays: number | null
    notInStandardStatusCount: number
    stories: TypeCardPayload
    bugsHotfix: TypeCardPayload
    tasks: TypeCardPayload
    other: TypeCardPayload
    topStatuses: StatusRow[]
    topInvestment: InvestmentRow[]
}

// ─── Prompt builder ───────────────────────────────────────────────────────────

function buildPrompt(p: AnalyzePayload): string {
    const ws = p.workstream !== 'All Workstreams' ? p.workstream : 'all workstreams'
    const team = p.team !== 'All Teams' ? ` / ${p.team}` : ''
    const wow = p.completionWoWDelta >= 0 ? `+${p.completionWoWDelta}` : `${p.completionWoWDelta}`
    const mom = p.completionMoMDelta >= 0 ? `+${p.completionMoMDelta}` : `${p.completionMoMDelta}`
    const avgAge = p.avgBacklogAgeDays !== null ? `${p.avgBacklogAgeDays} days` : 'unknown'

    const statusLines = p.topStatuses
        .slice(0, 6)
        .map(s => `  • ${s.status} (${s.category}): ${s.count}`)
        .join('\n')

    const invLines = p.topInvestment
        .slice(0, 5)
        .map(i => `  • ${i.label}: ${i.count} issues (${i.pct}%)`)
        .join('\n')

    return `You are an engineering program manager analyzing sprint delivery metrics.
Provide a concise, professional analysis for the following dataset.

SCOPE: ${ws}${team}
TOTAL WORK ITEMS: ${p.total}

## COMPLETION
- Completion rate: ${p.completionRate}% (${p.done}/${p.total} done)
- WoW throughput change: ${wow} items (${p.completionWoWPct > 0 ? '+' : ''}${p.completionWoWPct}%)
- MoM throughput change: ${mom} items (${p.completionMoMPct > 0 ? '+' : ''}${p.completionMoMPct}%)

## WORK IN PROGRESS & BACKLOG
- In Progress: ${p.inProgress} items
- Backlog (To Do): ${p.backlog} items | Avg age: ${avgAge}
- Items with non-standard status: ${p.notInStandardStatusCount}

## ISSUE TYPE BREAKDOWN
- Stories: ${p.stories.pct}% of items | ${p.stories.completedPct}% completed | avg age to complete: ${p.stories.avgAgeDays ?? '—'} days
- Bugs/Hot Fix: ${p.bugsHotfix.pct}% of items | ${p.bugsHotfix.completedPct}% completed | avg age to complete: ${p.bugsHotfix.avgAgeDays ?? '—'} days | WoW done: ${p.bugsHotfix.wowDelta >= 0 ? '+' : ''}${p.bugsHotfix.wowDelta}
- Tasks: ${p.tasks.pct}% of items | ${p.tasks.completedPct}% completed | avg age to complete: ${p.tasks.avgAgeDays ?? '—'} days
- Other: ${p.other.pct}% of items | ${p.other.completedPct}% completed

## STATUS DISTRIBUTION (top statuses)
${statusLines || '  No data'}

## INVESTMENT ALLOCATION (top categories)
${invLines || '  No data'}

---

Please provide a structured analysis with the following sections:

**Key Insights** (2-3 bullet points about notable patterns or achievements)

**Risks** (2-3 bullet points identifying concerns based on the data — e.g. high bug ratio, stale backlog, WIP limits, slow resolution time)

**Sprint Hygiene Opportunities** (2-3 actionable suggestions to improve delivery predictability and process quality)

**Suggested Actions** (3-4 specific, prioritized actions the team should take this sprint)

Keep each section concise. Use plain English. Reference specific numbers from the data where relevant.`
}

// ─── Handler ──────────────────────────────────────────────────────────────────

export async function POST(req: Request) {
    const apiKey = process.env.ANTHROPIC_API_KEY
    if (!apiKey) {
        return NextResponse.json(
            { error: 'ANTHROPIC_API_KEY is not configured. Set it in .env.local to enable AI analysis.' },
            { status: 503 },
        )
    }

    let payload: AnalyzePayload
    try {
        payload = await req.json() as AnalyzePayload
    } catch {
        return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 })
    }

    const prompt = buildPrompt(payload)

    try {
        const response = await fetch('https://api.anthropic.com/v1/messages', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'x-api-key': apiKey,
                'anthropic-version': '2023-06-01',
            },
            body: JSON.stringify({
                model: 'claude-haiku-4-5-20251001',
                max_tokens: 1024,
                messages: [
                    { role: 'user', content: prompt },
                ],
            }),
        })

        if (!response.ok) {
            const err = await response.text()
            console.error('[phase4/analyze] Anthropic API error:', response.status, err)
            return NextResponse.json(
                { error: `AI service error (${response.status}). Check server logs.` },
                { status: 502 },
            )
        }

        const data = await response.json() as {
            content: Array<{ type: string; text: string }>
        }
        const text = data.content?.find(c => c.type === 'text')?.text ?? 'No analysis returned.'

        return NextResponse.json({ analysis: text })
    } catch (err) {
        console.error('[phase4/analyze] Unexpected error:', err)
        return NextResponse.json(
            { error: 'Unexpected error calling AI service. Check server logs.' },
            { status: 500 },
        )
    }
}
