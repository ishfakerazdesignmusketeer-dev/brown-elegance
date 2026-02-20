
-- Phase 3: Abandoned Cart Tracking, Courier UI, Payment UI

-- Table: abandoned_carts
CREATE TABLE IF NOT EXISTS public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  customer_phone text,
  customer_name text,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal integer NOT NULL DEFAULT 0,
  recovery_sent boolean DEFAULT false,
  recovery_sent_at timestamptz,
  converted boolean DEFAULT false,
  converted_order_id uuid REFERENCES public.orders(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE public.abandoned_carts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "abandoned_carts_anon_select" ON public.abandoned_carts FOR SELECT USING (true);
CREATE POLICY "abandoned_carts_anon_insert" ON public.abandoned_carts FOR INSERT WITH CHECK (true);
CREATE POLICY "abandoned_carts_anon_update" ON public.abandoned_carts FOR UPDATE USING (true) WITH CHECK (true);

-- Table: courier_bookings
CREATE TABLE IF NOT EXISTS public.courier_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) UNIQUE,
  courier_service text NOT NULL DEFAULT 'manual',
  tracking_number text,
  booking_status text DEFAULT 'pending',
  consignee_name text,
  consignee_phone text,
  consignee_address text,
  cod_amount integer,
  weight numeric DEFAULT 0.5,
  notes text,
  booked_at timestamptz,
  api_response jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.courier_bookings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "courier_bookings_anon_select" ON public.courier_bookings FOR SELECT USING (true);
CREATE POLICY "courier_bookings_anon_insert" ON public.courier_bookings FOR INSERT WITH CHECK (true);
CREATE POLICY "courier_bookings_anon_update" ON public.courier_bookings FOR UPDATE USING (true) WITH CHECK (true);

-- Table: payment_transactions
CREATE TABLE IF NOT EXISTS public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  payment_method text NOT NULL,
  transaction_id text,
  amount integer NOT NULL,
  status text DEFAULT 'pending',
  screenshot_url text,
  verified_by text,
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.payment_transactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "payment_transactions_anon_select" ON public.payment_transactions FOR SELECT USING (true);
CREATE POLICY "payment_transactions_anon_insert" ON public.payment_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "payment_transactions_anon_update" ON public.payment_transactions FOR UPDATE USING (true) WITH CHECK (true);

-- Alter orders table
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_booking_id uuid REFERENCES public.courier_bookings(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';

-- Seed new admin_settings keys
INSERT INTO public.admin_settings (key, value) VALUES
  ('store_url', 'https://brownbd.com'),
  ('bkash_number', '01XXXXXXXXX'),
  ('nagad_number', '01XXXXXXXXX')
ON CONFLICT (key) DO NOTHING;
