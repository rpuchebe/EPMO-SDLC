# SDLC Central Hub

This is an executive dashboard application for tracking the SDLC Rollout, built with Next.js App Router, TailwindCSS, and Supabase.

## Features

- **RBAC**: Secure authentication and role-based access control via Supabase Auth.
- **Rollout Progress**: Executive timeline tracking phase completions via weighted models.
- **Weekly Updates**: Carousel to review weekly program progress and risks.
- **Resource Hub**: Centralized grid linking to key documents.
- **Modern UI**: Clean layout with persistent sidebar and responsive header.

## Setup Instructions

### 1. Database Configuration (Supabase)
1. Creating a new Supabase project.
2. In the Supabase SQL Editor, copy and run the contents of `supabase/migrations/01_schema_and_seed.sql`.
3. This creates all necessary tables, RLS policies, logic, and seed data.

### 2. Environment Variables
Create a `.env.local` file in the root directory (where `package.json` is located) with the following structure:
```bash
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
```

### 3. Running Locally
Run the following commands:
```bash
npm install
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser. It will redirect you to `/login`.

> Note: To login you first need to create a test user in Supabase Authentication. Any authenticated user will have 'Viewer' role by default, which is enough to view the MVP application.

### 4. Deploying to Vercel
1. Push your code to a GitHub repository.
2. Import the project in Vercel.
3. Add the `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_ANON_KEY` to the Vercel Environment Variables section.
4. Deploy.
