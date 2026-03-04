# SDLC Central Hub — Style Guide

## Typography

| Token | Font | Weight | Size | Usage |
|-------|------|--------|------|-------|
| **H1** | Inter | 700 (bold) | `text-2xl` (24px) | Page titles (`PhaseHeader`) |
| **H2** | Inter | 600 (semibold) | `text-lg` (18px) | Section headers |
| **H3** | Inter | 600 (semibold) | `text-sm` (14px) | Card titles, `SectionTitle` |
| **Body** | Inter | 400 (normal) | `text-sm` (14px) | Default paragraph text |
| **Caption** | Inter | 500 (medium) | `text-xs` (12px) | Labels, chart legends |
| **Micro** | Inter | 500 (medium) | `text-[10px]`–`text-[11px]` | KPI sub-metrics, table cells |

**Font family**: [Inter](https://fonts.google.com/specimen/Inter) via `next/font/google`.  
CSS variable: `--font-inter`, applied through Tailwind's `font-sans`.

---

## Spacing Scale

All spacing uses Tailwind's **4px base** scale. Preferred values:

| Token | px | Common usage |
|-------|-----|-------------|
| `gap-1` / `p-1` | 4px | Tight icon spacing |
| `gap-1.5` / `p-1.5` | 6px | Inline label gaps |
| `gap-2` / `p-2` | 8px | Between small elements |
| `gap-3` / `p-3` | 12px | Card internal spacing |
| `gap-4` / `p-4` | 16px | Card padding, section gap |
| `gap-6` / `p-6` | 24px | Between sections |
| `gap-8` / `p-8` | 32px | Page-level margins |

**Rule**: Avoid arbitrary pixel values (e.g. `p-[7px]`). Use the nearest Tailwind value instead.

---

## Color Tokens

Defined in `globals.css` as CSS custom properties:

### Semantic
| Variable | Hex | Usage |
|----------|-----|-------|
| `--color-success` | `#10b981` | Positive trends (emerald-500) |
| `--color-warning` | `#f59e0b` | Warning alerts (amber-500) |
| `--color-error` | `#ef4444` | Negative trends, errors (red-500) |
| `--color-info` | `#3b82f6` | Informational (blue-500) |

### Charts
| Variable | Hex | Index |
|----------|-----|-------|
| `--chart-1` | `#4f46e5` | Primary (indigo-600) |
| `--chart-2` | `#06b6d4` | Secondary (cyan-500) |
| `--chart-3` | `#8b5cf6` | Tertiary (violet-500) |
| `--chart-4` | `#f97316` | Quaternary (orange-500) |
| `--chart-5` | `#ec4899` | Quinary (pink-500) |
| `--chart-6` | `#14b8a6` | Senary (teal-500) |

### Neutrals (Tailwind `slate-*`)
- **Background**: `bg-slate-50` (dashboard), `bg-white` (cards)
- **Border**: `border-slate-200`
- **Text primary**: `text-slate-800`
- **Text secondary**: `text-slate-500`
- **Text muted**: `text-slate-400`

---

## Component Library

| Component | Path | Usage |
|-----------|------|-------|
| `PhaseHeader` | `components/ui/phase-header.tsx` | Phase page header with title, description, icon |
| `DashboardCard` | `components/ui/dashboard-card.tsx` | KPI card with value, trend, sparkline, sub-metrics |
| `ProgressCircle` | `components/ui/progress-circle.tsx` | Circular progress indicator |
| `AlertCard` | `components/ui/alert-card.tsx` | Warning/governance alert card |
| `Dialog` | `components/ui/dialog.tsx` | Modal dialog wrapper |
| `RefreshProgressBar` | `components/ui/refresh-progress-bar.tsx` | Loading indicator bar |

---

## Modal Standards

- Use the `Dialog` component from `components/ui/dialog.tsx`
- Max width: `max-w-4xl` (default) or `max-w-2xl` (simple modals)
- Header: title left, close `X` button right
- Padding: `p-6`
- Close on backdrop click and `Escape` key

---

## Chart Standards

- **Library**: Recharts
- **Palette**: Use `--chart-1` through `--chart-6` in order
- **Tooltip**: Styled via `.recharts-default-tooltip` in `globals.css` (white bg, rounded, shadow)
- **Responsive**: Wrap in `ResponsiveContainer` with `width="100%"` and explicit `height`
- **Animation**: Disable for sparklines (`isAnimationActive={false}`)

---

## Card Design (border-radius)

| Element | Radius |
|---------|--------|
| Cards | `rounded-2xl` |
| Buttons | `rounded-lg` |
| Badges/Pills | `rounded-full` |
| Input fields | `rounded-md` |
