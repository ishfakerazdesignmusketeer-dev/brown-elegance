

# Fix: Print Invoice, Stock Double-Deduction, Currency Label

## Issue 1 — Admin Print Shows Blank Page

**Root cause**: `handlePrint` in `OrderDetailModal.tsx` (line 164-167) calls `window.print()`, which prints the dark admin UI.

**Fix**: Add `printInvoicePDF` to `generateInvoicePDF.ts` — identical PDF logic but opens in a new browser tab via `doc.output('bloburl')` instead of `doc.save()`. Update `handlePrint` in `OrderDetailModal.tsx` to call `printInvoicePDF(order)`.

### Files
- `src/lib/generateInvoicePDF.ts` — add `printInvoicePDF` export
- `src/components/admin/OrderDetailModal.tsx` — import and use `printInvoicePDF`

---

## Issue 2 — Stock Double Deduction (CRITICAL)

**Root cause**: Migration `20260227102639` tried to drop the old triggers but used wrong names:
- Drops `decrement_stock_on_order` — but the actual trigger is named `auto_decrement_stock`
- Drops `restore_stock_on_cancel` — but the actual trigger is named `restore_stock_on_order_cancel`

So the old `auto_decrement_stock` trigger (INSERT on order_items → immediately deduct stock) is **still active**. When an order is placed, stock is deducted immediately. Then when status changes to "confirmed", the new `handle_stock_on_status_change` trigger deducts again. **This is why 1 piece ordered = 2 pieces deducted.**

**Fix**: Run a migration to drop the old triggers by their correct names:

```sql
DROP TRIGGER IF EXISTS auto_decrement_stock ON public.order_items;
DROP TRIGGER IF EXISTS restore_stock_on_order_cancel ON public.orders;
DROP FUNCTION IF EXISTS decrement_stock_on_order();
DROP FUNCTION IF EXISTS restore_stock_on_cancel();
```

This leaves only the correct `handle_stock_on_status_change` trigger, which deducts on "confirmed" and restores on "cancelled".

---

## Issue 3 — Currency Shows "$45.50 BDT"

**Root cause**: Multiple storefront files append a hardcoded ` BDT` or `<span>BDT</span>` after calling `formatPrice()`. Since `formatPrice` from CurrencyContext already returns the symbol (`৳` or `$`), the suffix causes `$45.50 BDT`.

**Fix**: Remove the hardcoded ` BDT` suffix from:
- `src/components/home/ProductGrid.tsx` — 3 occurrences
- `src/pages/ProductDetail.tsx` — 2 `<span>BDT</span>` elements
- `src/pages/Collections.tsx` — 3 occurrences
- `src/components/cart/AddToCartModal.tsx` — 2 occurrences
- `src/components/cart/CartReminder.tsx` — 1 occurrence

---

## Summary of changes
1. `src/lib/generateInvoicePDF.ts` — add `printInvoicePDF`
2. `src/components/admin/OrderDetailModal.tsx` — use `printInvoicePDF` in `handlePrint`
3. DB migration — drop old stock triggers by correct names
4. 5 storefront files — remove hardcoded ` BDT` suffix

Nothing else changes.

