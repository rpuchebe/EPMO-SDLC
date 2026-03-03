'use client'

import {
    Activity,
    Target,
    ShieldAlert,
    Clock,
    AlertCircle,
    Server,
    TrendingUp,
    TrendingDown,
    Minus,
    CalendarClock,
    InboxIcon,
} from 'lucide-react'
import {
    ComposedChart,
    Bar,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from 'recharts'
import { DashboardCard } from '@/components/ui/dashboard-card'
import { mockCtoDashboardData, type WorkstreamRow } from './mock-cto-dashboard-data'

// ─── Helpers ────────────────────────────────────────────────────────────────

function formatLastUpdated(iso: string) {
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
    })
}

// ─── Table cell helpers ──────────────────────────────────────────────────────

function UptimeCell({ value }: { value: number }) {
    const color = value >= 99.9 ? 'text-emerald-700' : value >= 99.0 ? 'text-amber-700' : 'text-rose-700'
    return <span className={`font-semibold ${color}`}>{value.toFixed(2)}%</span>
}

function PredictabilityCell({ value }: { value: number }) {
    const color = value >= 90 ? 'text-emerald-700' : value >= 80 ? 'text-amber-700' : 'text-rose-700'
    return <span className={`font-semibold ${color}`}>{value}%</span>
}

function I1aCell({ value }: { value: number }) {
    if (value === 0) return <span className="font-semibold text-emerald-700">0</span>
    return <span className="font-semibold text-rose-700">{value}</span>
}

function CfrCell({ value }: { value: number }) {
    const color = value < 3 ? 'text-emerald-700' : value < 5 ? 'text-amber-700' : 'text-rose-700'
    return <span className={`font-semibold ${color}`}>{value}%</span>
}

function MttrCell({ value }: { value: number }) {
    const color = value <= 2 ? 'text-emerald-700' : value <= 4 ? 'text-amber-700' : 'text-rose-700'
    return <span className={`font-semibold ${color}`}>{value}h</span>
}

// ─── Workstream Table ────────────────────────────────────────────────────────

function WorkstreamTable({ rows }: { rows: WorkstreamRow[] }) {
    if (rows.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-16 text-slate-400">
                <InboxIcon className="w-10 h-10 mb-3 opacity-40" />
                <p className="text-sm font-medium">No workstream data available</p>
            </div>
        )
    }

    return (
        <div className="overflow-x-auto">
            <table className="w-full text-sm">
                <thead>
                    <tr className="border-b border-slate-100">
                        <th className="text-left py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Workstream</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Velocity (SP)</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Predictability</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">CFR</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">MTTR</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">I1a</th>
                        <th className="text-right py-3 px-4 text-[11px] font-bold text-slate-500 uppercase tracking-wider">Uptime</th>
                    </tr>
                </thead>
                <tbody>
                    {rows.map((row, i) => (
                        <tr
                            key={row.name}
                            className={`border-b border-slate-50 hover:bg-slate-50/60 transition-colors ${i === rows.length - 1 ? 'border-b-0' : ''}`}
                        >
                            <td className="py-3.5 px-4 font-medium text-slate-800">{row.name}</td>
                            <td className="py-3.5 px-4 text-right font-semibold text-slate-700">{row.velocity}</td>
                            <td className="py-3.5 px-4 text-right"><PredictabilityCell value={row.predictability} /></td>
                            <td className="py-3.5 px-4 text-right"><CfrCell value={row.changeFailureRate} /></td>
                            <td className="py-3.5 px-4 text-right"><MttrCell value={row.mttr} /></td>
                            <td className="py-3.5 px-4 text-right"><I1aCell value={row.i1a} /></td>
                            <td className="py-3.5 px-4 text-right"><UptimeCell value={row.uptime} /></td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    )
}

// ─── Empty chart state ───────────────────────────────────────────────────────

function EmptyChart() {
    return (
        <div className="flex flex-col items-center justify-center h-[220px] text-slate-400">
            <InboxIcon className="w-8 h-8 mb-2 opacity-40" />
            <p className="text-xs font-medium">No data available</p>
        </div>
    )
}

// ─── Custom Tooltip ──────────────────────────────────────────────────────────

function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="bg-white border border-slate-200 rounded-xl shadow-lg px-3 py-2 text-xs">
            <p className="font-bold text-slate-700 mb-1">{label}</p>
            {payload.map((p: any) => (
                <p key={p.dataKey} style={{ color: p.color }} className="leading-snug">
                    {p.name}: <span className="font-semibold">{p.value}</span>
                </p>
            ))}
        </div>
    )
}

// ─── Main component ──────────────────────────────────────────────────────────

export function CtoDashboardClient() {
    const { kpis, sprintTrend, incidentsTrend, workstreamSummary, lastUpdated } = mockCtoDashboardData

    return (
        <div className="flex flex-col gap-6 w-full animate-in fade-in duration-500">

            {/* ── Header ──────────────────────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm px-6 py-5">
                <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                    <div>
                        <h1 className="text-xl font-bold text-slate-900 tracking-tight">CTO Dashboard</h1>
                        <p className="text-sm text-slate-500 mt-0.5 font-medium">
                            Engineering &amp; Delivery Health
                            <span className="ml-2 inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                Mock Data
                            </span>
                        </p>
                    </div>
                    <div className="flex items-center gap-1.5 text-[12px] text-slate-400 shrink-0">
                        <CalendarClock className="w-3.5 h-3.5" />
                        <span>Last updated: <span className="font-medium text-slate-600">{formatLastUpdated(lastUpdated)}</span></span>
                    </div>
                </div>
            </div>

            {/* ── Row 1: KPI Cards ────────────────────────────────────────── */}
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">

                {/* Team Velocity */}
                <DashboardCard
                    id="cto-velocity"
                    label="Team Velocity"
                    icon={Activity}
                    iconColor="text-indigo-600"
                    iconBg="bg-indigo-50"
                    accentHex="#4f46e5"
                    value={kpis.teamVelocity.completed}
                    deltaAbsolute={kpis.teamVelocity.deltaAbsolute}
                    deltaPercent={kpis.teamVelocity.deltaPercent}
                    sparkline={kpis.teamVelocity.sparkline}
                    metrics={[
                        { label: 'Committed SP', value: kpis.teamVelocity.committed },
                        { label: 'Ratio', value: `${Math.round((kpis.teamVelocity.completed / kpis.teamVelocity.committed) * 100)}%` },
                    ]}
                />

                {/* Predictability */}
                <DashboardCard
                    id="cto-predictability"
                    label="Predictability"
                    icon={Target}
                    iconColor="text-emerald-600"
                    iconBg="bg-emerald-50"
                    accentHex="#10b981"
                    value={`${kpis.predictability.value}%`}
                    deltaAbsolute={kpis.predictability.deltaAbsolute}
                    deltaPercent={kpis.predictability.deltaPercent}
                    sparkline={kpis.predictability.sparkline}
                    metrics={[
                        { label: 'Target', value: '95%' },
                        { label: 'Gap to target', value: `${kpis.predictability.value - 95} pts` },
                    ]}
                />

                {/* Change Failure Rate */}
                <DashboardCard
                    id="cto-cfr"
                    label="Change Failure Rate"
                    icon={ShieldAlert}
                    iconColor="text-rose-600"
                    iconBg="bg-rose-50"
                    accentHex="#f43f5e"
                    value={`${kpis.changeFailureRate.value}%`}
                    deltaAbsolute={kpis.changeFailureRate.deltaAbsolute}
                    deltaPercent={kpis.changeFailureRate.deltaPercent}
                    inverseGood
                    sparkline={kpis.changeFailureRate.sparkline}
                    metrics={[
                        { label: 'Industry target', value: '< 5%' },
                        { label: 'Trend', value: '↓ Improving' },
                    ]}
                />

                {/* MTTR */}
                <DashboardCard
                    id="cto-mttr"
                    label="MTTR"
                    icon={Clock}
                    iconColor="text-amber-600"
                    iconBg="bg-amber-50"
                    accentHex="#f59e0b"
                    value={`${kpis.mttr.value}h`}
                    deltaAbsolute={kpis.mttr.deltaAbsolute}
                    deltaPercent={kpis.mttr.deltaPercent}
                    inverseGood
                    sparkline={kpis.mttr.sparkline}
                    metrics={[
                        { label: 'Target', value: '< 4h' },
                        { label: 'Status', value: '✓ On target' },
                    ]}
                />

                {/* Customer Impacting I1a */}
                <DashboardCard
                    id="cto-i1a"
                    label="Customer I1a"
                    icon={AlertCircle}
                    iconColor="text-rose-600"
                    iconBg="bg-rose-50"
                    accentHex="#e11d48"
                    value={kpis.customerImpactingI1a.value}
                    deltaAbsolute={kpis.customerImpactingI1a.deltaAbsolute}
                    deltaPercent={kpis.customerImpactingI1a.deltaPercent}
                    inverseGood
                    sparkline={kpis.customerImpactingI1a.sparkline}
                    metrics={[
                        { label: 'Last 30 days', value: 4 },
                        { label: 'Target', value: '0 / sprint' },
                    ]}
                />

                {/* System Uptime */}
                <DashboardCard
                    id="cto-uptime"
                    label="System Uptime"
                    icon={Server}
                    iconColor="text-sky-600"
                    iconBg="bg-sky-50"
                    accentHex="#0ea5e9"
                    value={`${kpis.systemUptime.value}%`}
                    deltaAbsolute={kpis.systemUptime.deltaAbsolute}
                    deltaPercent={kpis.systemUptime.deltaPercent}
                    sparkline={kpis.systemUptime.sparkline}
                    metrics={[
                        { label: 'SLA target', value: '99.9%' },
                        { label: 'Status', value: '✓ Above SLA' },
                    ]}
                />
            </div>

            {/* ── Row 2: Charts ────────────────────────────────────────────── */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                {/* Sprint Trend Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="mb-4">
                        <h2 className="text-[14px] font-semibold text-slate-800">Sprint Trend</h2>
                        <p className="text-[12px] text-slate-400 mt-0.5">Velocity (SP) and Predictability (%) by sprint</p>
                    </div>
                    {sprintTrend.length === 0 ? <EmptyChart /> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <ComposedChart data={sprintTrend} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="sprint"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    yAxisId="velocity"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    domain={[0, 'dataMax + 20']}
                                    label={{ value: 'SP', angle: -90, position: 'insideLeft', offset: 12, style: { fontSize: 10, fill: '#94a3b8' } }}
                                />
                                <YAxis
                                    yAxisId="pct"
                                    orientation="right"
                                    domain={[60, 100]}
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${v}%`}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                />
                                <Bar
                                    yAxisId="velocity"
                                    dataKey="velocity"
                                    name="Velocity (SP)"
                                    fill="#4f46e5"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={36}
                                />
                                <Line
                                    yAxisId="pct"
                                    type="monotone"
                                    dataKey="predictability"
                                    name="Predictability (%)"
                                    stroke="#10b981"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: '#10b981', strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>

                {/* Incidents Trend Chart */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5">
                    <div className="mb-4">
                        <h2 className="text-[14px] font-semibold text-slate-800">Incidents Trend</h2>
                        <p className="text-[12px] text-slate-400 mt-0.5">MTTR (hrs) and I1a volume by week</p>
                    </div>
                    {incidentsTrend.length === 0 ? <EmptyChart /> : (
                        <ResponsiveContainer width="100%" height={220}>
                            <ComposedChart data={incidentsTrend} margin={{ top: 4, right: 16, left: -8, bottom: 0 }}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                                <XAxis
                                    dataKey="week"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                />
                                <YAxis
                                    yAxisId="count"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    allowDecimals={false}
                                    label={{ value: 'Count', angle: -90, position: 'insideLeft', offset: 14, style: { fontSize: 10, fill: '#94a3b8' } }}
                                />
                                <YAxis
                                    yAxisId="hours"
                                    orientation="right"
                                    tick={{ fontSize: 11, fill: '#94a3b8' }}
                                    axisLine={false}
                                    tickLine={false}
                                    tickFormatter={(v) => `${v}h`}
                                    domain={[0, 6]}
                                />
                                <Tooltip content={<ChartTooltip />} />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                                />
                                <Bar
                                    yAxisId="count"
                                    dataKey="i1aCount"
                                    name="I1a Count"
                                    fill="#f43f5e"
                                    radius={[4, 4, 0, 0]}
                                    maxBarSize={36}
                                />
                                <Line
                                    yAxisId="hours"
                                    type="monotone"
                                    dataKey="mttr"
                                    name="MTTR (hrs)"
                                    stroke="#f59e0b"
                                    strokeWidth={2}
                                    dot={{ r: 3, fill: '#f59e0b', strokeWidth: 0 }}
                                    activeDot={{ r: 5 }}
                                />
                            </ComposedChart>
                        </ResponsiveContainer>
                    )}
                </div>
            </div>

            {/* ── Row 3: Workstream Table ──────────────────────────────────── */}
            <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="px-5 py-4 border-b border-slate-100">
                    <h2 className="text-[14px] font-semibold text-slate-800">Workstream Summary</h2>
                    <p className="text-[12px] text-slate-400 mt-0.5">Key metrics per engineering workstream</p>
                </div>
                <WorkstreamTable rows={workstreamSummary} />
            </div>

        </div>
    )
}
