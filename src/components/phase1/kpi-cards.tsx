'use client'

import { Lightbulb, Wrench, Search, Compass, ShieldCheck, ListTodo, CheckCircle2 } from 'lucide-react'
import { DashboardCard } from '@/components/ui/dashboard-card'

export interface BaseKPI {
    value: number
    deltaAbsolute: number
    deltaPercent: number
    sparkline: number[]
    avgAge?: number | string
    unassigned?: number
    declined?: number
    oldestTicket?: number | string
    linkedItems?: number
    avgDaysToDone?: number
    completedThisMonth?: number
    readyForDiscovery?: number
}

export interface LinkedItemBreakdown {
    type: string
    count: number
    percentage: number
}

export interface CardMetric {
    label: string
    value: string | number
    isAlert?: boolean
}

export interface PCBs {
    discoveryItems: BaseKPI
    maintenanceRTB: BaseKPI
    waitingForTriage: BaseKPI
    inDiscovery: BaseKPI
    definitionGate: BaseKPI
    atWorkstreamBacklog: BaseKPI
    completedItems: BaseKPI
    linkedItemsBreakdown?: LinkedItemBreakdown[]
}

interface KpiCardsProps {
    kpis: PCBs
    onDrillDown?: (kpiKey: string, label: string) => void
}

const CARD_DEFS = [
    { key: 'discoveryItems',    label: 'Discovery Items',        icon: Lightbulb,   iconColor: 'text-indigo-600', iconBg: 'bg-indigo-50', accentHex: '#4f46e5', inverseGood: false },
    { key: 'maintenanceRTB',    label: 'Maintenance (RTB)',      icon: Wrench,      iconColor: 'text-orange-600', iconBg: 'bg-orange-50', accentHex: '#ea580c', inverseGood: false },
    { key: 'waitingForTriage',  label: 'Waiting for triage',     icon: Search,      iconColor: 'text-amber-600',  iconBg: 'bg-amber-50',  accentHex: '#d97706', inverseGood: true  },
    { key: 'inDiscovery',       label: 'In Discovery',           icon: Compass,     iconColor: 'text-sky-600',    iconBg: 'bg-sky-50',    accentHex: '#0284c7', inverseGood: false },
    { key: 'definitionGate',    label: 'Definition Gate',        icon: ShieldCheck, iconColor: 'text-violet-600', iconBg: 'bg-violet-50', accentHex: '#7c3aed', inverseGood: false },
    { key: 'atWorkstreamBacklog', label: 'At workstream backlog', icon: ListTodo,   iconColor: 'text-blue-600',   iconBg: 'bg-blue-50',   accentHex: '#2563eb', inverseGood: true  },
    { key: 'completedItems',    label: 'Completed items',        icon: CheckCircle2,iconColor: 'text-emerald-600',iconBg: 'bg-emerald-50',accentHex: '#059669', inverseGood: false },
] as const

function buildMetrics(key: typeof CARD_DEFS[number]['key'], kpiData: BaseKPI): CardMetric[] {
    switch (key) {
        case 'discoveryItems':
        case 'maintenanceRTB':
            return [
                { label: 'Avg age',  value: `${kpiData.avgAge || 0}d` },
                { label: 'Declined', value: `${kpiData.declined || 0}` },
            ]
        case 'waitingForTriage':
            return [
                { label: 'Oldest ticket', value: `${kpiData.oldestTicket || 0}d` },
                { label: 'Unassigned', value: `${kpiData.unassigned || 0}`, isAlert: (kpiData.unassigned || 0) > 0 },
            ]
        case 'inDiscovery':
            return [
                { label: 'Avg age',        value: `${kpiData.avgAge || 0}d` },
                { label: 'Ready for Disc', value: `${kpiData.readyForDiscovery || 0}` },
            ]
        case 'definitionGate':
            return [
                { label: 'Avg age',    value: `${kpiData.avgAge || 0}d` },
                { label: 'Unassigned', value: `${kpiData.unassigned || 0}`, isAlert: (kpiData.unassigned || 0) > 0 },
            ]
        case 'atWorkstreamBacklog':
            return [
                { label: 'Total Linked', value: `${kpiData.linkedItems || 0}` },
                { label: 'Workstreams',  value: '-' },
            ]
        case 'completedItems':
            return [
                { label: 'Avg days to done',   value: `${kpiData.avgDaysToDone || 0}d` },
                { label: 'Completed this mth', value: `${kpiData.completedThisMonth || 0}` },
            ]
    }
}

export function KpiCards({ kpis, onDrillDown }: KpiCardsProps) {
    return (
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">
            {CARD_DEFS.map((def) => {
                const kpiData = kpis[def.key as keyof Omit<PCBs, 'linkedItemsBreakdown'>] as BaseKPI

                return (
                    <DashboardCard
                        key={def.key}
                        id={def.key}
                        label={def.label}
                        icon={def.icon}
                        iconColor={def.iconColor}
                        iconBg={def.iconBg}
                        accentHex={def.accentHex}
                        value={kpiData.value}
                        deltaAbsolute={kpiData.deltaAbsolute}
                        deltaPercent={kpiData.deltaPercent}
                        inverseGood={def.inverseGood}
                        metrics={buildMetrics(def.key, kpiData)}
                        sparkline={kpiData.sparkline}
                        onClick={onDrillDown ? () => onDrillDown(def.key, def.label) : undefined}
                    />
                )
            })}
        </div>
    )
}
