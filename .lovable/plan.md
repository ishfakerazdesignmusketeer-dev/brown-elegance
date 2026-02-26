

# Fix Pathao Authentication Flow

## Problem
The "Connect to Pathao" button shows a generic "Connection failed" error without revealing what Pathao actually returns, making debugging impossible. Additionally, the API URL may be incorrect, there's no timeout handling, and error details are swallowed.

## Changes

### 1. Edge Function: `supabase/functions/pathao-auth/index.ts`

**URL Fix:** Change `https://api-hermes.pathao.com` to `https://hermes-api.pathao.com` as specified.

**Add timeout:** Wrap the fetch in an AbortController with a 10-second timeout to prevent hanging.

**Add logging:** Log the outgoing request URL/body and the raw response text to backend function logs for debugging.

**Return actual errors:** Instead of a generic "Authentication failed", return Pathao's raw response text so the frontend can display the real error.

**Parse safely:** Read response as `.text()` first, log it, then parse as JSON. This prevents crashes if Pathao returns non-JSON (e.g., HTML error pages).

```text
Key changes:
- const tokenUrl = "https://hermes-api.pathao.com/aladdin/api/v1/issue-token"
- AbortController with 10s timeout
- console.log() for request and raw response
- response.text() -> JSON.parse() instead of response.json()
- Return rawText in error responses
```

### 2. Frontend: `src/pages/admin/AdminSettings.tsx` (handlePathaoConnect)

**Show actual error details:** When `supabase.functions.invoke` returns an error, extract and display the real message from `data.error` or `data.details` instead of just "Connection failed".

**Handle invoke errors properly:** `supabase.functions.invoke` may return the error in `data` (for non-2xx responses) rather than in the `error` parameter. Update the handler to check both and surface Pathao's actual message.

```text
Key changes in handlePathaoConnect:
- Parse data.error and data.details for real error messages
- Show detailed toast: "Pathao error: {actual message}"
- Handle case where invoke itself throws (network error)
```

### 3. Update remaining edge functions with same URL fix

Update all 5 other pathao functions (`pathao-create-order`, `pathao-track-order`, `pathao-get-cities`, `pathao-get-zones`, `pathao-get-areas`) to use `https://hermes-api.pathao.com` instead of `https://api-hermes.pathao.com`.

## Files Modified
| File | Change |
|------|--------|
| `supabase/functions/pathao-auth/index.ts` | URL fix, timeout, logging, raw error return |
| `src/pages/admin/AdminSettings.tsx` | Show actual Pathao error in toast |
| `supabase/functions/pathao-create-order/index.ts` | URL fix |
| `supabase/functions/pathao-track-order/index.ts` | URL fix |
| `supabase/functions/pathao-get-cities/index.ts` | URL fix |
| `supabase/functions/pathao-get-zones/index.ts` | URL fix |
| `supabase/functions/pathao-get-areas/index.ts` | URL fix |

