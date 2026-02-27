
-- Phase 1: Add columns to orders table
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS stock_deducted boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS payment_type text DEFAULT 'cod',
  ADD COLUMN IF NOT EXISTS advance_amount integer DEFAULT 0,
  ADD COLUMN IF NOT EXISTS amount_to_collect integer DEFAULT 0;

-- Phase 1: Create stock_history table
CREATE TABLE IF NOT EXISTS public.stock_history (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  product_id uuid REFERENCES public.products(id),
  variant_id uuid,
  product_name text,
  size text,
  change_amount integer,
  reason text,
  order_id uuid REFERENCES public.orders(id),
  created_at timestamptz DEFAULT now()
);

-- Enable RLS on stock_history
ALTER TABLE public.stock_history ENABLE ROW LEVEL SECURITY;

-- RLS: authenticated full access
CREATE POLICY "authenticated_all_stock_history" ON public.stock_history
  FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- RLS: anon select
CREATE POLICY "stock_history_anon_select" ON public.stock_history
  FOR SELECT TO anon
  USING (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.stock_history;

-- Drop old stock triggers
DROP TRIGGER IF EXISTS decrement_stock_on_order ON public.order_items;
DROP TRIGGER IF EXISTS restore_stock_on_cancel ON public.orders;

-- Create new trigger function for stock on status change
CREATE OR REPLACE FUNCTION public.handle_stock_on_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- When status changes TO 'confirmed' AND stock not yet deducted
  IF NEW.status = 'confirmed' AND OLD.status IS DISTINCT FROM 'confirmed' AND NEW.stock_deducted = false THEN
    -- Deduct stock
    UPDATE public.product_variants pv
    SET stock = pv.stock - oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND pv.product_id = oi.product_id
      AND pv.size = oi.size;

    -- Log to stock_history
    INSERT INTO public.stock_history (product_id, variant_id, product_name, size, change_amount, reason, order_id)
    SELECT oi.product_id, pv.id, oi.product_name, oi.size, -oi.quantity, 'order_confirmed', NEW.id
    FROM public.order_items oi
    LEFT JOIN public.product_variants pv ON pv.product_id = oi.product_id AND pv.size = oi.size
    WHERE oi.order_id = NEW.id;

    -- Set flag
    NEW.stock_deducted := true;
  END IF;

  -- When status changes TO 'cancelled' AND stock was deducted
  IF NEW.status = 'cancelled' AND OLD.status IS DISTINCT FROM 'cancelled' AND NEW.stock_deducted = true THEN
    -- Restore stock
    UPDATE public.product_variants pv
    SET stock = pv.stock + oi.quantity
    FROM public.order_items oi
    WHERE oi.order_id = NEW.id
      AND pv.product_id = oi.product_id
      AND pv.size = oi.size;

    -- Log to stock_history
    INSERT INTO public.stock_history (product_id, variant_id, product_name, size, change_amount, reason, order_id)
    SELECT oi.product_id, pv.id, oi.product_name, oi.size, oi.quantity, 'order_cancelled', NEW.id
    FROM public.order_items oi
    LEFT JOIN public.product_variants pv ON pv.product_id = oi.product_id AND pv.size = oi.size
    WHERE oi.order_id = NEW.id;

    -- Clear flag
    NEW.stock_deducted := false;
  END IF;

  RETURN NEW;
END;
$$;

-- Create the trigger
CREATE TRIGGER handle_stock_on_status_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_stock_on_status_change();
