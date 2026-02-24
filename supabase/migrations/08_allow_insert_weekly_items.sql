-- Allow authenticated users to insert weekly update items
CREATE POLICY "Allow authenticated insert" ON public.weekly_update_items
  FOR INSERT
  WITH CHECK (auth.uid() IS NOT NULL);
