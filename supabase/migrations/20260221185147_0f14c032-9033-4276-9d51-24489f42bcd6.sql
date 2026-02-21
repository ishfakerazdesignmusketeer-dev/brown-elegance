-- Fix: Allow public read/write on admin_settings (no auth in this app)
CREATE POLICY "admin_settings_anon_select"
  ON public.admin_settings FOR SELECT
  USING (true);

CREATE POLICY "admin_settings_anon_update"
  ON public.admin_settings FOR UPDATE
  USING (true)
  WITH CHECK (true);

CREATE POLICY "admin_settings_anon_insert"
  ON public.admin_settings FOR INSERT
  WITH CHECK (true);
