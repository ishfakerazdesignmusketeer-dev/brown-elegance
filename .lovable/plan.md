

# Three Admin Improvements

## PART 1 — Delivery Charge Options

### CreateOrderPanel.tsx
- Change `deliveryZone` state type to include `"walk_in"`
- Remove the dynamic delivery prices query — use hardcoded ৳100/৳130/৳0
- Replace the 2-button pill selector with 3 pills: Inside Dhaka ৳100, Outside Dhaka ৳130, Walk-in ৳0
- Update delivery charge calculation: `walk_in` = 0, `inside_dhaka` = 100, `outside_dhaka` = 130
- Update totals display: when walk_in, show "Delivery: ৳0 (Free — Walk-in)"

### Checkout.tsx (storefront)
- Update default delivery prices from `{ inside: 100, outside: 130 }` (already correct)
- No walk-in option on storefront — keep as-is with 2 options

### Files: `CreateOrderPanel.tsx`, `Checkout.tsx`

---

## PART 2 — Full Order Edit After Placement

### OrderDetailModal.tsx
- Add `editMode` state and an "Edit Order" button in the header
- When edit mode is active, all fields become editable inputs:
  - Customer info: name, phone, address, city (thana/district via customer_city)
  - Order items: editable quantity, price, remove button per row
  - Pricing: delivery charge, discount, auto-recalculated total
  - Payment: method dropdown (COD/bKash/Nagad/In-Store), status dropdown (unpaid/partial/paid), advance amount input, auto-calculated amount_to_collect
  - Status dropdown: pending/processing/confirmed/completed/cancelled/refunded
  - Delivery zone: 3-option selector (inside/outside/walk-in) with charge auto-update
  - Notes textarea
- Save button: update `orders` table with all changed fields, update `order_items` for quantity/price changes and deletions, show success toast, exit edit mode
- Cancel button: discard changes, restore original values
- Stock deduction/restoration is handled by the existing `handle_stock_on_status_change` trigger — no manual logic needed

### Files: `OrderDetailModal.tsx`

---

## PART 3 — Currency Switcher

### New file: `src/contexts/CurrencyContext.tsx`
- Create CurrencyContext with `currency`, `setCurrency`, `exchangeRate`, `formatPrice(bdtAmount)`
- Load `usd_exchange_rate` from `admin_settings` on mount
- BDT mode: `৳X,XXX` format; USD mode: `$XX.XX` format

### App.tsx
- Wrap with `CurrencyProvider`

### Navigation.tsx
- Add currency toggle pill `[৳ BDT] [$ USD]` next to cart icon

### Storefront files — replace `formatPrice` import with `useCurrency().formatPrice`:
- `src/components/home/ProductGrid.tsx`
- `src/pages/Collections.tsx`
- `src/pages/ProductDetail.tsx`
- `src/components/cart/CartDrawer.tsx`
- `src/components/cart/CartReminder.tsx`
- `src/pages/Checkout.tsx`
- `src/pages/OrderConfirmation.tsx`
- `src/pages/MyOrders.tsx`

### AdminSettings.tsx
- Add "USD Exchange Rate" input field in settings with save

### Database
- Insert `usd_exchange_rate` = `'110'` into `admin_settings`

### NOT changed:
- Admin panel prices (always use `formatPrice` from `@/lib/format`)
- Invoice PDF
- Database values

---

## Summary of files touched:
1. `src/components/admin/CreateOrderPanel.tsx` — walk-in delivery option
2. `src/components/admin/OrderDetailModal.tsx` — full edit mode
3. `src/contexts/CurrencyContext.tsx` — new file
4. `src/App.tsx` — wrap with CurrencyProvider
5. `src/components/layout/Navigation.tsx` — currency toggle
6. `src/pages/admin/AdminSettings.tsx` — exchange rate field
7. `src/components/home/ProductGrid.tsx` — use currency context
8. `src/pages/Collections.tsx` — use currency context
9. `src/pages/ProductDetail.tsx` — use currency context
10. `src/components/cart/CartDrawer.tsx` — use currency context
11. `src/components/cart/CartReminder.tsx` — use currency context
12. `src/pages/Checkout.tsx` — use currency context + delivery prices already correct
13. `src/pages/OrderConfirmation.tsx` — use currency context
14. `src/pages/MyOrders.tsx` — use currency context
15. DB migration: insert `usd_exchange_rate` setting

