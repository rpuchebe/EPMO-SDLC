import { openai } from '@ai-sdk/openai';
import { streamText, tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/utils/supabase/server';

// Construct the system prompt using context about the SDLC (Software Development Life Cycle) Central Hub
const systemPrompt = `
You are RayBot, a senior Engineering + Delivery advisor, Agile coach, and PMO officer for the SDLC Central Hub portal.
Your goal is to assist users with questions about the SDLC portal, the reports they are viewing, Phase definitions, KPIs, and general Agile/PMO best practices.

Here is the context about this SDLC Portal platform:
- The platform tracks IT and Engineering Projects through different Phases.
- **Phase 0 (Ideation & Discovery - BPI Items):** This is where "Ideas" are born. It focuses on the business case, high-level sizing, and BPI (Business Process Improvement) tracking. If a user asks for "Ideas" or "BPIs", they refer to Phase 0 data.
- **Phase 1 (Planning):** Detailed planning, resource allocation, finalizing the scope, and establishing baselines for schedule and cost.
- **Phase 2 (Design & Build):** Actual development, UI/UX design, architecture, and coding the solution.
- **Phase 3 (Testing & Deployment):** QA, UAT (User Acceptance Testing), security reviews, and pushing the code to production.
- **Phase 4 (Closure & Value Realization):** Post-launch review, tracking ROI (Return on Investment), measuring KPIs and BWI (Business Value Index).

When users ask about reports (e.g., "what is this report for?"):
- The portal has Overviews, Scope & Schedule, Financials, Resources & Quality, and Risks/Issues tabs.
- If they ask how to read it, explain that they should look at health indicators (Green/Yellow/Red), the current phase, and any active blockers.

When users ask "how to improve my numbers on this KPI":
- Provide senior Agile coaching advice. For SPI (Schedule), suggest smaller sprint slicing or resolving blockers. For CPI (Cost), suggest reviewing resource allocation. For Quality, suggest more automated testing or better code reviews.

Rules for responding:
1. Always be professional, encouraging, and clear.
2. Structure your answers with bullet points or short paragraphs for readability.
3. Answer questions directly using the provided context or your general knowledge as an Agile/PMO expert.
4. Keep the tone helpful and authoritative but friendly.
`;

export const runtime = 'edge';
export const maxDuration = 30; // Max execution time for Vercel

export async function POST(req: Request) {
    try {
        const { messages, pathname, pageContext } = await req.json();

        const dynamicSystemPrompt = `
${systemPrompt}

### CURRENT REPORT CONTEXT
The user is currently navigating the page: ${pathname || "Unknown"}
Here is a raw text extract of the data and reports currently visible on the screen:
"""
${pageContext || "No context available"}
"""

CRITICAL INSTRUCTIONS:
1. When the user asks about the data or reports, USE the "CURRENT REPORT CONTEXT" above to answer.
2. If the user asks for an action plan or insights, base it on the numbers/data seen in the raw extract above. 
3. DO NOT SAY "As an AI I don't have access to your data or real-time data." You DO have access to the data in the data extract above. Read it and answer confidently.
4. KEEP YOUR ANSWERS SHORT AND CONCISE. Maximum 3 to 4 sentences unless the user explicitly requests a long plan. Focus on being actionable.
        `;

        const result = await streamText({
            model: openai('gpt-4o-mini'),
            system: dynamicSystemPrompt,
            messages,
            temperature: 0.7,
            // @ts-ignore
            maxSteps: 5,
            tools: {
                getPhaseSummary: tool({
                    description: 'Busca el resumen de datos (KPIs y métricas) para una fase específica del SDLC (0-5). Fase 0 es para "Ideas" y "BPI".',
                    parameters: z.object({
                        phase: z.number().min(0).max(5).describe('El número de la fase a consultar'),
                        workstream: z.string().optional().describe('Opcional: Filtrar por el nombre del workstream mencionado (ej. "Enterprise Governance")')
                    }),
                    execute: async ({ phase, workstream }) => {
                        try {
                            const supabase = await createClient();

                            if (phase === 0) {
                                let query = supabase.from('bpi_tickets').select('status, jira_key');
                                if (workstream) {
                                    query = query.ilike('workstream', `%${workstream}%`);
                                }
                                const { data: tickets } = await query;
                                if (!tickets || tickets.length === 0) return { error: `No se encontraron ideas para ${workstream || 'todos los workstreams'}` };

                                const total = tickets.length;
                                const distribution = tickets.reduce((acc: any, t) => {
                                    acc[t.status] = (acc[t.status] || 0) + 1;
                                    return acc;
                                }, {});

                                return {
                                    title: "Phase 0 - Ideation (Ideas/BPI)",
                                    total_ideas_submitted: total,
                                    status_distribution: distribution,
                                    workstream_filter: workstream || 'All'
                                };
                            }

                            // Fallback para otras fases
                            const tableMap: Record<number, string> = {
                                1: 'planning_tickets',
                                2: 'development_tickets',
                                3: 'testing_tickets',
                                4: 'closure_tickets',
                                5: 'governance_data'
                            };

                            const tableName = tableMap[phase as keyof typeof tableMap];
                            if (!tableName) return { error: "Fase no soportada para consulta directa aún." };

                            const { count, error } = await supabase.from(tableName).select('*', { count: 'exact', head: true });
                            if (error) return { error: `Error consultando base de datos: ${error.message}` };

                            return {
                                phase: phase,
                                status: "Connected",
                                total_items_tracked: count || 0
                            };
                        } catch (e) {
                            return { error: "Failed to connect to data storage." };
                        }
                    }
                })
            }
        });

        return result.toAIStreamResponse();
    } catch (error) {
        console.error('Chat API Error:', error);
        return new Response(JSON.stringify({ error: 'Failed to process chat' }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
