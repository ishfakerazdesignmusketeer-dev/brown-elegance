
# Pathao Courier API Integration

## Overview
Full integration of Pathao Courier API into the Brown House admin system, using backend functions as a proxy to handle authentication, order creation, tracking, and location lookups.

---

## Phase 1: Database Schema Changes

Add Pathao-related columns to the `orders` table:

```sql
ALTER TABLE orders 
  ADD COLUMN IF NOT EXISTS pathao_consignment_id text,
  ADD COLUMN IF NOT EXISTS pathao_status text,
  ADD COLUMN IF NOT EXISTS pathao_sent_at timestamptz,
  ADD COLUMN IF NOT EXISTS item_weight numeric DEFAULT 0.5,
  ADD COLUMN IF NOT EXISTS item_description text,
  ADD COLUMN IF NOT EXISTS recipient_city_id integer,
  ADD COLUMN IF NOT EXISTS recipient_zone_id integer,
  ADD COLUMN IF NOT EXISTS recipient_area_id integer,
  ADD COLUMN IF NOT EXISTS delivery_type integer DEFAULT 48,
  ADD COLUMN IF NOT EXISTS amount_to_collect numeric;
```

Seed Pathao credential keys into `admin_settings`:

```sql
INSERT INTO admin_settings (key, value) VALUES
  ('pathao_client_id', ''),
  ('pathao_client_secret', ''),
  ('pathao_username', ''),
  ('pathao_password', ''),
  ('pathao_store_id', '372992'),
  ('pathao_access_token', ''),
  ('pathao_refresh_token', ''),
  ('pathao_token_expires_at', ''),
  ('pathao_sender_phone', '')
ON CONFLICT (key) DO NOTHING;
```

---

## Phase 2: Backend Functions (6 functions)

All functions use CORS headers and `verify_jwt = false` in config.toml. Each reads Pathao credentials from `admin_settings` and handles token refresh automatically.

### Function 1: `pathao-auth`
- POST endpoint
- Reads `pathao_client_id`, `pathao_client_secret`, `pathao_username`, `pathao_password` from `admin_settings`
- Calls `POST https://hermes-api.pathao.com/aladdin/api/v1/issue-token` with `grant_type: 'password'`
- Saves `access_token`, `refresh_token`, and computed `token_expires_at` back to `admin_settings`
- Returns success/failure status

### Function 2: `pathao-create-order`
- POST endpoint, accepts `{ order_id }`
- Fetches order + order_items from database
- Auto-refreshes token if expiring within 1 hour
- Calls `POST https://hermes-api.pathao.com/aladdin/api/v1/orders` with order data
- On success: updates order with `pathao_consignment_id`, `pathao_status`, `pathao_sent_at`, sets `status = 'sent_to_courier'`
- Returns consignment details or error

### Function 3: `pathao-track-order`
- POST endpoint, accepts `{ order_id }` or `{ consignment_id }`
- Calls `GET https://hermes-api.pathao.com/aladdin/api/v1/orders/{consignment_id}`
- Maps Pathao statuses to Brown House statuses:
  - Pending/Pickup_Requested -> sent_to_courier
  - Picked -> picked_up
  - In_Transit -> in_transit
  - Delivered -> completed
  - Returned -> returned
  - Cancelled -> cancelled
- Updates `pathao_status` and optionally `status` in orders table
- Returns current status

### Function 4: `pathao-get-cities`
- GET endpoint
- Calls `GET https://hermes-api.pathao.com/aladdin/api/v1/countries/cities`
- Returns `{ city_id, city_name }[]`

### Function 5: `pathao-get-zones`
- POST endpoint, accepts `{ city_id }`
- Calls `GET https://hermes-api.pathao.com/aladdin/api/v1/cities/{city_id}/zone-list`
- Returns `{ zone_id, zone_name }[]`

### Function 6: `pathao-get-areas`
- POST endpoint, accepts `{ zone_id }`
- Calls `GET https://hermes-api.pathao.com/aladdin/api/v1/zones/{zone_id}/area-list`
- Returns `{ area_id, area_name }[]`

All location functions include token auto-refresh. City data is cached in localStorage on the frontend for 24 hours.

---

## Phase 3: New Order Status Values

Update `STATUS_LIST` and `STATUS_COLORS` in these files:
- `src/pages/admin/AdminOrders.tsx`
- `src/pages/admin/AdminOrderDetail.tsx`
- `src/pages/admin/AdminDashboard.tsx`

New statuses added:
| Status | Badge Color |
|--------|------------|
| sent_to_courier | Blue |
| picked_up | Indigo |
| in_transit | Purple |
| delivered | Green |
| returned | Orange |

Status filter tabs updated to include all new values.

---

## Phase 4: Admin Settings -- Pathao Credentials Section

**File:** `src/pages/admin/AdminSettings.tsx`

Add a new "Pathao Courier Integration" card section with:
- Client ID (password input)
- Client Secret (password input)
- Merchant Email (text input)
- Merchant Password (password input)
- Store ID (text, pre-filled with 372992)
- Sender Phone (text)
- "Connect to Pathao" button -- calls `pathao-auth` function
- Success: shows green "Connected" badge with token expiry
- Failure: shows red error message
- "Test Connection" button -- calls `pathao-get-cities` to verify token works

Add `SETTING_META` entries for all pathao keys and a dedicated `pathaoKeys` array for rendering.

---

## Phase 5: Orders List -- Courier Column

**File:** `src/pages/admin/AdminOrders.tsx`

Add `pathao_consignment_id`, `pathao_status`, `pathao_sent_at`, `recipient_city_id`, `recipient_zone_id`, `recipient_area_id` to Order interface and query.

Add "Courier" column between Source and Actions:
- **Not confirmed**: Gray "Confirm first" text
- **Confirmed, not sent**: Blue "Send to Pathao" button
- **Sent**: Green check badge + consignment ID (copyable, small text)
- **Failed**: Red "Retry" button

Clicking "Send to Pathao":
1. Checks if `recipient_city_id`, `recipient_zone_id`, `recipient_area_id` are set
2. If missing: opens PathaoLocationModal (new component)
3. If complete: calls `pathao-create-order` function
4. Shows loading spinner, then success/error state

---

## Phase 6: Pathao Location Modal

**New file:** `src/components/admin/PathaoLocationModal.tsx`

A dialog modal shown when sending an order to Pathao that lacks location data:
- Order number displayed at top
- Warning text about required fields
- City dropdown (fetched from `pathao-get-cities`, cached in localStorage 24h)
- Zone dropdown (loads on city select via `pathao-get-zones`)
- Area dropdown (loads on zone select via `pathao-get-areas`)
- Item Weight (kg) input, default 0.5
- Amount to Collect (pre-filled from order total)
- Delivery Type radio: Normal (48hrs) / Express (12hrs)
- "Save and Send to Pathao" button
- On save: updates order with IDs, then calls `pathao-create-order`

---

## Phase 7: Bulk Send to Pathao

**File:** `src/pages/admin/AdminOrders.tsx`

Add "Send to Pathao" option in bulk actions dropdown.

Rules:
- Only processes orders where `status` includes confirmed/processing AND `pathao_consignment_id` is null AND `recipient_city_id` is not null
- Shows confirmation modal with count of eligible orders and skipped orders (missing location)
- Sends orders sequentially with 500ms delay between each
- Progress indicator: "Sending 3 of 8..."
- Summary toast on completion

---

## Phase 8: Order Detail -- Pathao Section

**File:** `src/pages/admin/AdminOrderDetail.tsx`

Replace/enhance the existing Courier card:

**Before sending:**
- Keep existing manual tracking form
- Add "Send to Pathao Courier" button (blue, prominent)
- Pathao location fields inline (city/zone/area dropdowns)

**After sending (pathao_consignment_id exists):**
- Courier: Pathao
- Consignment ID with copy button
- Sent at timestamp
- Current Pathao Status badge
- "Refresh Status" button (calls `pathao-track-order`)
- "Print Shipping Label" button
- Track Shipment link (opens Pathao tracking URL)

---

## Phase 9: Shipping Label Print

**File:** `src/pages/admin/AdminOrderDetail.tsx`

Add a print-optimized shipping label component (inline, hidden until print):
- Store name "BROWN HOUSE"
- Consignment ID
- Customer name, phone, address, area, zone, city
- COD amount
- Weight
- Order number
- Date
- Uses `@media print` CSS to show only the label

---

## Phase 10: Auto Status Polling

**File:** `src/pages/admin/AdminOrders.tsx`

When admin opens the orders page:
- After orders load, filter orders with `pathao_consignment_id` set and status not in `['completed', 'delivered', 'returned', 'cancelled']`
- Poll each with `pathao-track-order` sequentially (1s delay between calls)
- Show "Syncing courier status..." indicator at top of page during polling
- Update order data after all polls complete (invalidate query)
- Run once on page load, not on interval (to avoid excessive API calls)

---

## Phase 11: Dashboard Courier Overview

**File:** `src/pages/admin/AdminDashboard.tsx`

Add a "Courier Overview" section after the existing stat rows:

4 stat cards:
- **Pending Dispatch**: Count of orders with `status = 'confirmed'` or `'processing'` and `pathao_consignment_id IS NULL`
- **In Transit**: Count where `pathao_status = 'In_Transit'`
- **Delivered Today**: Count where `pathao_status = 'Delivered'` and `pathao_sent_at` is today
- **Returned**: Count where `pathao_status = 'Returned'`

---

## Phase 12: Token Refresh Handling

Built into all backend functions (shared helper pattern):

Before any Pathao API call:
1. Read `pathao_access_token` and `pathao_token_expires_at` from `admin_settings`
2. If token expires within 1 hour, call refresh endpoint with `grant_type: 'refresh_token'`
3. Save new tokens to `admin_settings`
4. If refresh fails, return error asking admin to reconnect in settings

---

## Files Summary

| File | Action |
|------|--------|
| Database migration | Add 10 columns to orders, seed 9 admin_settings keys |
| `supabase/config.toml` | Add 6 new function entries with `verify_jwt = false` |
| `supabase/functions/pathao-auth/index.ts` | New -- authenticate with Pathao |
| `supabase/functions/pathao-create-order/index.ts` | New -- create Pathao consignment |
| `supabase/functions/pathao-track-order/index.ts` | New -- track order status |
| `supabase/functions/pathao-get-cities/index.ts` | New -- fetch city list |
| `supabase/functions/pathao-get-zones/index.ts` | New -- fetch zones for city |
| `supabase/functions/pathao-get-areas/index.ts` | New -- fetch areas for zone |
| `src/components/admin/PathaoLocationModal.tsx` | New -- location picker modal |
| `src/pages/admin/AdminSettings.tsx` | Add Pathao credentials section |
| `src/pages/admin/AdminOrders.tsx` | Courier column, bulk send, auto-polling, new statuses |
| `src/pages/admin/AdminOrderDetail.tsx` | Pathao section, refresh status, shipping label, new statuses |
| `src/pages/admin/AdminDashboard.tsx` | Courier overview stats, new statuses |
