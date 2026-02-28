
-- Fix 5: FK ON DELETE SET NULL for abandoned_carts
ALTER TABLE public.abandoned_carts
  DROP CONSTRAINT IF EXISTS abandoned_carts_converted_order_id_fkey;

ALTER TABLE public.abandoned_carts
  ADD CONSTRAINT abandoned_carts_converted_order_id_fkey
  FOREIGN KEY (converted_order_id)
  REFERENCES public.orders(id)
  ON DELETE SET NULL;

-- Fix 6: DELETE RLS policy for abandoned_carts
CREATE POLICY "abandoned_carts_anon_delete"
ON public.abandoned_carts FOR DELETE
USING (true);

-- Fix 7: Enable realtime for orders and abandoned_carts
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.abandoned_carts;
