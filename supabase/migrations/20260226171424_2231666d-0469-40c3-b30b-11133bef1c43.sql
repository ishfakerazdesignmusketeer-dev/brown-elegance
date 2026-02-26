ALTER TABLE orders 
  DROP COLUMN IF EXISTS pathao_consignment_id,
  DROP COLUMN IF EXISTS pathao_status,
  DROP COLUMN IF EXISTS pathao_sent_at,
  DROP COLUMN IF EXISTS item_weight,
  DROP COLUMN IF EXISTS item_description,
  DROP COLUMN IF EXISTS recipient_city_id,
  DROP COLUMN IF EXISTS recipient_zone_id,
  DROP COLUMN IF EXISTS recipient_area_id,
  DROP COLUMN IF EXISTS delivery_type,
  DROP COLUMN IF EXISTS amount_to_collect;