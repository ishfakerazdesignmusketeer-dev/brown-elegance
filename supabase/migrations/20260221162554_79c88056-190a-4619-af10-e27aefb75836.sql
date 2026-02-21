
-- ==========================================
-- Phase 4: Hero Slides, Categories, Footer Settings
-- ==========================================

-- 1. hero_slides table
CREATE TABLE public.hero_slides (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  image_url text NOT NULL,
  title text,
  subtitle text,
  cta_text text,
  cta_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hero_slides ENABLE ROW LEVEL SECURITY;

CREATE POLICY "hero_slides_anon_select" ON public.hero_slides FOR SELECT USING (true);
CREATE POLICY "hero_slides_anon_insert" ON public.hero_slides FOR INSERT WITH CHECK (true);
CREATE POLICY "hero_slides_anon_update" ON public.hero_slides FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "hero_slides_anon_delete" ON public.hero_slides FOR DELETE USING (true);

-- Seed hero slides from existing hardcoded data
INSERT INTO public.hero_slides (image_url, title, subtitle, cta_text, cta_url, sort_order) VALUES
  ('https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80', 'Brown House — Handwoven Khadi,', 'Tailored Quietly', 'EXPLORE THE COLLECTION', '#collection', 1),
  ('https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=1920&q=80', 'Elegant Traditional Craftsmanship', NULL, NULL, NULL, 2),
  ('https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=1920&q=80', 'Luxurious Textile Details', NULL, NULL, NULL, 3),
  ('https://images.unsplash.com/photo-1558171813-4c088753af8f?w=1920&q=80', 'Artisan Bengali Fashion', NULL, NULL, NULL, 4);

-- 2. categories table
CREATE TABLE public.categories (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  slug text UNIQUE NOT NULL,
  description text,
  image_url text,
  sort_order integer DEFAULT 0,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;

CREATE POLICY "categories_anon_select" ON public.categories FOR SELECT USING (true);
CREATE POLICY "categories_anon_insert" ON public.categories FOR INSERT WITH CHECK (true);
CREATE POLICY "categories_anon_update" ON public.categories FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "categories_anon_delete" ON public.categories FOR DELETE USING (true);

-- Seed categories
INSERT INTO public.categories (name, slug, sort_order) VALUES
  ('Panjabi', 'panjabi', 1),
  ('Flare Pant', 'flare-pant', 2),
  ('Fabric', 'fabric', 3);

-- 3. Add category_id to products
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES public.categories(id);

-- Migrate existing products to panjabi category
UPDATE public.products SET category_id = (SELECT id FROM public.categories WHERE slug = 'panjabi');

-- 4. footer_settings table
CREATE TABLE public.footer_settings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text UNIQUE NOT NULL,
  value text,
  sort_order integer DEFAULT 0
);

ALTER TABLE public.footer_settings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "footer_settings_anon_select" ON public.footer_settings FOR SELECT USING (true);
CREATE POLICY "footer_settings_anon_insert" ON public.footer_settings FOR INSERT WITH CHECK (true);
CREATE POLICY "footer_settings_anon_update" ON public.footer_settings FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "footer_settings_anon_delete" ON public.footer_settings FOR DELETE USING (true);

-- Seed footer settings
INSERT INTO public.footer_settings (key, value, sort_order) VALUES
  ('brand_tagline', 'Premium Bengali Menswear. Handcrafted with love.', 1),
  ('contact_email', 'hello@brownhouse.com', 2),
  ('contact_phone', '+880 1XXX-XXXXXX', 3),
  ('contact_address', 'Dhaka, Bangladesh', 4),
  ('instagram_url', 'https://instagram.com/brownhousebd', 5),
  ('facebook_url', 'https://facebook.com/brownhousebd', 6),
  ('footer_col1_title', 'Shop', 7),
  ('footer_col1_links', 'Panjabi|/collections/panjabi,Flare Pant|/collections/flare-pant,Fabric|/collections/fabric', 8),
  ('footer_col2_title', 'Information', 9),
  ('footer_col2_links', 'About Us|/about,Contact|/contact,Size Guide|/size-guide', 10),
  ('footer_col3_title', 'Support', 11),
  ('footer_col3_links', 'FAQ|/faq,Shipping Policy|/shipping,Return Policy|/returns', 12),
  ('copyright_text', '© 2025 Brown House. All rights reserved.', 13);

-- 5. Storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('hero-images', 'hero-images', true) ON CONFLICT DO NOTHING;
INSERT INTO storage.buckets (id, name, public) VALUES ('category-images', 'category-images', true) ON CONFLICT DO NOTHING;

-- Storage policies for hero-images
CREATE POLICY "hero_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'hero-images');
CREATE POLICY "hero_images_anon_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'hero-images');
CREATE POLICY "hero_images_anon_update" ON storage.objects FOR UPDATE USING (bucket_id = 'hero-images') WITH CHECK (bucket_id = 'hero-images');
CREATE POLICY "hero_images_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'hero-images');

-- Storage policies for category-images
CREATE POLICY "category_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'category-images');
CREATE POLICY "category_images_anon_insert" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'category-images');
CREATE POLICY "category_images_anon_update" ON storage.objects FOR UPDATE USING (bucket_id = 'category-images') WITH CHECK (bucket_id = 'category-images');
CREATE POLICY "category_images_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'category-images');
