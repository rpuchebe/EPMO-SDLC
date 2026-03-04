'use client'

import { useState } from 'react'
import { AlertTriangle, GitMerge, AlertCircle, XCircle, Info } from 'lucide-react'

interface RiskData {
    scopeChangePct: number
    scopeChangeThreshold: number
    hotfixCollisionPct: number
    hotfixCollisionThreshold: number
    regressionDelayPct: number
    regressionDelayThreshold: number
    failedDeployments: number
    failedDeploymentThreshold: number
}

interface RiskIndicatorsSectionProps {
    data: RiskData
}

function getRiskLevel(value: number, threshold: number): 'green' | 'yellow' | 'red' {
    if (value <= threshold) return 'green'
    if (value <= threshold * 1.5) return 'yellow'
    return 'red'
}

const riskStyles = {
    green: {
        border: 'border-emerald-200',
        bg: 'bg-gradient-to-br from-emerald-50 to-white',
        badge: 'bg-emerald-100 text-emerald-700',
        icon: 'text-emerald-500',
        label: 'Healthy',
        barBg: 'bg-emerald-100',
        barFill: 'bg-emerald-500',
    },
    yellow: {
        border: 'border-amber-200',
        bg: 'bg-gradient-to-br from-amber-50 to-white',
        badge: 'bg-amber-100 text-amber-700',
        icon: 'text-amber-500',
        label: 'Watch',
        barBg: 'bg-amber-100',
        barFill: 'bg-amber-500',
    },
    red: {
        border: 'border-red-200',
        bg: 'bg-gradient-to-br from-red-50 to-white',
        badge: 'bg-red-100 text-red-700',
        icon: 'text-red-500',
        label: 'Risk',
        barBg: 'bg-red-100',
        barFill: 'bg-red-500',
    },
}

function RiskCard({
    title,
    value,
    threshold,
    suffix,
    icon: Icon,
    tooltip,
}: {
    title: string
    value: number
    threshold: number
    suffix: string
    icon: React.ElementType
    tooltip: string
}) {
    const [showTooltip, setShowTooltip] = useState(false)
    const level = getRiskLevel(value, threshold)
    const styles = riskStyles[level]

    return (
        <div className={`relative ${styles.bg} rounded-2xl border ${styles.border} shadow-sm p-4
                         hover:shadow-md transition-all duration-300`}>
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <Icon className={`w-5 h-5 ${styles.icon}`} />
                    <h4 className="text-xs font-semibold text-slate-700 leading-tight">{title}</h4>
                </div>
                <div className="flex items-center gap-1.5">
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${styles.badge}`}>
                        {styles.label}
                    </span>
                    <button
                        onMouseEnter={() => setShowTooltip(true)}
                        onMouseLeave={() => setShowTooltip(false)}
                        className="text-slate-400 hover:text-slate-600 transition-colors"
                    >
                        <Info className="w-3.5 h-3.5" />
                    </button>
                </div>
            </div>

            <div className="flex items-baseline gap-1 mb-3">
                <span className="text-3xl font-bold text-slate-900">{value}</span>
                <span className="text-sm text-slate-400 font-medium">{suffix}</span>
            </div>

            <div className="mb-1">
                <div className={`h-2 rounded-full ${styles.barBg} overflow-hidden`}>
                    <div
                        className={`h-full rounded-full ${styles.barFill} transition-all duration-700`}
                        style={{ width: `${Math.min(100, (value / (threshold * 2)) * 100)}%` }}
                    />
                </div>
                <div className="flex justify-between mt-1">
                    <span className="text-[10px] text-slate-400">0{suffix}</span>
                    <span className="text-[10px] text-slate-400 font-medium">
                        Threshold: {threshold}{suffix}
                    </span>
                </div>
            </div>

            {showTooltip && (
                <div className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 w-56
                                bg-slate-900 text-slate-200 text-xs rounded-xl p-3 shadow-xl
                                leading-relaxed pointer-events-none">
                    {tooltip}
                    <div className="absolute top-full left-1/2 -translate-x-1/2 -mt-1
                                    border-4 border-transparent border-t-slate-900" />
                </div>
            )}
        </div>
    )
}

export function RiskIndicatorsSection({ data }: RiskIndicatorsSectionProps) {
    const risks = [
        {
            title: 'Last-Minute Scope Changes',
            value: data.scopeChangePct,
            threshold: data.scopeChangeThreshold,
            suffix: '%',
            icon: AlertTriangle,
            tooltip: 'Percentage of releases where tickets were added after regression start. High values indicate planning gaps or poor scope control.',
        },
        {
            title: 'Hotfix Collisions',
            value: data.hotfixCollisionPct,
            threshold: data.hotfixCollisionThreshold,
            suffix: '%',
            icon: GitMerge,
            tooltip: 'Percentage of releases impacted by conflicts with concurrent hotfix deployments. Indicates coordination issues between release streams.',
        },
        {
            title: 'Regression Delays',
            value: data.regressionDelayPct,
            threshold: data.regressionDelayThreshold,
            suffix: '%',
            icon: AlertCircle,
            tooltip: 'Percentage of releases where regression testing was delayed due to environment conflicts or dependency issues.',
        },
        {
            title: 'Failed Deployments / Rollbacks',
            value: data.failedDeployments,
            threshold: data.failedDeploymentThreshold,
            suffix: '',
            icon: XCircle,
            tooltip: 'Total number of production deployments that required rollback due to critical failures. Each rollback increases risk exposure and operational cost.',
        },
    ]

    return (
        <div>
            <div className="flex items-center gap-2 mb-3">
                <div className="w-1 h-5 bg-amber-500 rounded-full" />
                <h3 className="text-sm font-bold text-slate-800">Risk Indicators</h3>
                <span className="text-[10px] text-slate-400 font-medium">Operational Risk</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
                {risks.map((r, i) => (
                    <RiskCard key={i} {...r} />
                ))}
            </div>
        </div>
    )
}
