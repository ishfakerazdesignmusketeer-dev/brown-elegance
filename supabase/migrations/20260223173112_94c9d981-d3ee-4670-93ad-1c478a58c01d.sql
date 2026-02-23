
CREATE TABLE IF NOT EXISTS public.reels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  video_url text NOT NULL,
  thumbnail_url text,
  caption text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.reels ENABLE ROW LEVEL SECURITY;

-- Public can read active reels
CREATE POLICY "reels_anon_select" ON public.reels
  FOR SELECT USING (is_active = true);

-- Full access for authenticated (admin managed via app-level check)
CREATE POLICY "reels_authenticated_insert" ON public.reels
  FOR INSERT WITH CHECK (true);

CREATE POLICY "reels_authenticated_update" ON public.reels
  FOR UPDATE USING (true) WITH CHECK (true);

CREATE POLICY "reels_authenticated_delete" ON public.reels
  FOR DELETE USING (true);
