
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_coming_soon boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone text DEFAULT 'inside_dhaka';
