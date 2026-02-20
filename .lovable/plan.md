
# Phase 2: Full Admin Panel Upgrade

## Overview

This plan covers the complete Phase 2 build for the Brown admin panel. It involves database schema changes, 5 new admin pages, upgrades to existing pages, coupon validation at checkout, and a fully wired sidebar. Every section is broken into discrete, sequential steps.

---

## Part 1: Database Migration

One SQL migration file will handle all schema changes:

**New Tables:**

```text
customers
  id            uuid PK default gen_random_uuid()
  name          text NOT NULL
  phone         text UNIQUE NOT NULL
  address       text
  city          text
  total_orders  integer default 0
  total_spent   integer default 0
  created_at    timestamptz default now()
  last_order_at timestamptz

coupons
  id              uuid PK default gen_random_uuid()
  code            text UNIQUE NOT NULL
  discount_type   text ('percentage' | 'fixed')
  discount_value  integer NOT NULL
  min_order_amount integer default 0
  max_uses        integer nullable
  used_count      integer default 0
  is_active       boolean default true
  expires_at      timestamptz nullable
  created_at      timestamptz default now()
```

**Alter orders table:**
```sql
ALTER TABLE orders ADD COLUMN IF NOT EXISTS coupon_code text;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS discount_amount integer DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS customer_id uuid REFERENCES customers(id);
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_note text;
```

**RLS Policies:**
- `customers`: anon SELECT, INSERT, UPDATE
- `coupons`: anon SELECT only (write is admin-only via service role)

**Trigger + Function:**
```sql
CREATE OR REPLACE FUNCTION upsert_customer_on_order()
-- After INSERT on orders: upsert into customers by phone,
-- then UPDATE orders.customer_id with the resolved customer id
CREATE TRIGGER auto_upsert_customer
AFTER INSERT ON orders FOR EACH ROW
EXECUTE FUNCTION upsert_customer_on_order();
```

**Storage Bucket:**
```sql
INSERT INTO storage.buckets (id, name, public) VALUES ('product-images', 'product-images', true);
-- RLS: allow anon upload and public read
```

---

## Part 2: File Structure

```text
New pages:
  src/pages/admin/AdminProducts.tsx
  src/pages/admin/AdminCustomers.tsx
  src/pages/admin/AdminCoupons.tsx
  src/pages/admin/AdminSettings.tsx

New components:
  src/components/admin/ProductPanel.tsx       (slide-over add/edit product)
  src/components/admin/CustomerPanel.tsx      (slide-over customer detail)
  src/components/admin/InvoicePrint.tsx       (printable invoice component)
  src/components/admin/StockOverview.tsx      (inline stock editor table)

Modified files:
  src/components/admin/AdminLayout.tsx        (new nav items + pending badge)
  src/pages/admin/AdminDashboard.tsx          (full upgrade with charts)
  src/pages/admin/AdminOrders.tsx             (expanded rows, bulk actions, invoice)
  src/pages/Checkout.tsx                      (coupon input + validation)
  src/App.tsx                                 (new routes)
```

---

## Part 3: Admin Sidebar Upgrade (`AdminLayout.tsx`)

- Replace the 4-item nav (with 2 "Soon" placeholders) with 6 real links:
  - Dashboard, Orders (with live pending badge), Products, Customers, Coupons, Settings
- The pending orders badge will be a separate `useQuery` fetching `count` of `status=pending` orders, displayed as a red dot/number on the Orders link
- Remove all `isPlaceholder` logic

---

## Part 4: Dashboard Full Upgrade (`AdminDashboard.tsx`)

**8 stat cards (2 rows of 4):**

Row 1: Total Revenue · Today's Revenue · This Month's Revenue · Average Order Value  
Row 2: Total Orders · Pending Orders (clickable link) · Total Customers · Low Stock Alert

All computed from a single `orders` query + a separate `product_variants` query for low-stock count + a `customers` count query.

**Revenue Chart (recharts AreaChart):**
- 30-day rolling window
- Group orders by `created_at` date
- X axis: date labels, Y axis: ৳ values
- Fill color: `#2E2319` at 20% opacity, stroke `#2E2319`
- Custom tooltip showing date + formatted revenue

**Order Status Donut Chart (recharts PieChart):**
- Colors matching existing status badge palette
- Legend showing count per status

**Top Products Table:**
- Aggregate `order_items` grouped by `product_name`, sum `quantity` and `total_price`
- Show top 5 by units sold

**Recent Orders (compact, 5 rows):**
- Inline status dropdown per row
- "View All" link to /admin/orders

---

## Part 5: Order Management Upgrades (`AdminOrders.tsx`)

**Expanded Row (click to expand):**
The current expanded row shows basic info. Upgrade to show:
- Full address block
- Items table with image thumbnail (from `products.images[0]`), name, size, qty, unit price, line total
- Notes + delivery note field (inline editable textarea, saved on blur)
- Coupon applied + discount breakdown
- Subtotal / Delivery / Discount / Total breakdown
- Two action buttons: **Print Invoice** and **Send WhatsApp**

**Bulk Actions:**
- Checkbox column added to the left of every row
- Select-all checkbox in `<thead>`
- Dropdown `<select>` for bulk status (Confirmed / Processing / Shipped / Cancelled)
- "Apply" button runs a `Promise.all` of individual `UPDATE` calls (or a single `UPDATE ... WHERE id IN (...)` via Supabase `.in()`)

**Print Invoice:**
- `InvoicePrint.tsx` component renders into a hidden `<div id="invoice-print-area">`
- Uses `window.print()` — a `@media print` CSS block shows only `#invoice-print-area` and hides everything else
- Invoice layout: header with BROWN + tagline, Bill To section, items table, totals, payment method, thank-you note

**Delivery Note:**
- Inline `<textarea>` in expanded row
- `onBlur` triggers `supabase.from('orders').update({ delivery_note })` mutation
- Displayed in expanded row and printed on invoice

---

## Part 6: Product Management (`AdminProducts.tsx` + `ProductPanel.tsx`)

**Product List Page:**
- Grid of cards: product image, name, category badge, price, stock summary (lowest size stock), active toggle
- "Add New Product" button → opens `ProductPanel` slide-over
- Click product card → opens `ProductPanel` in edit mode

**ProductPanel (slide-over, 480px):**
Fields:
- Name → auto-generates slug (kebab-case from name)
- Slug (editable override)
- Category (select: formal / everyday / festive / casual)
- Price in BDT (stored as integer — the products table stores price in integer, so we store the exact BDT amount)
- Description (textarea)
- Images upload (multiple, via `supabase.storage.from('product-images').upload()`)
  - Show upload progress + image previews
  - Store public URLs in `products.images[]`
- Size/Stock table: S · M · L · XL · XXL with number inputs per size
- Is Active toggle
- Save (upsert `products` record + upsert `product_variants` per size)

**Stock Overview Section (below product list):**
- Full table: Product | S | M | L | XL | XXL | Total
- Cells color coded: red = 0, amber = 1–5, green = >5
- Click cell to edit inline (contenteditable or input overlay)
- Save row button triggers batch `UPDATE product_variants`

---

## Part 7: Customer Management (`AdminCustomers.tsx` + `CustomerPanel.tsx`)

**Customer List:**
- Table: Name | Phone | City | Total Orders | Total Spent | Last Order | Action
- Default sort: `total_spent DESC`
- Search bar (debounced) filtering by name or phone via `.ilike`
- Skeleton loader while fetching

**CustomerPanel (slide-over):**
- Header: name, phone, city, member since
- Stats: Total Orders, Total Spent, Avg Order Value
- Order history table (fetched via `orders` where `customer_id = X`)
- "Send WhatsApp" button → `window.open('https://wa.me/88' + phone)`

---

## Part 8: Coupons (`AdminCoupons.tsx`)

**Coupon List:**
- Table: Code | Type | Value | Min Order | Used/Max | Expires | Active | Delete
- Active toggle → `UPDATE coupons SET is_active`
- Delete → `DELETE FROM coupons`

**Add Coupon Form (inline on same page, above or beside list):**
- Code (auto-uppercased on input)
- Type: Percentage / Fixed BDT
- Value
- Min Order Amount (optional)
- Max Uses (optional)
- Expiry Date (optional)
- Create button → INSERT

---

## Part 9: Settings Page (`AdminSettings.tsx`)

- On mount, fetch all rows from `admin_settings`
- Render each as a labeled input (WhatsApp Number, Delivery Charge, Admin Password as masked, Store Name, Store Email)
- "Save All" → loop through and `UPDATE admin_settings SET value = ... WHERE key = ...`
- Toast on success/error

---

## Part 10: Coupon Validation at Checkout (`Checkout.tsx`)

Between the order summary and the total:
- Add "Coupon Code" text input + "Apply" button
- On Apply:
  1. Query `coupons` where `code = X AND is_active = true`
  2. Validate: not expired, `used_count < max_uses` (if set), `subtotal >= min_order_amount`
  3. If valid: compute discount, show discount line in summary, store `appliedCoupon` state
  4. If invalid: show red error message
- Total line updates to `subtotal + delivery - discount`
- On successful order placement: `UPDATE coupons SET used_count = used_count + 1`
- Pass `coupon_code` and `discount_amount` when inserting the order

---

## Part 11: Router Updates (`App.tsx`)

Add 4 new routes nested inside `<AdminLayout>`:
```tsx
<Route path="products" element={<AdminProducts />} />
<Route path="customers" element={<AdminCustomers />} />
<Route path="coupons" element={<AdminCoupons />} />
<Route path="settings" element={<AdminSettings />} />
```

---

## Build Order (Implementation Sequence)

1. Database migration (new tables, altered columns, trigger, storage bucket)
2. `App.tsx` — add new routes
3. `AdminLayout.tsx` — updated sidebar with all 6 nav items + pending badge
4. `AdminDashboard.tsx` — full upgrade with charts
5. `AdminOrders.tsx` — expanded rows, bulk actions, invoice print, delivery note
6. `InvoicePrint.tsx` — print component + global `@media print` CSS
7. `AdminProducts.tsx` + `ProductPanel.tsx` + `StockOverview.tsx`
8. `AdminCustomers.tsx` + `CustomerPanel.tsx`
9. `AdminCoupons.tsx`
10. `AdminSettings.tsx`
11. `Checkout.tsx` — coupon field + validation

---

## Technical Notes

- All Supabase queries use the existing anon client (`src/integrations/supabase/client.ts`) — no edge functions needed
- `recharts` is already installed — `AreaChart`, `PieChart` will be imported from it
- Slide-over panels use the existing `Sheet` / `SheetContent` from `@radix-ui/react-dialog` (already in the project as `src/components/ui/sheet.tsx`)
- Image uploads go to the `product-images` storage bucket; public URLs are retrieved via `supabase.storage.from('product-images').getPublicUrl(path)`
- The `upsert_customer_on_order` trigger runs server-side so the customer table populates automatically from existing and future orders
- Print CSS will be injected via a `<style>` tag in `InvoicePrint.tsx` using `@media print { body * { display: none } #invoice-print-area { display: block } }`
- All monetary values are stored as integers (BDT, not paisa) consistent with the existing schema
- Toast notifications use the already-configured `sonner` toaster
