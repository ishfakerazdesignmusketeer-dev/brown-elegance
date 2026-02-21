
-- Create storage bucket for brand assets (logo, favicon)
INSERT INTO storage.buckets (id, name, public)
VALUES ('brand-assets', 'brand-assets', true)
ON CONFLICT (id) DO NOTHING;

-- Allow public read access
CREATE POLICY "Brand assets are publicly accessible"
ON storage.objects FOR SELECT
USING (bucket_id = 'brand-assets');

-- Allow anyone to upload (admin auth is handled app-side)
CREATE POLICY "Anyone can upload brand assets"
ON storage.objects FOR INSERT
WITH CHECK (bucket_id = 'brand-assets');

-- Allow anyone to update brand assets
CREATE POLICY "Anyone can update brand assets"
ON storage.objects FOR UPDATE
USING (bucket_id = 'brand-assets');

-- Allow anyone to delete brand assets
CREATE POLICY "Anyone can delete brand assets"
ON storage.objects FOR DELETE
USING (bucket_id = 'brand-assets');

-- Seed logo_url and favicon_url settings if they don't exist
INSERT INTO public.admin_settings (key, value)
VALUES 
  ('logo_url', NULL),
  ('favicon_url', NULL)
ON CONFLICT (key) DO NOTHING;
