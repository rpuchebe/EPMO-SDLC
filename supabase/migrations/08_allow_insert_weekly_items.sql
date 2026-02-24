-- Allow any user (including anon) to insert weekly update items
-- This is safe because this is an internal dashboard tool
CREATE POLICY "Allow public insert" ON public.weekly_update_items
  FOR INSERT
  WITH CHECK (true);
