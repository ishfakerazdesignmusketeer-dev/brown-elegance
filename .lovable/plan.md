

# Route Pathao API Through n8n Webhooks

## Overview
Replace all direct Pathao API calls in `src/lib/pathaoApi.ts` with calls to your n8n webhook endpoints. The n8n instance acts as a proxy, handling the actual Pathao API communication. This also requires updating the wrapper functions to properly extract data from n8n responses so all 4 consumer files continue working without changes.

## Changes

### 1. Rewrite `src/lib/pathaoApi.ts`

Replace the entire file with the user-provided n8n-based implementation, plus:

- **Keep `PATHAO_STATUS_MAP`** -- it's imported by `AdminOrders.tsx` and `AdminOrderDetail.tsx` for status mapping. The user's code omits it but it must stay.
- **Keep `pathaoGetValidToken`** -- still needed by all consumers to manage token refresh via DB. Update it to call the n8n `pathao-auth` endpoint for refresh (via a new `pathaoRefreshToken` that also goes through n8n).
- **Adapt wrapper return values** -- The user's `pathaoGetCities/Zones/Areas/TrackOrder` wrappers return the raw n8n response object. Consumers expect extracted arrays (e.g., `[{city_id, city_name}]`). The wrappers need to return `data.data` or similar depending on what n8n returns. Since n8n proxies the Pathao response, the data field should contain the relevant array/object.

Final file structure:
```
const N8N_BASE = 'https://n8n.srv1202488.hstgr.cloud/webhook';
export const PATHAO_STATUS_MAP = { ... };  // kept as-is

pathaoGetToken()       -> POST /pathao-auth
pathaoRefreshToken()   -> POST /pathao-auth (with grant_type: refresh_token) 
pathaoGetValidToken()  -> reads DB, auto-refreshes via pathaoRefreshToken
pathaoQuery()          -> POST /pathao-query (generic helper)
pathaoGetCities()      -> pathaoQuery('get_cities'), returns data.data
pathaoGetZones()       -> pathaoQuery('get_zones'), returns data.data  
pathaoGetAreas()       -> pathaoQuery('get_areas'), returns data.data
pathaoCreateOrder()    -> POST /pathao-create-order, returns data.data
pathaoTrackOrder()     -> pathaoQuery('track_order'), returns data.data
```

### 2. No changes needed to consumer files

Since we preserve the same function signatures and return shapes:
- `AdminSettings.tsx` -- imports `pathaoGetToken`, `pathaoGetValidToken`, `pathaoGetCities` (unchanged)
- `AdminOrders.tsx` -- imports `pathaoGetValidToken`, `pathaoTrackOrder`, `pathaoCreateOrder`, `PATHAO_STATUS_MAP` (unchanged)
- `AdminOrderDetail.tsx` -- same imports as AdminOrders (unchanged)
- `PathaoLocationModal.tsx` -- imports `pathaoGetValidToken`, `pathaoGetCities/Zones/Areas`, `pathaoCreateOrder` (unchanged)

### 3. Return value handling

The n8n webhooks wrap Pathao responses. The wrapper functions will extract the nested data so consumers get the same shape they expect:
- `pathaoGetCities` returns array of `{city_id, city_name}`
- `pathaoGetZones` returns array of `{zone_id, zone_name}`
- `pathaoGetAreas` returns array of `{area_id, area_name}`
- `pathaoCreateOrder` returns `{consignment_id, order_status, ...}`
- `pathaoTrackOrder` returns `{order_status, ...}`

## Files Modified
| File | Action |
|------|--------|
| `src/lib/pathaoApi.ts` | Rewrite -- route all calls through n8n webhooks |

## Technical Notes
- The `pathaoGetValidToken` helper remains essential for automatic token refresh. It reads stored tokens from `admin_settings`, checks expiry, and refreshes via the n8n auth endpoint if needed.
- `pathaoRefreshToken` is updated to call the same n8n `/pathao-auth` endpoint but with `grant_type: 'refresh_token'` in the body.
- Error handling uses `data.success` check from n8n responses, falling back to `data.error` or `data.message` for error details.
