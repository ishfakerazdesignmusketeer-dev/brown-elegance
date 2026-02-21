
-- Allow deleting products
CREATE POLICY "products_anon_delete" ON public.products FOR DELETE USING (true);

-- Allow deleting associated variants when product is deleted
-- (variants already have delete policy)
