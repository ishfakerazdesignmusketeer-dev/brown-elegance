ALTER TABLE products ADD COLUMN IF NOT EXISTS is_studio_exclusive boolean DEFAULT false;

INSERT INTO admin_settings (key, value) VALUES
  ('studio_name', ''),
  ('studio_address', ''),
  ('studio_city', ''),
  ('studio_map_url', ''),
  ('studio_hours', '')
ON CONFLICT (key) DO NOTHING;