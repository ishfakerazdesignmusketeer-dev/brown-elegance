
-- Drop existing permissive policies and recreate targeting anon role explicitly
DROP POLICY IF EXISTS "orders_public_insert" ON public.orders;
DROP POLICY IF EXISTS "order_items_public_insert" ON public.order_items;

-- Allow anonymous users to insert orders
CREATE POLICY "orders_anon_insert"
ON public.orders FOR INSERT
TO anon
WITH CHECK (true);

-- Allow anonymous users to insert order_items
CREATE POLICY "order_items_anon_insert"
ON public.order_items FOR INSERT
TO anon
WITH CHECK (true);
