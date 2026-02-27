

# Fix Admin Reload Redirect + Add Refresh Buttons

## Problem 1: Admin page reload redirects to storefront

The `AuthContext` has a race condition. `checkAdmin()` is async but is called without `await`. The `setIsLoading(false)` runs immediately after calling `checkAdmin`, before the admin role check completes. So on reload, `AdminRoute` sees `isLoading=false` and `isAdmin=false`, redirecting to `/`.

**Fix in `src/contexts/AuthContext.tsx`:**
- In the `onAuthStateChange` callback: await `checkAdmin` before setting `isLoading(false)`
- In the `getSession().then()` block: await `checkAdmin` before setting `isLoading(false)`
- Move `setIsLoading(false)` inside `checkAdmin` completion, or restructure so loading stays true until admin check finishes

```text
Before:
  checkAdmin(session.user.id);   // fire-and-forget
  setIsLoading(false);           // runs immediately

After:
  await checkAdmin(session.user.id);  // wait for result
  setIsLoading(false);                // now safe
```

## Problem 2: Add refresh buttons to 4 admin pages

Add a "Refresh" button (using `RefreshCw` icon from lucide-react) to the page header area of each page. On click, it invalidates all relevant queries for that page.

### Files to modify:

**`src/pages/admin/AdminOrders.tsx`**
- Add `RefreshCw` to imports
- Add refresh button next to existing header actions (beside the "Create Order" button)
- On click: `queryClient.invalidateQueries({ queryKey: ["admin-orders"] })`
- Show spinning animation while refetching

**`src/pages/admin/AdminInventory.tsx`**
- Add `RefreshCw` to imports
- Add refresh button in the page header area
- On click: invalidate `["admin-inventory"]` and `["admin-stock-history"]` queries
- Show spinning animation while refetching

**`src/pages/admin/AdminProducts.tsx`**
- Add `RefreshCw` to imports
- Add refresh button next to "Add Product" button
- On click: invalidate `["admin-products"]` query
- Show spinning animation while refetching

**`src/pages/admin/AdminDashboard.tsx`**
- Add `RefreshCw` to imports
- Add refresh button in the dashboard header
- On click: invalidate all dashboard queries (orders, order-items, customer-count, stock, abandoned carts)
- Show spinning animation while refetching

### Refresh button style:
- Small ghost/outline button with `RefreshCw` icon
- `animate-spin` class applied while queries are refetching
- Tooltip: "Refresh data"

## Files Changed
| File | Change |
|------|--------|
| `src/contexts/AuthContext.tsx` | Fix race condition -- await checkAdmin before clearing isLoading |
| `src/pages/admin/AdminOrders.tsx` | Add refresh button |
| `src/pages/admin/AdminInventory.tsx` | Add refresh button |
| `src/pages/admin/AdminProducts.tsx` | Add refresh button |
| `src/pages/admin/AdminDashboard.tsx` | Add refresh button |

