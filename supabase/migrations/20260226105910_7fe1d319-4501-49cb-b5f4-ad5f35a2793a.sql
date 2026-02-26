ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS pathao_consignment_id text,
  ADD COLUMN IF NOT EXISTS pathao_status text,
  ADD COLUMN IF NOT EXISTS pathao_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS item_weight numeric DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS item_description text,
  ADD COLUMN IF NOT EXISTS recipient_city_id integer,
  ADD COLUMN IF NOT EXISTS recipient_zone_id integer,
  ADD COLUMN IF NOT EXISTS recipient_area_id integer,
  ADD COLUMN IF NOT EXISTS delivery_type integer DEFAULT 48,
  ADD COLUMN IF NOT EXISTS amount_to_collect numeric;