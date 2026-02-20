-- Allow anon to update order status (protected by frontend password gate)
CREATE POLICY "orders_anon_update"
ON public.orders FOR UPDATE
TO anon
USING (true)
WITH CHECK (true);