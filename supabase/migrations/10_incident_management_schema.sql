CREATE TABLE public.incidents (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  jira_key TEXT NOT NULL UNIQUE,
  product TEXT,
  impact INTEGER CHECK (impact IN (1, 2, 3, 4)),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.followups (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  jira_key TEXT NOT NULL UNIQUE,
  score INTEGER,
  linked_tickets_count INTEGER DEFAULT 0,
  is_complete BOOLEAN DEFAULT false,
  linked_tickets JSONB, -- Array of { key, project, status }
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.workstream_incident_tickets (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  jira_key TEXT NOT NULL UNIQUE,
  impact INTEGER CHECK (impact IN (1, 2, 3, 4)),
  project_key TEXT,
  status TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.incident_sync_log (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  last_updated TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.incidents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.followups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workstream_incident_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.incident_sync_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow authenticated read" ON public.incidents FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.followups FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.workstream_incident_tickets FOR SELECT USING (auth.uid() IS NOT NULL);
CREATE POLICY "Allow authenticated read" ON public.incident_sync_log FOR SELECT USING (auth.uid() IS NOT NULL);

-- Seed an initial sync log entry
INSERT INTO public.incident_sync_log (last_updated) VALUES (NOW());
