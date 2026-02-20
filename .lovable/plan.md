
# Phase 1: Full Order Flow + Admin Panel for "Brown"

## Overview

This plan connects the existing homepage to a Supabase backend and builds the complete customer purchase journey plus an admin panel. It's a large build broken into 8 sequential phases.

---

## Architecture

```text
┌─────────────────────────────────────────────────────────────┐
│  React Frontend (existing + new)                            │
│                                                             │
│  / (homepage)          → loads products from Supabase       │
│  /product/:slug        → Product Detail Page                │
│  /checkout             → Checkout form + order creation     │
│  /order-confirmation/:id → Thank you page                   │
│  /admin                → Password gate → Admin layout       │
│  /admin/orders         → Order management table             │
│                                                             │
│  CartContext (React Context + localStorage)                 │
│  CartDrawer (Sheet component, global)                       │
└──────────────────┬──────────────────────────────────────────┘
                   │ Supabase client
┌──────────────────▼──────────────────────────────────────────┐
│  Supabase Backend                                           │
│                                                             │
│  Tables: products, product_variants, orders,                │
│          order_items, admin_settings                        │
│                                                             │
│  DB Triggers: generate_order_number, auto_decrement_stock,  │
│               restore_stock_on_cancel                       │
│                                                             │
│  RLS: public read products/variants, public insert orders,  │
│       admin_settings locked (service role only)             │
│                                                             │
│  Edge Function: verify-admin-password                       │
│  (checks admin_settings using service role key)             │
└─────────────────────────────────────────────────────────────┘
```

---

## Step 1 — Connect Supabase

Connect Lovable Cloud to enable the Supabase integration, which will generate the client files at `src/integrations/supabase/`.

---

## Step 2 — Database Schema (Migrations)

Run 4 migration files in sequence:

**Migration 1 — Tables:**
- `products` (id, name, slug, description, price, images[], category, is_active, created_at)
- `product_variants` (id, product_id FK, size, stock, UNIQUE product_id+size)
- `orders` (id, order_number, customer_name, customer_phone, customer_address, customer_city, notes, subtotal, delivery_charge, total, payment_method, status, whatsapp_sent, created_at, updated_at)
- `order_items` (id, order_id FK, product_id FK, product_name, size, quantity, unit_price, total_price)
- `admin_settings` (id, key UNIQUE, value)

**Migration 2 — RLS Policies:**
- `products`: SELECT public, no INSERT/UPDATE/DELETE public
- `product_variants`: SELECT public only
- `orders`: INSERT public (anon), no SELECT/UPDATE public
- `order_items`: INSERT public (anon), no SELECT/UPDATE public
- `admin_settings`: No public access at all

**Migration 3 — DB Functions & Triggers:**
- `generate_order_number()` → BEFORE INSERT on orders
- `decrement_stock_on_order()` → AFTER INSERT on order_items
- `restore_stock_on_cancel()` → AFTER UPDATE on orders

**Migration 4 — Seed Data:**
- Insert 6 products with proper slugs and BDT prices
- Insert variants (S/M/L/XL/XXL, stock 20 each) for all 6 products
- Insert admin_settings: `admin_password = 'brown2024admin'`, `whatsapp_number = '8801XXXXXXXXX'`, `delivery_charge = '80'`

---

## Step 3 — Edge Function: `verify-admin-password`

A Supabase edge function that:
- Accepts POST with `{ password: string }`
- Uses the service role key to query `admin_settings` where key = 'admin_password'
- Returns `{ success: true }` or `{ success: false, error: 'Incorrect password' }`
- Secured via CORS headers

---

## Step 4 — Cart System (Global State)

**New files:**
- `src/contexts/CartContext.tsx` — React Context providing:
  - `items: CartItem[]` (product id, name, slug, image, size, quantity, unit_price)
  - `addItem(product, size, qty)` — checks if item+size exists, increments or adds
  - `removeItem(id, size)`
  - `updateQuantity(id, size, qty)`
  - `clearCart()`
  - `itemCount` (computed total quantity)
  - `subtotal` (computed)
  - `isOpen`, `setIsOpen` — for drawer control
  - Persisted to `localStorage`

- `src/components/cart/CartDrawer.tsx` — Uses Shadcn `Sheet` (right side):
  - Shows each cart item: image, name, size, qty stepper (+/-), price, × remove
  - Subtotal + ৳80 delivery charge
  - "Proceed to Checkout" → navigates to `/checkout`
  - Empty state with shop link

**Updates to existing files:**
- `src/App.tsx` — Wrap everything with `CartProvider`, add `CartDrawer` globally
- `src/components/layout/Navigation.tsx` — Wire cart icon button to `setIsOpen(true)`, show real `itemCount` badge

---

## Step 5 — Customer-Facing Pages

### 5a. Product Detail Page — `src/pages/ProductDetail.tsx`

- Fetches product by slug from Supabase (`products` + `product_variants` join)
- Left: image gallery (main + thumbnails using product `images[]` array)
- Right:
  - Breadcrumb: Home › [Category] › [Product Name]
  - Product name (Cormorant Garamond heading)
  - Price formatted as ৳X,XXX
  - Description paragraph
  - Size selector: pill buttons S M L XL XXL
    - "Only N left" label if stock ≤ 5
    - Disabled + line-through if stock = 0
  - Quantity stepper (1 to available stock)
  - "Add to Cart" — full width, cream bg, espresso text
  - Pre-Order badge if all variants have stock = 0

### 5b. Checkout Page — `src/pages/Checkout.tsx`

- Left panel (desktop): Customer form
  - Full Name, Phone (BD format hint), Delivery Address (textarea), City/District, Order Notes (optional)
  - Payment: COD badge (static, not a selector)
- Right panel (desktop): Order summary
  - Each item: name, size, qty, price
  - Subtotal, Delivery ৳80, **Total**
- "Place Order" button:
  1. Validate all required fields with Zod
  2. `INSERT` into `orders`
  3. `INSERT` all `order_items` (triggers stock decrement)
  4. Build WhatsApp message, open `wa.me/{number}?text=...`
  5. Navigate to `/order-confirmation/:orderId`

### 5c. Order Confirmation Page — `src/pages/OrderConfirmation.tsx`

- Fetches order by ID (using service role or anon INSERT-only — reads orderId from URL, shows data from local state passed via navigation or re-fetches with a dedicated edge function)
- Checkmark animation (CSS keyframe)
- "Thank You, [Name]!" heading
- Order number BRN-XXXXXX prominently displayed
- Order items summary
- "Our team will confirm via WhatsApp soon" message
- "Continue Shopping" → `/`

> Note: Because RLS prevents anon SELECT on orders, order data will be passed via React Router `state` on navigation from checkout, avoiding the need for a special read endpoint.

---

## Step 6 — Update Homepage to Connect Supabase

**Updates:**
- `src/components/home/ProductGrid.tsx` — Replace hardcoded array with `useQuery` fetching from Supabase `products` table. Show skeleton loading state.
  - Product image → `/product/:slug` link
  - "Quick Add" → `addItem(product, 'M', 1)` and open cart drawer

---

## Step 7 — Admin Panel

### 7a. Admin Auth — `src/pages/admin/AdminLogin.tsx`

- Centered card on white/gray background
- Password-only field
- Calls `verify-admin-password` edge function
- On success: writes `{ authenticated: true }` to `sessionStorage`, redirects to `/admin`
- On fail: shows "Incorrect password" error

### 7b. Admin Layout — `src/components/admin/AdminLayout.tsx`

- Top bar: "Brown Admin" text logo + Logout button (clears sessionStorage)
- Sidebar (collapsible on mobile using Sheet):
  - Dashboard icon → `/admin`
  - Orders icon → `/admin/orders`
  - Products icon → `/admin/products` (placeholder)
  - Settings icon → `/admin/settings` (placeholder)
- Protected: if `sessionStorage` doesn't have `authenticated`, redirect to `/admin/login`

### 7c. Admin Dashboard — `src/pages/admin/AdminDashboard.tsx`

- 4 stat cards in a row (responsive grid):
  - Total Orders
  - Pending Orders
  - Today's Revenue (formatted ৳X,XXX)
  - Total Revenue (confirmed + shipped + delivered only)
- Recent Orders table (last 10): Order #, Customer, Items count, Total, Status badge, Time ago, View button

### 7d. Admin Orders Page — `src/pages/admin/AdminOrders.tsx`

- Full orders table
- Status filter tabs: All | Pending | Confirmed | Processing | Shipped | Delivered | Cancelled
- Search box: by order number or customer phone
- Expandable rows: click to see order items detail + delivery address
- Per-row status dropdown (inline update via Supabase UPDATE)
  - When set to 'cancelled' → DB trigger `restore_stock_on_cancel` fires automatically
- Time displayed as "2 hours ago" (using `date-fns` `formatDistanceToNow`)
- Color-coded status badges: amber/blue/purple/indigo/green/red

> Admin reads orders using the Supabase **anon key** — but we need to enable SELECT for admin. Solution: Admin queries go through a dedicated edge function `get-orders` that uses the service role key, bypassing RLS. This keeps customer data secure while giving admin full access.

---

## Step 8 — Routing Updates

Update `src/App.tsx`:

```text
/                          → Index (existing)
/product/:slug             → ProductDetail
/checkout                  → Checkout
/order-confirmation/:id    → OrderConfirmation
/admin                     → AdminLogin (or redirects to Dashboard)
/admin/orders              → AdminOrders (inside AdminLayout)
```

---

## New Files Summary

```text
src/
├── integrations/supabase/           ← auto-generated on connect
├── contexts/
│   └── CartContext.tsx
├── components/
│   ├── cart/
│   │   └── CartDrawer.tsx
│   └── admin/
│       └── AdminLayout.tsx
├── pages/
│   ├── ProductDetail.tsx
│   ├── Checkout.tsx
│   ├── OrderConfirmation.tsx
│   └── admin/
│       ├── AdminLogin.tsx
│       ├── AdminDashboard.tsx
│       └── AdminOrders.tsx
└── supabase/
    └── functions/
        ├── verify-admin-password/index.ts
        └── get-orders/index.ts

supabase/migrations/
├── 001_create_tables.sql
├── 002_rls_policies.sql
├── 003_triggers.sql
└── 004_seed_data.sql
```

---

## Technical Notes

- All prices stored as integers in BDT (not paisa — e.g. 4800 = ৳4,800) for simplicity matching the spec
- `formatPrice(n)` utility: `'৳' + n.toLocaleString('en-IN')`
- Admin panel uses neutral white/gray palette (not cream) for data readability
- All buttons use `rounded-[0.25rem]` matching the existing `--radius: 0.25rem` token
- Cart persists to `localStorage` under key `brown_cart`
- WhatsApp link format: `https://wa.me/{number}?text={encodedMessage}`
- Order confirmation data passed via React Router `location.state` to avoid needing a public SELECT on orders
