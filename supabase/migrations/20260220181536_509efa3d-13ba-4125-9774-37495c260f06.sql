
-- Allow anon to SELECT orders they just inserted (needed to read back order_number after insert)
CREATE POLICY "orders_anon_select"
ON public.orders FOR SELECT
TO anon
USING (true);

-- Allow anon to SELECT order_items
CREATE POLICY "order_items_anon_select"
ON public.order_items FOR SELECT
TO anon
USING (true);
