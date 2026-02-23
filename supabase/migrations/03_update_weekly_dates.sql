-- 03_update_weekly_dates.sql

ALTER TABLE public.weekly_updates ADD COLUMN start_date DATE;
ALTER TABLE public.weekly_updates ADD COLUMN end_date DATE;

-- Migrate existing mock data
UPDATE public.weekly_updates
SET 
  start_date = '2026-03-08',
  end_date = '2026-03-14'
WHERE week_id = '2026-W11';

ALTER TABLE public.weekly_updates DROP COLUMN date_range_label;
