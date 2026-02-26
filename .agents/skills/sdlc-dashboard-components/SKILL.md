---
name: SDLC Dashboard Components
description: How to use the shared, reusable UI components for the SDLC Central Hub dashboards (PhaseHeader, DashboardCard)
---

# SDLC Dashboard Shared Components

The SDLC Central Hub uses a set of **shared, reusable UI components** living in `src/components/ui/` to ensure visual consistency across all phase dashboards.

## Technology Stack
- **Framework:** Next.js (App Router)
- **Styling:** TailwindCSS v4
- **Charts:** Recharts (`recharts`)
- **Icons:** Lucide React (`lucide-react`)
- **Data:** Supabase + Jira API

---

## Components

### 1. `PhaseHeader` — `src/components/ui/phase-header.tsx`

The unified dashboard header used at the top of **every phase page**.

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `icon` | `LucideIcon` | ✅ | Phase icon |
| `title` | `string` | ✅ | e.g. `"Phase 0 – Ideation & Intake"` |
| `description` | `string` | ✅ | One-line phase description |
| `lastSync` | `string \| null` | ✅ | ISO timestamp or null |

**Usage:**
```tsx
import { Lightbulb } from 'lucide-react'
import { PhaseHeader } from '@/components/ui/phase-header'

<PhaseHeader
    icon={Lightbulb}
    title="Phase 0 – Ideation & Intake"
    description="Track idea submissions, discovery pipeline, and innovation metrics."
    lastSync={data.lastSync}
/>
```

**Design:** Dark teal gradient backgrounds (`#0a2622` → `#1a4a42`) with mint-green accents, matching the PRTH brand identity. Shows "Last sync:" timestamp and "Auto-sync daily at 2:00 AM (EST)" indicator.

---

### 2. `DashboardCard` — `src/components/ui/dashboard-card.tsx`

The standard KPI card used in Phase 0, Phase 1, Phase 5, and any future dashboards. Each card has exactly 7 visual slots:

```
┌────────────────────────────────┐
│  🟣 Title Label     ↗ +5 (+3%)│  ← Icon + Label + Trend
│  42                            │  ← Main Number
│  ─────────────────────────     │  ← Divider
│  Metric A           12d        │  ← Additional KPI 1
│  Metric B           8%         │  ← Additional KPI 2
│  ▁▂▃▄▅▆▇            (bg)      │  ← Sparkline chart
└────────────────────────────────┘
```

**Props:**
| Prop | Type | Required | Description |
|------|------|----------|-------------|
| `id` | `string` | ✅ | Unique key (for SVG gradient IDs) |
| `label` | `string` | ✅ | Card title |
| `icon` | `LucideIcon` | ✅ | Card icon |
| `iconColor` | `string` | ✅ | Tailwind text class, e.g. `'text-indigo-600'` |
| `iconBg` | `string` | ✅ | Tailwind bg class, e.g. `'bg-indigo-50'` |
| `accentHex` | `string` | ✅ | Hex color for sparkline, e.g. `'#4f46e5'` |
| `value` | `string \| number` | ✅ | Main display value |
| `deltaAbsolute` | `number` | ✅ | Change vs previous period |
| `deltaPercent` | `number` | ✅ | % change vs previous period |
| `inverseGood` | `boolean` | ❌ | If true, decrease = green |
| `metrics` | `DashboardCardMetric[]` | ❌ | Up to 2 sub-KPIs |
| `sparkline` | `number[]` | ❌ | Data points for area chart |
| `onClick` | `() => void` | ❌ | Click handler (makes card clickable) |

**`DashboardCardMetric` type:**
```ts
{ label: string; value: string | number; isAlert?: boolean }
```

**Usage Example:**
```tsx
import { Lightbulb } from 'lucide-react'
import { DashboardCard } from '@/components/ui/dashboard-card'

<DashboardCard
    id="ideas-submitted"
    label="Ideas Submitted"
    icon={Lightbulb}
    iconColor="text-indigo-600"
    iconBg="bg-indigo-50"
    accentHex="#4f46e5"
    value={65}
    deltaAbsolute={1}
    deltaPercent={2}
    metrics={[
        { label: "Won't Do", value: "10 (15%)" },
        { label: "Conv. to Discovery", value: "4%" },
    ]}
    sparkline={[3, 5, 4, 6, 7, 8, 5, 9, 6]}
    onClick={() => handleDrillDown('ideasSubmitted', 'Ideas Submitted')}
/>
```

**Grid Layouts (common patterns):**
```tsx
{/* 6 cards across (Phase 0) */}
<div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">

{/* 7 cards across (Phase 1) */}
<div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3 mb-4">

{/* 4 cards across (Phase 5) */}
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
```

---

## Color Palette Reference

### PRTH Brand (Header)
| Token | Hex | Usage |
|-------|-----|-------|
| Base dark | `#0a2622` | Gradient start |
| Mid teal | `#143d37` | Gradient middle |
| Light teal | `#1a4a42` | Gradient end |
| Accent mint | `#8dd4b0` | Icon highlights |
| Muted green | `#6b9e8a` | Secondary text |

### Card Accent Colors
| Category | Text Class | Bg Class | Hex |
|----------|-----------|----------|-----|
| Indigo | `text-indigo-600` | `bg-indigo-50` | `#4f46e5` |
| Amber | `text-amber-600` | `bg-amber-50` | `#d97706` |
| Sky | `text-sky-600` | `bg-sky-50` | `#0284c7` |
| Violet | `text-violet-600` | `bg-violet-50` | `#7c3aed` |
| Emerald | `text-emerald-600` | `bg-emerald-50` | `#059669` |
| Rose | `text-rose-600` | `bg-rose-50` | `#e11d48` |
| Orange | `text-orange-600` | `bg-orange-50` | `#ea580c` |
| Blue | `text-blue-600` | `bg-blue-50` | `#2563eb` |

### Trend Colors (automatic)
- **Positive (good):** `text-emerald-600`
- **Negative (bad):** `text-rose-600`
- **No change:** `text-slate-400`
- **Inverse mode:** swaps green/red

---

## Design Rules

1. **Fixed card height:** always `h-[155px]` for consistent grid alignment
2. **Sparkline opacity:** 50% behind content, 36px tall
3. **Font sizes:** Title `12px`, Main value `28px`, Trend `13px`, Metrics `10.5px`
4. **Border radius:** `rounded-2xl` on all cards
5. **Hover:** `shadow-md` + `border-slate-300` transition
6. **Alert metrics:** amber-colored with ⚠️ emoji prefix
