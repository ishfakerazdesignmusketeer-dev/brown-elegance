ALTER TABLE abandoned_carts
  DROP CONSTRAINT IF EXISTS abandoned_carts_converted_order_id_fkey;
ALTER TABLE abandoned_carts
  ADD CONSTRAINT abandoned_carts_converted_order_id_fkey
  FOREIGN KEY (converted_order_id) REFERENCES orders(id) ON DELETE SET NULL;

ALTER TABLE stock_history
  DROP CONSTRAINT IF EXISTS stock_history_order_id_fkey;
ALTER TABLE stock_history
  ADD CONSTRAINT stock_history_order_id_fkey
  FOREIGN KEY (order_id) REFERENCES orders(id) ON DELETE SET NULL;