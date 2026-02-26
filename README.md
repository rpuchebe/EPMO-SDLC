<p align="center">
  <img src="public/PRTH-Logo.png" alt="PRTH Logo" width="200" />
</p>

<h1 align="center">SDLC Central Hub</h1>

<p align="center">
  Executive dashboard for tracking the enterprise SDLC rollout across all lifecycle phases.
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TailwindCSS-4-38BDF8?logo=tailwindcss" alt="TailwindCSS" />
  <img src="https://img.shields.io/badge/Supabase-Auth%20%2B%20DB-3FCF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
</p>

---

## 📋 Overview

The **SDLC Central Hub** is an internal executive dashboard built for the **EPMO (Enterprise Project Management Office)** team. It provides real-time visibility into each phase of the Software Development Lifecycle rollout — from ideation to production monitoring — through interactive KPI cards, charts, and drill-down views.

### Key Capabilities

- **Phase Dashboards** — Dedicated dashboards for Phases 0 through 5, each with KPI cards, trend sparklines, and drill-down modals.
- **Shared UI Components** — Reusable `DashboardCard` and `PhaseHeader` components ensure visual consistency across all phases.
- **Role-Based Access Control (RBAC)** — Supabase Auth with row-level security policies.
- **Rollout Progress Tracking** — Executive timeline with weighted completion models.
- **Weekly Updates** — Carousel view for reviewing program progress and risks.
- **Resource Hub** — Centralized grid linking to key governance documents.
- **PDF Export** — Export dashboard views to PDF for stakeholder distribution.

---

## 🏗️ Architecture

```
sdlc-central-hub/
├── public/                         # Static assets (logos, icons, videos)
├── supabase/
│   └── migrations/                 # 11 ordered SQL migrations
│       ├── 01_schema_and_seed.sql
│       ├── ...
│       └── 11_phase2_prioritization_schema.sql
├── src/
│   ├── app/
│   │   ├── (dashboard)/            # Authenticated layout group
│   │   │   ├── home/               # Main landing page
│   │   │   ├── phase-0/            # Ideation & Intake
│   │   │   ├── phase-1/            # Discovery & Analysis
│   │   │   ├── phase-2/            # Prioritization & Planning
│   │   │   ├── phase-3/            # Design & Architecture
│   │   │   ├── phase-4/            # Build & Test
│   │   │   ├── phase-5/            # Deploy & Monitor
│   │   │   ├── rollout-overview/   # Cross-phase rollout view
│   │   │   └── stability-overview/ # Stability metrics
│   │   ├── api/                    # Next.js API routes
│   │   │   ├── phase0/
│   │   │   ├── phase1/
│   │   │   ├── phase2/
│   │   │   ├── phase5/
│   │   │   ├── incidents/
│   │   │   └── jira-sync/
│   │   └── login/                  # Auth pages
│   ├── components/
│   │   ├── ui/                     # Shared reusable components
│   │   │   ├── dashboard-card.tsx  # KPI card with sparklines
│   │   │   └── phase-header.tsx    # Unified phase header
│   │   ├── layout/                 # Sidebar, header, navigation
│   │   ├── home/                   # Home page components
│   │   ├── phase0/                 # Phase 0 specific components
│   │   ├── phase1/                 # Phase 1 specific components
│   │   ├── phase2/                 # Phase 2 specific components
│   │   └── phase5/                 # Phase 5 specific components
│   ├── utils/
│   │   ├── supabase/               # Supabase client (server/client/middleware)
│   │   ├── jira/                   # Jira API integration
│   │   └── cn.ts                   # Tailwind class merge utility
│   ├── types/                      # TypeScript type definitions
│   └── middleware.ts               # Auth middleware
├── .gitignore
├── package.json
├── tsconfig.json
├── next.config.ts
├── postcss.config.mjs
├── eslint.config.mjs
└── README.md
```

---

## 📊 Phase Dashboards

| Phase | Route | Description |
|-------|-------|-------------|
| **Phase 0** | `/phase-0` | Ideation & Intake — idea submissions, discovery pipeline, innovation metrics |
| **Phase 1** | `/phase-1` | Discovery & Analysis — discovery items, incidents, postmortem tracking |
| **Phase 2** | `/phase-2` | Prioritization & Planning — initiatives, projects, BWIs, governance gates |
| **Phase 3** | `/phase-3` | Design & Architecture *(in progress)* |
| **Phase 4** | `/phase-4` | Build & Test *(in progress)* |
| **Phase 5** | `/phase-5` | Deploy & Monitor — deployment frequency, MTTR, change failure rate |

---

## 🧩 Shared UI Components

### `DashboardCard`

Standardized KPI card used across all dashboards. Features:
- Icon + title header
- Large primary value display
- Trend indicator (absolute + percentage change, auto-colored)
- Up to 2 sub-metrics with alert support
- Background sparkline area chart

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
/>
```

### `PhaseHeader`

Unified header component for all phase pages with gradient background, sync status, and phase icon.

---

## 🛠 Tech Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | [Next.js](https://nextjs.org/) (App Router) | 16.1 |
| UI Library | [React](https://react.dev/) | 19.2 |
| Language | [TypeScript](https://www.typescriptlang.org/) | 5.x |
| Styling | [TailwindCSS](https://tailwindcss.com/) | 4.x |
| Database & Auth | [Supabase](https://supabase.com/) | 2.97 |
| Charts | [Recharts](https://recharts.org/) | 3.7 |
| Icons | [Lucide React](https://lucide.dev/) | 0.575 |
| PDF Export | [jsPDF](https://github.com/parallax/jsPDF) + [html-to-image](https://github.com/nichenqin/html-to-image) | — |
| Modals | [Radix UI Dialog](https://www.radix-ui.com/) | 1.1 |
| Date Utils | [date-fns](https://date-fns.org/) | 4.1 |

---

## 🚀 Getting Started

### Prerequisites

- **Node.js** ≥ 18.x
- **npm** ≥ 9.x
- A [Supabase](https://supabase.com/) project (free tier works)

### 1. Clone the Repository

```bash
git clone https://github.com/rpuchebe/EPMO-SDLC.git
cd EPMO-SDLC
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Configure Environment Variables

Create a `.env.local` file in the project root:

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Optional: Jira integration
JIRA_BASE_URL=https://your-domain.atlassian.net
JIRA_EMAIL=your-email@example.com
JIRA_API_TOKEN=your-jira-api-token
```

### 4. Set Up the Database

Run the migration files **in order** in your Supabase SQL Editor:

```
supabase/migrations/01_schema_and_seed.sql     → Base schema + seed data
supabase/migrations/02_update_weekly_items...   → Weekly updates schema
supabase/migrations/03_update_weekly_dates...   → Date corrections
supabase/migrations/04_seed_new_weekly...       → Additional seed data
supabase/migrations/05_combined_migration...    → Combined updates
supabase/migrations/06_master_migration...      → Master rollup
supabase/migrations/07_bpi_ideation_schema...   → Phase 0 ideation tables
supabase/migrations/08_allow_insert_weekly...   → RLS policy update
supabase/migrations/09_phase1_discovery...      → Phase 1 discovery tables
supabase/migrations/10_incident_management...   → Incident tracking tables
supabase/migrations/11_phase2_prioritization... → Phase 2 prioritization tables
```

### 5. Create a Test User

In Supabase Dashboard → **Authentication** → **Users**, create a new user with email/password. Any authenticated user defaults to the **Viewer** role, which is sufficient to view the application.

### 6. Run the Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — you will be redirected to `/login`.

---

## 🌐 API Routes

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/phase0` | GET | Phase 0 ideation & intake KPIs |
| `/api/phase1` | GET | Phase 1 discovery & analysis KPIs |
| `/api/phase2` | GET | Phase 2 prioritization metrics |
| `/api/phase5` | GET | Phase 5 deployment & monitoring KPIs |
| `/api/incidents` | GET | Incident management data |
| `/api/jira-sync` | POST | Trigger Jira data synchronization |

---

## 🚢 Deployment

### Vercel (Recommended)

1. Push your code to GitHub.
2. Import the repository in [Vercel](https://vercel.com/).
3. Add the following **Environment Variables** in the Vercel project settings:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - `JIRA_BASE_URL` *(optional)*
   - `JIRA_EMAIL` *(optional)*
   - `JIRA_API_TOKEN` *(optional)*
4. Deploy.

---

## 🤝 Contributing

### Branch Strategy

- `main` — Production-ready code
- Feature branches — `feat/phase-X-dashboard`, `fix/kpi-calculation`, etc.

### Commit Conventions

This project follows [Conventional Commits](https://www.conventionalcommits.org/):

```
feat: add Phase 2 prioritization dashboard
fix: correct sparkline rendering on small screens
refactor: extract DashboardCard into shared component
docs: update README with API route documentation
```

### Development Workflow

1. Create a feature branch from `main`
2. Make your changes
3. Run `npm run build` to verify there are no compilation errors
4. Run `npm run lint` to check for linting issues
5. Commit and push
6. Open a Pull Request against `main`

---

## 📄 License

This project is proprietary software developed for internal use by the EPMO team. All rights reserved.
