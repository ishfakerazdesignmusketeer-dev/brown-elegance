
-- Create order_notes table
CREATE TABLE IF NOT EXISTS public.order_notes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) ON DELETE CASCADE NOT NULL,
  note text NOT NULL,
  created_at timestamptz DEFAULT now(),
  created_by text DEFAULT 'admin'
);

-- Enable RLS
ALTER TABLE public.order_notes ENABLE ROW LEVEL SECURITY;

-- RLS policies for order_notes
CREATE POLICY "order_notes_anon_all" ON public.order_notes FOR ALL USING (true) WITH CHECK (true);

-- Add source column to orders
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS source text DEFAULT 'Website';

-- Allow delete on orders (currently missing)
CREATE POLICY "orders_anon_delete" ON public.orders FOR DELETE USING (true);

-- Allow delete on order_items (for cascade)
CREATE POLICY "order_items_anon_delete" ON public.order_items FOR DELETE USING (true);
