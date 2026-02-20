-- Allow product_variants to be managed by anon (needed for ProductPanel to save stock)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variants' AND policyname = 'product_variants_anon_insert') THEN
    CREATE POLICY "product_variants_anon_insert" ON public.product_variants FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variants' AND policyname = 'product_variants_anon_update') THEN
    CREATE POLICY "product_variants_anon_update" ON public.product_variants FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'product_variants' AND policyname = 'product_variants_anon_delete') THEN
    CREATE POLICY "product_variants_anon_delete" ON public.product_variants FOR DELETE TO anon USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_anon_insert') THEN
    CREATE POLICY "products_anon_insert" ON public.products FOR INSERT TO anon WITH CHECK (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'products' AND policyname = 'products_anon_update') THEN
    CREATE POLICY "products_anon_update" ON public.products FOR UPDATE TO anon USING (true) WITH CHECK (true);
  END IF;
END
$$;
