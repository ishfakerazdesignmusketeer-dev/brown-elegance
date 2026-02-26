

# Move Pathao API Calls from Edge Functions to Frontend

## Problem
Pathao edge functions fail with DNS errors because the backend environment blocks outbound network calls. The fix is to call the Pathao API directly from the browser, which has no such restriction.

## Approach

### 1. Create `src/lib/pathaoApi.ts`
A single utility file with all Pathao API functions that call `https://hermes-api.pathao.com/aladdin/api/v1` directly via browser `fetch()`:

- `pathaoGetToken(client_id, client_secret, username, password)` -- authenticates and returns tokens
- `pathaoRefreshToken(client_id, client_secret, refresh_token)` -- refreshes expired token
- `pathaoGetValidToken(supabase)` -- reads credentials/tokens from `admin_settings`, auto-refreshes if expiring within 1 hour, saves new tokens back to DB, returns a valid access token
- `pathaoGetCities(token)` -- fetches city list
- `pathaoGetZones(token, city_id)` -- fetches zones for a city
- `pathaoGetAreas(token, zone_id)` -- fetches areas for a zone
- `pathaoCreateOrder(token, orderData)` -- creates a Pathao consignment
- `pathaoTrackOrder(token, consignment_id)` -- gets order tracking status

All functions handle errors by throwing with the actual Pathao error message.

### 2. Update `src/pages/admin/AdminSettings.tsx`
Replace `supabase.functions.invoke("pathao-auth")` with:
- Read credential values from state
- Call `pathaoGetToken(client_id, client_secret, username, password)` directly
- Save returned tokens to `admin_settings` via supabase client
- Show actual Pathao error on failure

Replace `supabase.functions.invoke("pathao-get-cities")` test with:
- Call `pathaoGetValidToken(supabase)` then `pathaoGetCities(token)`

### 3. Update `src/components/admin/PathaoLocationModal.tsx`
Replace 3 edge function calls (cities, zones, areas) with:
- Call `pathaoGetValidToken(supabase)` to get token
- Call `pathaoGetCities`, `pathaoGetZones`, `pathaoGetAreas` directly
- On submit: instead of calling `pathao-create-order` edge function, build the order payload from the form data, call `pathaoCreateOrder(token, payload)`, then update the order in DB via supabase client

### 4. Update `src/pages/admin/AdminOrders.tsx`
Replace all `supabase.functions.invoke` calls:
- **Auto-poll**: Use `pathaoGetValidToken` + `pathaoTrackOrder` for each order, then update order status in DB directly
- **Send to Pathao**: Use `pathaoGetValidToken` + build payload from order data + `pathaoCreateOrder`, then update order in DB
- **Bulk send**: Same pattern for each eligible order

### 5. Update `src/pages/admin/AdminOrderDetail.tsx`
Replace 2 edge function calls:
- **handleSendToPathao**: Get token, build payload from order data, call `pathaoCreateOrder`, update order in DB, add order note
- **handleRefreshPathaoStatus**: Get token, call `pathaoTrackOrder`, map Pathao status to internal status, update order in DB

### 6. Delete Edge Functions
Remove these 6 files/directories:
- `supabase/functions/pathao-auth/index.ts`
- `supabase/functions/pathao-create-order/index.ts`
- `supabase/functions/pathao-track-order/index.ts`
- `supabase/functions/pathao-get-cities/index.ts`
- `supabase/functions/pathao-get-zones/index.ts`
- `supabase/functions/pathao-get-areas/index.ts`

## Key Detail: Order Creation Logic
The edge function `pathao-create-order` currently reads order data from DB, builds the payload, sends to Pathao, and updates the order. In the frontend version, the caller already has the order data, so:
1. Build the Pathao payload from the order object in memory
2. Call `pathaoCreateOrder(token, payload)`
3. Update `pathao_consignment_id`, `pathao_status`, `pathao_sent_at`, `status` in DB via supabase client
4. Insert order note via supabase client

Similarly for tracking: call `pathaoTrackOrder`, then update `pathao_status` and `status` columns directly.

## Status Mapping (kept from edge function logic)
```text
Pathao Status       -> Internal Status
Pending             -> sent_to_courier
Pickup_Requested    -> sent_to_courier
Picked              -> picked_up
In_Transit          -> in_transit
Delivered           -> completed
Returned            -> returned
Cancelled           -> cancelled
```

## Files Summary
| File | Action |
|------|--------|
| `src/lib/pathaoApi.ts` | Create -- all Pathao API functions |
| `src/pages/admin/AdminSettings.tsx` | Update -- use pathaoApi directly |
| `src/components/admin/PathaoLocationModal.tsx` | Update -- use pathaoApi directly |
| `src/pages/admin/AdminOrders.tsx` | Update -- use pathaoApi directly |
| `src/pages/admin/AdminOrderDetail.tsx` | Update -- use pathaoApi directly |
| `supabase/functions/pathao-*/index.ts` (6 files) | Delete |
