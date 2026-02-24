-- Allow any user (including anon) to insert weekly update items
CREATE POLICY "Allow public insert" ON public.weekly_update_items
  FOR INSERT
  WITH CHECK (true);

-- Allow any user to update weekly update items
CREATE POLICY "Allow public update" ON public.weekly_update_items
  FOR UPDATE
  USING (true)
  WITH CHECK (true);

-- Allow any user to delete weekly update items
CREATE POLICY "Allow public delete" ON public.weekly_update_items
  FOR DELETE
  USING (true);
