
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS offer_price integer,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS weight integer,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_preorder boolean DEFAULT false;

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;

ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS product_variants_product_id_size_key;

ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_product_id_size_key
  UNIQUE (product_id, size);
