'use client'

import { Lightbulb, Loader2, Compass, ArrowRightLeft, CheckCircle2, TrendingUp } from 'lucide-react'
import { DashboardCard } from '@/components/ui/dashboard-card'

export interface BaseKPI {
    value: number
    deltaAbsolute: number
    deltaPercent: number
    sparkline: number[]
}

export interface IdeasSubmittedKPI extends BaseKPI {
    wontDo: number
    wontDoPercent: number
    conversionToDiscovery: number
}

export interface ReadyForDiscoveryKPI extends BaseKPI {
    avgAgeDays: number
    over14DaysCount: number
}

export interface OnDiscoveryKPI extends BaseKPI {
    avgDaysToStart: number
    conversionFromSubmitted: number
}

export interface AtWorkstreamKPI extends BaseKPI {
    avgDaysToWorkstream: number
    conversionFromDiscovery: number
}

export interface CompletedIdeasKPI extends BaseKPI {
    completionRate: number
    avgDaysToCompletion: number
}

export interface AvgRoiScoringKPI extends BaseKPI {
    medianRoi: number
    top10Roi: number
}

export interface KPIs {
    ideasSubmitted: IdeasSubmittedKPI
    readyForDiscoveryIdeas: ReadyForDiscoveryKPI
    onDiscovery: OnDiscoveryKPI
    atWorkstream: AtWorkstreamKPI
    completedIdeas: CompletedIdeasKPI
    avgRoiScoring: AvgRoiScoringKPI
}

interface KpiCardsProps {
    kpis: KPIs
    onDrillDown?: (kpiKey: string, label: string) => void
}

export function KpiCards({ kpis, onDrillDown }: KpiCardsProps) {
    if (!kpis || !kpis.ideasSubmitted) return null

    const cards = [
        {
            key: 'ideasSubmitted' as const,
            label: 'Ideas Submitted',
            icon: Lightbulb,
            iconColor: 'text-indigo-600',
            iconBg: 'bg-indigo-50',
            accentHex: '#4f46e5',
            data: kpis.ideasSubmitted,
            inverseGood: false,
            metrics: [
                { label: "Won't Do", value: `${kpis.ideasSubmitted.wontDo} (${kpis.ideasSubmitted.wontDoPercent}%)` },
                { label: 'Conv. to Discovery', value: `${kpis.ideasSubmitted.conversionToDiscovery}%` },
            ],
        },
        {
            key: 'readyForDiscoveryIdeas' as const,
            label: 'Ready for Discovery',
            icon: Loader2,
            iconColor: 'text-amber-600',
            iconBg: 'bg-amber-50',
            accentHex: '#d97706',
            data: kpis.readyForDiscoveryIdeas,
            inverseGood: true,
            metrics: [
                { label: 'Avg age', value: `${kpis.readyForDiscoveryIdeas.avgAgeDays}d` },
                {
                    label: `${kpis.readyForDiscoveryIdeas.over14DaysCount} over 14d`,
                    value: '',
                    isAlert: kpis.readyForDiscoveryIdeas.over14DaysCount > 0,
                },
            ],
        },
        {
            key: 'onDiscovery' as const,
            label: 'On Discovery',
            icon: Compass,
            iconColor: 'text-sky-600',
            iconBg: 'bg-sky-50',
            accentHex: '#0284c7',
            data: kpis.onDiscovery,
            inverseGood: false,
            metrics: [
                { label: 'Avg days to start', value: `${kpis.onDiscovery.avgDaysToStart}d` },
                { label: 'Conv. from Subm.', value: `${kpis.onDiscovery.conversionFromSubmitted}%` },
            ],
        },
        {
            key: 'atWorkstream' as const,
            label: 'At Workstream',
            icon: ArrowRightLeft,
            iconColor: 'text-violet-600',
            iconBg: 'bg-violet-50',
            accentHex: '#7c3aed',
            data: kpis.atWorkstream,
            inverseGood: false,
            metrics: [
                { label: 'Conv. from Disc.', value: `${kpis.atWorkstream.conversionFromDiscovery}%` },
                { label: 'Avg days to ws', value: `${kpis.atWorkstream.avgDaysToWorkstream}d` },
            ],
        },
        {
            key: 'completedIdeas' as const,
            label: 'Completed Ideas',
            icon: CheckCircle2,
            iconColor: 'text-emerald-600',
            iconBg: 'bg-emerald-50',
            accentHex: '#10b981',
            data: kpis.completedIdeas,
            inverseGood: false,
            metrics: [
                { label: 'Completion Rate', value: `${kpis.completedIdeas.completionRate}%` },
                { label: 'Avg days to done', value: `${kpis.completedIdeas.avgDaysToCompletion}d` },
            ],
        },
        {
            key: 'avgRoiScoring' as const,
            label: 'Avg ROI Scoring',
            icon: TrendingUp,
            iconColor: 'text-rose-600',
            iconBg: 'bg-rose-50',
            accentHex: '#e11d48',
            data: kpis.avgRoiScoring,
            inverseGood: false,
            metrics: [
                { label: 'Median', value: kpis.avgRoiScoring.medianRoi?.toFixed(1) || '0' },
                { label: 'Top 10% Threshold', value: kpis.avgRoiScoring.top10Roi?.toFixed(1) || '0' },
            ],
        },
    ]

    return (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
            {cards.map((card) => {
                const isClickable = onDrillDown && card.key !== 'avgRoiScoring'
                const value = card.key === 'avgRoiScoring'
                    ? Number(card.data.value).toFixed(1)
                    : card.data.value

                return (
                    <DashboardCard
                        key={card.key}
                        id={card.key}
                        label={card.label}
                        icon={card.icon}
                        iconColor={card.iconColor}
                        iconBg={card.iconBg}
                        accentHex={card.accentHex}
                        value={value}
                        deltaAbsolute={card.data.deltaAbsolute}
                        deltaPercent={card.data.deltaPercent}
                        inverseGood={card.inverseGood}
                        metrics={card.metrics}
                        sparkline={card.data.sparkline}
                        onClick={isClickable ? () => onDrillDown(card.key, card.label) : undefined}
                    />
                )
            })}
        </div>
    )
}
