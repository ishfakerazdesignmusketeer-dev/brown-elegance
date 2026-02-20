
-- ============================================================
-- MIGRATION 1: Create Tables
-- ============================================================

CREATE TABLE public.products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  price INTEGER NOT NULL,
  images TEXT[],
  category TEXT,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.product_variants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  size TEXT NOT NULL,
  stock INTEGER NOT NULL DEFAULT 0,
  UNIQUE(product_id, size)
);

CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_number TEXT UNIQUE,
  customer_name TEXT NOT NULL,
  customer_phone TEXT NOT NULL,
  customer_address TEXT NOT NULL,
  customer_city TEXT NOT NULL,
  notes TEXT,
  subtotal INTEGER NOT NULL,
  delivery_charge INTEGER DEFAULT 0,
  total INTEGER NOT NULL,
  payment_method TEXT DEFAULT 'COD',
  status TEXT DEFAULT 'pending',
  whatsapp_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

CREATE TABLE public.order_items (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id UUID NOT NULL REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id UUID REFERENCES public.products(id),
  product_name TEXT NOT NULL,
  size TEXT NOT NULL,
  quantity INTEGER NOT NULL DEFAULT 1,
  unit_price INTEGER NOT NULL,
  total_price INTEGER NOT NULL
);

CREATE TABLE public.admin_settings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  key TEXT UNIQUE NOT NULL,
  value TEXT
);

-- ============================================================
-- MIGRATION 2: RLS Policies
-- ============================================================

ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_variants ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_settings ENABLE ROW LEVEL SECURITY;

-- products: public read
CREATE POLICY "products_public_read" ON public.products
  FOR SELECT USING (true);

-- product_variants: public read
CREATE POLICY "product_variants_public_read" ON public.product_variants
  FOR SELECT USING (true);

-- orders: public INSERT only (anon can create orders)
CREATE POLICY "orders_public_insert" ON public.orders
  FOR INSERT WITH CHECK (true);

-- order_items: public INSERT only
CREATE POLICY "order_items_public_insert" ON public.order_items
  FOR INSERT WITH CHECK (true);

-- admin_settings: NO public access (service role only - no policies = no access)

-- ============================================================
-- MIGRATION 3: DB Functions & Triggers
-- ============================================================

-- Auto-generate order number
CREATE OR REPLACE FUNCTION generate_order_number()
RETURNS TRIGGER AS $$
BEGIN
  NEW.order_number := 'BRN-' || LPAD(FLOOR(RANDOM() * 999999)::TEXT, 6, '0');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER set_order_number
BEFORE INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION generate_order_number();

-- Auto-update updated_at on orders
CREATE OR REPLACE FUNCTION update_order_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER orders_updated_at
BEFORE UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION update_order_updated_at();

-- Decrement stock on order item insert
CREATE OR REPLACE FUNCTION decrement_stock_on_order()
RETURNS TRIGGER AS $$
DECLARE
  current_stock INTEGER;
BEGIN
  UPDATE public.product_variants
  SET stock = stock - NEW.quantity
  WHERE product_id = NEW.product_id AND size = NEW.size;

  SELECT stock INTO current_stock
  FROM public.product_variants
  WHERE product_id = NEW.product_id AND size = NEW.size;

  IF current_stock < 0 THEN
    RAISE EXCEPTION 'Insufficient stock for this item';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_decrement_stock
AFTER INSERT ON public.order_items
FOR EACH ROW EXECUTE FUNCTION decrement_stock_on_order();

-- Restore stock on order cancel
CREATE OR REPLACE FUNCTION restore_stock_on_cancel()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'cancelled' AND OLD.status != 'cancelled' THEN
    UPDATE public.product_variants pv
    SET stock = pv.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
    AND pv.product_id = oi.product_id
    AND pv.size = oi.size;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER restore_stock_on_order_cancel
AFTER UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION restore_stock_on_cancel();

-- ============================================================
-- MIGRATION 4: Seed Data
-- ============================================================

-- Admin settings
INSERT INTO public.admin_settings (key, value) VALUES
  ('admin_password', 'brown2024admin'),
  ('whatsapp_number', '8801XXXXXXXXX'),
  ('delivery_charge', '80');

-- Products
INSERT INTO public.products (id, name, slug, description, price, images, category, is_active) VALUES
  (
    '11111111-0000-0000-0000-000000000001',
    'The Heritage Panjabi',
    'heritage-panjabi',
    'A timeless piece inspired by the rich textile traditions of Bengal. Crafted from fine cotton with delicate hand-embroidered details at the collar and cuffs.',
    4800,
    ARRAY['https://images.unsplash.com/photo-1594938298603-c8148c4dae35?w=800&h=1067&fit=crop'],
    'formal',
    true
  ),
  (
    '11111111-0000-0000-0000-000000000002',
    'The Evening Kurta',
    'evening-kurta',
    'An elegant evening kurta with refined silhouette perfect for festive gatherings. Features subtle texture weaving and mother-of-pearl buttons.',
    3200,
    ARRAY['https://images.unsplash.com/photo-1610030469983-98e550d6193c?w=800&h=1067&fit=crop'],
    'formal',
    true
  ),
  (
    '11111111-0000-0000-0000-000000000003',
    'The Classic White',
    'classic-white',
    'A wardrobe essential that pairs effortlessly with any occasion. Pure cotton, breathable, and endlessly versatile for the modern Bengali gentleman.',
    3500,
    ARRAY['https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=800&h=1067&fit=crop'],
    'everyday',
    true
  ),
  (
    '11111111-0000-0000-0000-000000000004',
    'The Monsoon Grey',
    'monsoon-grey',
    'Inspired by the moody monsoon skies of Dhaka. A sophisticated grey Panjabi with tonal embroidery that speaks of quiet confidence.',
    3800,
    ARRAY['https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?w=800&h=1067&fit=crop'],
    'everyday',
    true
  ),
  (
    '11111111-0000-0000-0000-000000000005',
    'The Celebration Gold',
    'celebration-gold',
    'For moments that demand grandeur. Rich golden Panjabi with intricate zari work, designed for weddings, Eid, and celebrations that matter.',
    5500,
    ARRAY['https://images.unsplash.com/photo-1531891437562-4301cf35b7e4?w=800&h=1067&fit=crop'],
    'festive',
    true
  ),
  (
    '11111111-0000-0000-0000-000000000006',
    'The Midnight Navy',
    'midnight-navy',
    'Deep navy with a refined matte finish. The perfect blend of tradition and modernity for the contemporary Bengali man.',
    4200,
    ARRAY['https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?w=800&h=1067&fit=crop'],
    'formal',
    true
  );

-- Product Variants (S/M/L/XL/XXL, stock 20 each)
INSERT INTO public.product_variants (product_id, size, stock)
SELECT p.id, s.size, 20
FROM public.products p
CROSS JOIN (VALUES ('S'), ('M'), ('L'), ('XL'), ('XXL')) AS s(size)
WHERE p.slug IN ('heritage-panjabi','evening-kurta','classic-white','monsoon-grey','celebration-gold','midnight-navy');
