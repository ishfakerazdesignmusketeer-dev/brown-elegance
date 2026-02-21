-- Allow updating order_items (needed to nullify product_id on product delete)
CREATE POLICY "order_items_anon_update" ON public.order_items FOR UPDATE USING (true) WITH CHECK (true);