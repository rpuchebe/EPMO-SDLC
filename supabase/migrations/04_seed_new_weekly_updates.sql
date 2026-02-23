-- 04_seed_new_weekly_updates.sql

-- Clear existing data
DELETE FROM public.weekly_updates;

-- Insert new weekly updates
WITH w5 AS (
  INSERT INTO public.weekly_updates (id, week_id, start_date, end_date, overall_status)
  VALUES ('55555555-5555-5555-5555-555555555555', '2026-W5', '2026-02-02', '2026-02-05', 'on_track')
  RETURNING id
),
w6 AS (
  INSERT INTO public.weekly_updates (id, week_id, start_date, end_date, overall_status)
  VALUES ('66666666-6666-6666-6666-666666666666', '2026-W6', '2026-02-09', '2026-02-13', 'slight_delay')
  RETURNING id
),
w7 AS (
  INSERT INTO public.weekly_updates (id, week_id, start_date, end_date, overall_status)
  VALUES ('77777777-7777-7777-7777-777777777777', '2026-W7', '2026-02-16', '2026-02-20', 'on_track')
  RETURNING id
)

-- Insert mock items for the new weeks to keep the UI populated
INSERT INTO public.weekly_update_items (weekly_update_id, section, title, description, badges, risk_text, mitigation_text, order_index) VALUES
-- W5 Items
('55555555-5555-5555-5555-555555555555', 'progress', 'Initial Discovery Phase completed', 'Completed all stakeholder interviews and mapped out the initial process.', '["Completed"]'::jsonb, NULL, NULL, 1),
('55555555-5555-5555-5555-555555555555', 'risks', 'Resource constraints in design team', 'Design team is currently overbooked.', '["High Risk"]'::jsonb, 'Design team overbooked', 'Prioritize core components first.', 1),

-- W6 Items
('66666666-6666-6666-6666-666666666666', 'progress', 'Drafted API specs', 'Frontend and Backend teams agreed on the initial API contracts.', '["Milestone"]'::jsonb, NULL, NULL, 1),
('66666666-6666-6666-6666-666666666666', 'changes', 'Updated standard templates', 'Updated all standard templates for Discovery phase.', '["Documentation"]'::jsonb, NULL, NULL, 1),
('66666666-6666-6666-6666-666666666666', 'next', 'Prepare for Wave 2 kickoff', 'Initial preparation for the second wave of the rollout.', '["Due: Feb 20"]'::jsonb, NULL, NULL, 1),

-- W7 Items (The latest week)
('77777777-7777-7777-7777-777777777777', 'progress', 'Sprint workflow automation completed', 'End-to-end orchestration enabled (Close -> Report -> Open -> Start Analysis)', '["Governance", "Time saved"]'::jsonb, NULL, NULL, 1),
('77777777-7777-7777-7777-777777777777', 'progress', 'Security embedded into sprint workflow', 'Security now receives sprint handoff to drive testing.', '["Security"]'::jsonb, NULL, NULL, 2),
('77777777-7777-7777-7777-777777777777', 'changes', 'Increased visibility into adoption gaps', '(training attendance, story quality, demo)', '["Adoption"]'::jsonb, NULL, NULL, 1),
('77777777-7777-7777-7777-777777777777', 'risks', 'Jira hygiene inconsistent in EG and newer boards', 'Inconsistent usage of Jira across teams.', '["Hygiene"]'::jsonb, 'Jira hygiene inconsistent', 'Weekly hygiene reporting + KM-supported cleanup initiative with measurable targets.', 1),
('77777777-7777-7777-7777-777777777777', 'next', 'Hotfix model formally published', 'We will be publishing the hotfix model soon.', '["Due: Mar 1"]'::jsonb, NULL, NULL, 1);
