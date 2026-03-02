

# Fix Bulk Delete Foreign Key Error in Admin Orders

## Problem
Deleting orders fails with `stock_history_order_id_fkey` error because the delete functions clear `abandoned_carts` references but not `stock_history` references.

## Changes

### 1. Database Migration
Add `ON DELETE SET NULL` to both foreign keys so the database handles this automatically going forward:

```sql
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
```

### 2. File: `src/pages/admin/AdminOrders.tsx`

**Bulk delete (line ~192-199):** Add `stock_history` cleanup before deleting orders:
```typescript
// After abandoned_carts cleanup (line 194), add:
await supabase.from("stock_history").update({ order_id: null }).in("order_id", ids);
```

**Single delete (line ~220-227):** Add `stock_history` cleanup before deleting orders:
```typescript
// After abandoned_carts cleanup (line 222), add:
await supabase.from("stock_history").update({ order_id: null }).eq("order_id", id);
```

No other files or functionality changed.
