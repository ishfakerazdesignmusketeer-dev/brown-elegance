
# Phase 3: Abandoned Cart Tracking, Courier UI & Payment UI

## Overview

Phase 3 adds three major capabilities — all manually triggered by the admin, with no automation. The build touches the database (3 new tables + 2 new columns on `orders`), the `CartContext` and `Checkout` pages on the customer side, and 3 brand-new admin pages plus sidebar upgrades. Everything follows the established patterns from Phase 2.

---

## Part 1: Database Migration

One new migration file handles all schema changes.

**New Table: `abandoned_carts`**
```sql
CREATE TABLE public.abandoned_carts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id text NOT NULL UNIQUE,
  customer_phone text,
  customer_name text,
  items jsonb NOT NULL DEFAULT '[]',
  subtotal integer NOT NULL DEFAULT 0,
  recovery_sent boolean DEFAULT false,
  recovery_sent_at timestamptz,
  converted boolean DEFAULT false,
  converted_order_id uuid REFERENCES public.orders(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
```

**New Table: `courier_bookings`**
```sql
CREATE TABLE public.courier_bookings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id) UNIQUE,
  courier_service text NOT NULL DEFAULT 'manual',
  tracking_number text,
  booking_status text DEFAULT 'pending',
  consignee_name text,
  consignee_phone text,
  consignee_address text,
  cod_amount integer,
  weight numeric DEFAULT 0.5,
  notes text,
  booked_at timestamptz,
  api_response jsonb,
  created_at timestamptz DEFAULT now()
);
```

**New Table: `payment_transactions`**
```sql
CREATE TABLE public.payment_transactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  order_id uuid REFERENCES public.orders(id),
  payment_method text NOT NULL,
  transaction_id text,
  amount integer NOT NULL,
  status text DEFAULT 'pending',
  screenshot_url text,
  verified_by text,
  verified_at timestamptz,
  notes text,
  created_at timestamptz DEFAULT now()
);
```

**Alter `orders` table:**
```sql
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS courier_booking_id uuid REFERENCES public.courier_bookings(id);
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS payment_status text DEFAULT 'unpaid';
```

**Seed new `admin_settings` keys:**
```sql
INSERT INTO public.admin_settings (key, value) VALUES
  ('store_url', 'https://brownbd.com'),
  ('bkash_number', '01XXXXXXXXX'),
  ('nagad_number', '01XXXXXXXXX')
ON CONFLICT DO NOTHING;
```

**RLS Policies:**
- `abandoned_carts`: anon INSERT, anon UPDATE (unrestricted for now, password-gated frontend), anon SELECT
- `courier_bookings`: anon SELECT, INSERT, UPDATE (admin manages via frontend)
- `payment_transactions`: anon INSERT, anon SELECT, anon UPDATE

---

## Part 2: File Structure

```text
New pages:
  src/pages/admin/AdminAbandonedCarts.tsx
  src/pages/admin/AdminCourier.tsx
  src/pages/admin/AdminPayments.tsx

Modified files:
  src/contexts/CartContext.tsx          — session_id + debounced upsert
  src/pages/Checkout.tsx               — phone blur update + converted mark
  src/components/admin/AdminLayout.tsx — 3 new sidebar items + badges
  src/pages/admin/AdminOrders.tsx      — courier booking section in expanded row
  src/pages/admin/AdminSettings.tsx    — 3 new setting fields
  src/App.tsx                          — 3 new routes
```

---

## Part 3: CartContext Changes (`CartContext.tsx`)

**What changes:**

1. On mount, generate or retrieve `session_id` from `localStorage` key `brown_session_id` using `crypto.randomUUID()`.

2. Add a `useEffect` that watches `items`. When items change (and there are items), debounce 2 seconds then call:
   ```typescript
   supabase.from("abandoned_carts").upsert({
     session_id,
     items: items,          // stored as jsonb
     subtotal,
     updated_at: new Date().toISOString(),
   }, { onConflict: "session_id" })
   ```

3. Expose `sessionId` from the context so `Checkout.tsx` can reference it.

4. **Important:** Do not upsert if cart is empty — only upsert when `items.length > 0`.

---

## Part 4: Checkout Changes (`Checkout.tsx`)

**Three new behaviours:**

1. **Phone blur handler** — when the phone input loses focus and the value matches a valid BD phone (`/^01[3-9]\d{8}$/`), update the abandoned cart record:
   ```typescript
   supabase.from("abandoned_carts")
     .update({ customer_phone: phone, customer_name: name })
     .eq("session_id", sessionId)
   ```
   This is fire-and-forget (no await needed for UX).

2. **On order success** — after the order is confirmed, mark the cart as converted:
   ```typescript
   supabase.from("abandoned_carts")
     .update({ converted: true, converted_order_id: order.id })
     .eq("session_id", sessionId)
   ```

3. **Payment method UI** — replace the existing static COD block with a styled selector showing three options (COD, bKash, Nagad). bKash and Nagad are visually rendered but disabled with a "Coming Soon" badge. COD remains the only selectable option. The bKash/Nagad merchant numbers will be read from `admin_settings` via a single fetch on mount, falling back to placeholder text if not set.

---

## Part 5: Admin Abandoned Carts Page (`AdminAbandonedCarts.tsx`)

**Route:** `/admin/abandoned-carts`

**Data query:**
```typescript
supabase.from("abandoned_carts")
  .select("*")
  .order("updated_at", { ascending: false })
```

**Header Stats (3 cards):**
- Total Abandoned (converted = false)
- Recovery Sent (recovery_sent = true, converted = false)
- Converted / Recovery Rate %

**Filter tabs:** All | Has Phone | No Phone | Recovery Sent | Converted

**Table columns:** Time | Customer | Phone | Items | Value | Status | Action

**Status badge logic:**
- `converted = true` → green "Converted"
- `recovery_sent = true && !converted` → blue "Sent"
- `customer_phone && !recovery_sent` → amber "Recoverable"
- `!customer_phone` → gray "No Phone"

**"Send Recovery" action:**
1. Build the WhatsApp URL with the pre-filled message (name, items list, subtotal, store URL, COMEBACK10 code)
2. `window.open(waUrl, "_blank")`
3. `supabase.from("abandoned_carts").update({ recovery_sent: true, recovery_sent_at: new Date().toISOString() }).eq("id", id)`
4. Invalidate query → button shows "Sent ✓"

**Store URL** for the recovery message is loaded from `admin_settings` on page mount.

**Expanded row:** Full item breakdown + recovery message preview (read-only textarea showing the exact WhatsApp text that will be sent).

---

## Part 6: Order Row — Courier Booking Section (`AdminOrders.tsx`)

Within the existing expanded row, add a new section below the action buttons.

**When no booking exists** — show a form panel:
- Service selector: 3 buttons (Pathao / Steadfast / Manual)
- Pathao and Steadfast: disabled, tooltip "Coming soon"
- Manual: enabled
- COD Amount: pre-filled from `order.total` (read-only)
- Weight: editable number input (default 0.5 kg)
- Tracking number text input
- Notes textarea
- "Save Tracking Number" button → INSERT to `courier_bookings`, then UPDATE `orders.courier_booking_id`

**When booking exists** — show a status card:
- Service name + tracking number with a "Copy" button
- Booking status badge
- Booked date
- Inline "Update Status" dropdown → `UPDATE courier_bookings SET booking_status`

The Order interface in `AdminOrders.tsx` will need to be extended to include `courier_booking_id` and optionally join `courier_bookings`. To keep the query simple, the courier data will be fetched separately per expanded row using a nested `useQuery` with key `["courier-booking", order.id]`.

---

## Part 7: Admin Courier Page (`AdminCourier.tsx`)

**Route:** `/admin/courier`

**Layout:**
- Info banner: "Pathao & Steadfast API integration coming soon. Use manual tracking entry from Orders."
- Filter tabs: All | Pending | Booked | Picked | Delivered | Failed
- Table columns: Order # | Customer | Address | COD | Service | Tracking # | Status | Booked At
- Click row to expand → show full address + status dropdown
- "Copy Tracking" button per row

**Data query:**
```typescript
supabase.from("courier_bookings")
  .select("*, orders(order_number, customer_name, customer_phone, customer_address, customer_city, total)")
  .order("created_at", { ascending: false })
```

---

## Part 8: Admin Payments Page (`AdminPayments.tsx`)

**Route:** `/admin/payments`

**Header stats:**
- Total COD Pending (orders where `payment_status = 'unpaid'` and `payment_method = 'COD'`)
- Total Revenue Collected (sum of `total` where `status = 'delivered'`)

**Info banner:** "bKash & Nagad manual verification coming in next update."

**COD Orders Table:**
- Columns: Order # | Customer | Total | Order Status | Payment Status | Action
- "Mark Paid" button → `UPDATE orders SET payment_status = 'paid' WHERE id = X`
- Color coding: unpaid = amber, paid = green

**Data query:**
```typescript
supabase.from("orders")
  .select("id, order_number, customer_name, total, status, payment_status, payment_method")
  .order("created_at", { ascending: false })
```

---

## Part 9: Settings Page Additions (`AdminSettings.tsx`)

Add 3 new keys to `SETTING_META` and `orderedKeys`:
- `store_url` → "Store URL"
- `bkash_number` → "bKash Number"
- `nagad_number` → "Nagad Number"

These will appear in the existing settings form automatically since the form iterates over `orderedKeys`.

---

## Part 10: Sidebar Upgrade (`AdminLayout.tsx`)

Replace the current 6-item nav with the full 9-item nav. New items need new badge queries:

**Abandoned Carts badge** — count of `abandoned_carts` where `converted = false AND recovery_sent = false AND customer_phone IS NOT NULL` (i.e., recoverable but not yet acted on). Fetched every 60 seconds.

**Courier badge** — count of `courier_bookings` created today (`created_at >= today`). Fetched every 60 seconds.

New icons needed from `lucide-react`: `ShoppingCart` (abandoned carts), `Truck` (courier), `CreditCard` (payments).

Updated nav order:
1. Dashboard
2. Orders (pending badge — existing)
3. Abandoned Carts (recoverable badge)
4. Products
5. Customers
6. Coupons
7. Courier (today's bookings badge)
8. Payments
9. Settings

---

## Part 11: Router Updates (`App.tsx`)

Import and add 3 new routes under `<AdminLayout>`:
```tsx
<Route path="abandoned-carts" element={<AdminAbandonedCarts />} />
<Route path="courier" element={<AdminCourier />} />
<Route path="payments" element={<AdminPayments />} />
```

---

## Build Order

1. Database migration (3 tables, 2 columns, seeds, RLS)
2. `CartContext.tsx` — session_id + debounced upsert
3. `Checkout.tsx` — phone blur, converted mark, payment UI
4. `App.tsx` — 3 new routes
5. `AdminLayout.tsx` — updated sidebar
6. `AdminAbandonedCarts.tsx` — new page
7. `AdminOrders.tsx` — courier section in expanded row
8. `AdminCourier.tsx` — new page
9. `AdminPayments.tsx` — new page
10. `AdminSettings.tsx` — 3 new fields

---

## Technical Notes

- **`abandoned_carts` items column** is `jsonb`, storing the full `CartItem[]` array as-is. TypeScript typing will use `Json` from the Supabase types file (already imported pattern used in other queries), cast as `CartItem[]` when reading.
- **Debounce in CartContext** uses `useRef` to store the timeout ID — consistent with patterns already used in `AdminOrders.tsx`.
- **Phone blur** in `Checkout.tsx` uses `react-hook-form`'s `register` with an `onBlur` override; since `register` already returns `onBlur`, we compose both with a wrapper function.
- **Courier data in expanded order row** uses a separate `useQuery` with `enabled: expandedId === order.id` so it only fetches when the row is open — no over-fetching.
- **No circular FK problem**: `courier_bookings.order_id → orders.id` and `orders.courier_booking_id → courier_bookings.id` — both columns are nullable so insertion order (courier_booking first, then update order) avoids constraint issues.
- All new admin pages follow the same skeleton loader + empty state + toast pattern from Phase 2.
- The `admin_settings` fetch for bKash/Nagad numbers in `Checkout.tsx` is a lightweight one-time `useEffect` on mount, not a TanStack query, to keep the checkout form simple.
