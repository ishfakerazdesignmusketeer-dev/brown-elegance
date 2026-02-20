
-- Create customers table
CREATE TABLE IF NOT EXISTS public.customers (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  phone text UNIQUE NOT NULL,
  address text,
  city text,
  total_orders integer DEFAULT 0,
  total_spent integer DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  last_order_at timestamptz
);

ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "customers_anon_select" ON public.customers FOR SELECT TO anon USING (true);
CREATE POLICY "customers_anon_insert" ON public.customers FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "customers_anon_update" ON public.customers FOR UPDATE TO anon USING (true) WITH CHECK (true);

-- Create coupons table
CREATE TABLE IF NOT EXISTS public.coupons (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  code text UNIQUE NOT NULL,
  discount_type text NOT NULL CHECK (discount_type IN ('percentage', 'fixed')),
  discount_value integer NOT NULL,
  min_order_amount integer DEFAULT 0,
  max_uses integer,
  used_count integer DEFAULT 0,
  is_active boolean DEFAULT true,
  expires_at timestamptz,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coupons ENABLE ROW LEVEL SECURITY;

CREATE POLICY "coupons_anon_select" ON public.coupons FOR SELECT TO anon USING (true);
CREATE POLICY "coupons_anon_insert" ON public.coupons FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "coupons_anon_update" ON public.coupons FOR UPDATE TO anon USING (true) WITH CHECK (true);
CREATE POLICY "coupons_anon_delete" ON public.coupons FOR DELETE TO anon USING (true);

-- Alter orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS discount_amount integer DEFAULT 0;
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES public.customers(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS delivery_note text;

-- Create upsert_customer_on_order function
CREATE OR REPLACE FUNCTION public.upsert_customer_on_order()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.customers (name, phone, address, city, total_orders, total_spent, last_order_at)
  VALUES (NEW.customer_name, NEW.customer_phone, NEW.customer_address,
          NEW.customer_city, 1, NEW.total, NOW())
  ON CONFLICT (phone) DO UPDATE SET
    total_orders = public.customers.total_orders + 1,
    total_spent = public.customers.total_spent + NEW.total,
    last_order_at = NOW(),
    address = NEW.customer_address,
    city = NEW.customer_city;

  UPDATE public.orders SET customer_id = (
    SELECT id FROM public.customers WHERE phone = NEW.customer_phone
  ) WHERE id = NEW.id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER auto_upsert_customer
AFTER INSERT ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.upsert_customer_on_order();

-- Storage bucket for product images
INSERT INTO storage.buckets (id, name, public)
VALUES ('product-images', 'product-images', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "product_images_public_read" ON storage.objects FOR SELECT USING (bucket_id = 'product-images');
CREATE POLICY "product_images_anon_upload" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'product-images');
CREATE POLICY "product_images_anon_update" ON storage.objects FOR UPDATE USING (bucket_id = 'product-images');
CREATE POLICY "product_images_anon_delete" ON storage.objects FOR DELETE USING (bucket_id = 'product-images');

-- Seed admin_settings defaults if not exist
INSERT INTO public.admin_settings (key, value) VALUES
  ('whatsapp_number', '8801883132020'),
  ('delivery_charge', '80'),
  ('admin_password', 'brown2024admin'),
  ('store_name', 'BROWN'),
  ('store_email', 'hello@brownbd.com')
ON CONFLICT DO NOTHING;
