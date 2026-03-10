

# Fix: Full Stock Management — Deduct on Confirmed & Completed

## Current State

The function `handle_stock_on_status_change()` exists but **no trigger is attached to the `orders` table** — so stock never deducts at all right now.

The function also only handles `confirmed`, not `completed`.

## Logic

- **Deduct stock** when status changes to `confirmed` OR `completed` — but only if `stock_deducted = false` (prevents double-deduction when going confirmed → completed)
- **Restore stock** when status changes to `cancelled` — but only if `stock_deducted = true`
- The `stock_deducted` flag on the order is the single source of truth

## Fix — One Database Migration, Zero Code Changes

Update the function and create the missing trigger:

```sql
CREATE OR REPLACE FUNCTION public.handle_stock_on_status_change()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path TO 'public'
AS $$
BEGIN
  -- Deduct on confirmed or completed (only if not already deducted)
  IF NEW.status IN ('confirmed', 'completed')
     AND OLD.status IS DISTINCT FROM NEW.status
     AND NEW.stock_deducted = false THEN

    UPDATE product_variants pv SET stock = pv.stock - oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND pv.product_id = oi.product_id AND pv.size = oi.size;

    INSERT INTO stock_history (product_id, variant_id, product_name, size, change_amount, reason, order_id)
    SELECT oi.product_id, pv.id, oi.product_name, oi.size, -oi.quantity,
           'order_' || NEW.status, NEW.id
    FROM order_items oi
    LEFT JOIN product_variants pv ON pv.product_id = oi.product_id AND pv.size = oi.size
    WHERE oi.order_id = NEW.id;

    NEW.stock_deducted := true;
  END IF;

  -- Restore on cancelled (only if stock was deducted)
  IF NEW.status = 'cancelled'
     AND OLD.status IS DISTINCT FROM 'cancelled'
     AND NEW.stock_deducted = true THEN

    UPDATE product_variants pv SET stock = pv.stock + oi.quantity
    FROM order_items oi
    WHERE oi.order_id = NEW.id AND pv.product_id = oi.product_id AND pv.size = oi.size;

    INSERT INTO stock_history (product_id, variant_id, product_name, size, change_amount, reason, order_id)
    SELECT oi.product_id, pv.id, oi.product_name, oi.size, oi.quantity,
           'order_cancelled', NEW.id
    FROM order_items oi
    LEFT JOIN product_variants pv ON pv.product_id = oi.product_id AND pv.size = oi.size
    WHERE oi.order_id = NEW.id;

    NEW.stock_deducted := false;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_stock_on_status_change ON public.orders;
CREATE TRIGGER trigger_stock_on_status_change
  BEFORE UPDATE ON public.orders
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_stock_on_status_change();
```

## Scenario Walkthrough

| Transition | stock_deducted before | Action | stock_deducted after |
|---|---|---|---|
| pending → confirmed | false | Deduct | true |
| confirmed → completed | true | Skip (already deducted) | true |
| pending → completed | false | Deduct | true |
| confirmed → cancelled | true | Restore | false |
| completed → cancelled | true | Restore | false |
| cancelled → confirmed | false | Deduct | true |

## What Changes
- **Database only** — one migration updating the function + creating the trigger
- **Zero application code changes**
- No other tables, orders, or features are touched

