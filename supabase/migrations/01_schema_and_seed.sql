-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Profiles (linked to auth.users)
CREATE TABLE public.profiles (
  id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
  full_name TEXT NOT NULL,
  avatar_url TEXT,
  role TEXT DEFAULT 'Viewer' CHECK (role IN ('Admin', 'Executive', 'PMO', 'EO', 'TPM', 'PM', 'Viewer')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Workstreams
CREATE TABLE public.workstreams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  name TEXT NOT NULL UNIQUE
);

-- 3. Teams
CREATE TABLE public.teams (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  workstream_id UUID REFERENCES public.workstreams(id) ON DELETE CASCADE,
  name TEXT NOT NULL
);

-- 4. Rollout Phases
CREATE TABLE public.rollout_phases (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_index INT NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  planned_start DATE,
  planned_end DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'at_risk')),
  completion_percentage INT DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
  weight INT DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Weekly Updates
CREATE TABLE public.weekly_updates (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  week_id TEXT NOT NULL UNIQUE, -- e.g. "2026-W11"
  date_range_label TEXT NOT NULL,
  overall_status TEXT CHECK (overall_status IN ('on_track', 'slight_delay', 'at_risk')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Weekly Update Items
CREATE TABLE public.weekly_update_items (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  weekly_update_id UUID REFERENCES public.weekly_updates(id) ON DELETE CASCADE,
  section TEXT CHECK (section IN ('progress', 'changes', 'risks', 'next')),
  bullet_text TEXT,
  risk_text TEXT,
  mitigation_text TEXT,
  order_index INT DEFAULT 0
);

-- 7. Resource Cards
CREATE TABLE public.resource_cards (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  order_index INT NOT NULL,
  title TEXT NOT NULL,
  icon_key TEXT NOT NULL,
  category TEXT
);

-- 8. Resource Links
CREATE TABLE public.resource_links (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  resource_card_id UUID REFERENCES public.resource_cards(id) ON DELETE CASCADE,
  label TEXT NOT NULL,
  url TEXT NOT NULL,
  order_index INT DEFAULT 0
);

-- RLS
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workstreams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rollout_phases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_updates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.weekly_update_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_cards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.resource_links ENABLE ROW LEVEL SECURITY;

-- Read policies (allow authenticated users to read)
CREATE POLICY "Allow authenticated read" ON public.profiles FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.workstreams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.teams FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.rollout_phases FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.weekly_updates FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.weekly_update_items FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.resource_cards FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.resource_links FOR SELECT USING (auth.uid() IS NOT NULL);

-- User trigger to create profile
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, avatar_url, role)
  VALUES (
    new.id,
    new.raw_user_meta_data->>'full_name',
    new.raw_user_meta_data->>'avatar_url',
    COALESCE(new.raw_user_meta_data->>'role', 'Viewer')
  );
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE PROCEDURE public.handle_new_user();

-- Seed Data
INSERT INTO public.rollout_phases (order_index, name, description, planned_start, planned_end, status, completion_percentage, weight) VALUES
(1, 'Foundation & Framework Design', 'Definition of the SDLC governance model, intake framework, documentation standards, and Jira workflow configuration to establish the structural baseline for enterprise rollout.', '2026-01-01', '2026-02-15', 'completed', 100, 20),
(2, 'Wave 1 – Pilot Implementation (MAPS & EG)', 'Initial rollout of the SDLC framework within pilot workstreams (MAPS and EG) to validate workflows, governance controls, automation, and reporting standards.', '2026-02-16', '2026-03-31', 'in_progress', 50, 20),
(3, 'Post-Wave 1 Optimization & Governance Calibration', 'Formal review of pilot results, identification of gaps, refinement of workflows, documentation adjustments, and governance improvements before broader expansion.', '2026-04-01', '2026-04-20', 'pending', 0, 10),
(4, 'Wave 2 – Enterprise Expansion', 'Structured rollout of the optimized SDLC framework to PCE, Banking & Treasury, and Global Markets workstreams, including training, adoption tracking, and operational monitoring.', '2026-04-21', '2026-07-15', 'pending', 0, 25),
(5, 'Post-Wave 2 Stabilization & Adoption Review', 'Assessment of execution quality, KPI alignment, risk exposure, and adoption maturity across Wave 2 workstreams. Includes corrective actions and performance calibration.', '2026-07-16', '2026-08-05', 'pending', 0, 10),
(6, 'Wave 3 – Enterprise Completion', 'Rollout of the SDLC framework to all remaining workstreams not included in Waves 1 and 2, ensuring standardized execution and governance across the organization.', '2026-08-06', '2026-10-15', 'pending', 0, 10),
(7, 'Enterprise Stabilization & Institutionalization', 'Final governance embedding, KPI visibility, documentation consolidation, training completion, and operational ownership transfer to ensure long-term sustainability.', '2026-10-16', '2026-11-30', 'pending', 0, 5),
(8, 'SDLC Program Completion', 'Formal closure of the SDLC transformation program, confirmation of enterprise adoption, governance integration, and transition to steady-state operations.', '2026-12-01', '2026-12-15', 'pending', 0, 0);

INSERT INTO public.resource_cards (id, order_index, title, icon_key) VALUES
('11111111-1111-1111-1111-111111111111', 1, 'SDLC Rollout Plan', 'Rocket'),
('22222222-2222-2222-2222-222222222222', 2, 'Training Calendar & Plan', 'Calendar'),
('33333333-3333-3333-3333-333333333333', 3, 'POC Attendance Tracker', 'Users'),
('44444444-4444-4444-4444-444444444444', 4, 'Communication Plan', 'MessageSquare'),
('55555555-5555-5555-5555-555555555555', 5, 'Training Material', 'BookOpen'),
('66666666-6666-6666-6666-666666666666', 6, 'SDLC Deliverables', 'FileText');

INSERT INTO public.resource_links (resource_card_id, label, url, order_index) VALUES
('11111111-1111-1111-1111-111111111111', 'Rollout Plan', '#', 1),
('11111111-1111-1111-1111-111111111111', 'POC Updates Page', '#', 2),
('22222222-2222-2222-2222-222222222222', 'Training Calendar', '#', 1),
('22222222-2222-2222-2222-222222222222', 'Training Plan', '#', 2),
('33333333-3333-3333-3333-333333333333', 'Attendance Tracker', '#', 1),
('44444444-4444-4444-4444-444444444444', 'Comms Plan', '#', 1),
('55555555-5555-5555-5555-555555555555', 'Course Modules', '#', 1),
('66666666-6666-6666-6666-666666666666', 'Deliverables Doc', '#', 1),
('66666666-6666-6666-6666-666666666666', 'SDLC Workflow View', '#', 2);

WITH wu AS (
  INSERT INTO public.weekly_updates (id, week_id, date_range_label, overall_status)
  VALUES ('77777777-7777-7777-7777-777777777777', '2026-W11', 'Mar 8 - Mar 14, 2026', 'on_track')
  RETURNING id
)
INSERT INTO public.weekly_update_items (weekly_update_id, section, bullet_text, risk_text, mitigation_text, order_index) VALUES
('77777777-7777-7777-7777-777777777777', 'progress', 'Completed Pilot Wave 1 initial scoping', NULL, NULL, 1),
('77777777-7777-7777-7777-777777777777', 'changes', 'Updated standard templates for Discovery phase', NULL, NULL, 1),
('77777777-7777-7777-7777-777777777777', 'risks', NULL, 'Resource constraints in team A', 'Cross-training team B resources', 1),
('77777777-7777-7777-7777-777777777777', 'next', 'Prepare for Wave 2 kickoff communications', NULL, NULL, 1);
