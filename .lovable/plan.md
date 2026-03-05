

# Fix: Admin Print Invoice + Currency Label Bug

## Two Issues

### Issue 1 — Admin print button shows blank/black page
The `handlePrint` in `OrderDetailModal.tsx` (and `AdminOrderDetail.tsx`, `AdminOrders.tsx`) calls `window.print()`, which prints the dark admin UI. Fix: add a `printInvoicePDF` function to `generateInvoicePDF.ts` that generates the same PDF but opens it in a new browser tab for printing instead of saving.

### Issue 2 — Currency shows "$45.50 BDT" when USD is selected
Multiple storefront files append a hardcoded ` BDT` suffix after `formatPrice()`. Since `formatPrice` already returns the currency symbol (`৳` or `$`), the ` BDT` suffix must be removed.

---

## Changes

### 1. `src/lib/generateInvoicePDF.ts`
- Add `printInvoicePDF` export — identical PDF generation logic as `generateInvoicePDF`, but ends with `doc.output('blob')` → `window.open(blobUrl)` → `printWindow.print()` instead of `doc.save()`.

### 2. `src/components/admin/OrderDetailModal.tsx`
- Import `printInvoicePDF` from `@/lib/generateInvoicePDF`
- Replace `handlePrint` body: call `printInvoicePDF(order)` instead of `setPrintOrder` + `window.print()`

### 3. `src/pages/admin/AdminOrderDetail.tsx`
- Same fix: replace `window.print()` with `printInvoicePDF(order)`

### 4. `src/pages/admin/AdminOrders.tsx`
- Same fix: replace `window.print()` with `printInvoicePDF(order)`

### 5. Currency label fix — remove hardcoded ` BDT` suffix from these files:
- `src/components/home/ProductGrid.tsx` — 3 occurrences of ` BDT`
- `src/pages/ProductDetail.tsx` — 2 occurrences of `<span>BDT</span>`
- `src/pages/Collections.tsx` — 3 occurrences of ` BDT`
- `src/components/cart/AddToCartModal.tsx` — 3 occurrences of ` BDT`
- `src/components/cart/CartReminder.tsx` — 1 occurrence of ` BDT`

---

## Files touched
1. `src/lib/generateInvoicePDF.ts` — add `printInvoicePDF`
2. `src/components/admin/OrderDetailModal.tsx` — use `printInvoicePDF`
3. `src/pages/admin/AdminOrderDetail.tsx` — use `printInvoicePDF`
4. `src/pages/admin/AdminOrders.tsx` — use `printInvoicePDF`
5. `src/components/home/ProductGrid.tsx` — remove ` BDT`
6. `src/pages/ProductDetail.tsx` — remove ` BDT`
7. `src/pages/Collections.tsx` — remove ` BDT`
8. `src/components/cart/AddToCartModal.tsx` — remove ` BDT`
9. `src/components/cart/CartReminder.tsx` — remove ` BDT`

No other files changed.

