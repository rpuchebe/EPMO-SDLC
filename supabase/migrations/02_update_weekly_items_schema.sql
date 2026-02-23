-- 02_update_weekly_items_schema.sql
ALTER TABLE public.weekly_update_items 
ADD COLUMN title TEXT,
ADD COLUMN description TEXT,
ADD COLUMN badges JSONB;

-- Seed Data Update for the existing items so they don't break the UI
UPDATE public.weekly_update_items
SET 
  title = CASE 
    WHEN section = 'progress' THEN 'Sprint workflow automation completed'
    WHEN section = 'changes' THEN 'Increased visibility into adoption gaps'
    WHEN section = 'risks' THEN 'Jira hygiene inconsistent in EG and newer boards'
    WHEN section = 'next' THEN 'Hotfix model formally published'
    ELSE 'Update Item'
  END,
  description = CASE 
    WHEN section = 'progress' THEN 'End-to-end orchestration enabled (Close -> Report -> Open -> Start Analysis)'
    WHEN section = 'changes' THEN '(training attendance, story quality, demo)'
    WHEN section = 'risks' THEN 'Inconsistent usage of Jira across teams.'
    WHEN section = 'next' THEN 'We will be publishing the hotfix model soon.'
    ELSE bullet_text
  END,
  badges = CASE
    WHEN section = 'progress' THEN '["Governance", "Time saved"]'::jsonb
    WHEN section = 'next' THEN '["Due: Feb 20"]'::jsonb
    ELSE NULL
  END
WHERE title IS NULL;
