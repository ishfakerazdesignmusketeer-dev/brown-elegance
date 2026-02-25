

# End-to-End Test Fixes for Order Management + Dashboard

## Issues Found

### Issue 1: Dashboard Status Mismatch (CRITICAL)
The dashboard uses old statuses (`confirmed`, `shipped`, `delivered`) for revenue calculations, but the orders system uses `completed`. Revenue will show as 0 for completed orders because the filter checks for statuses that don't exist in the new flow.

**File**: `src/pages/admin/AdminDashboard.tsx`
- Line 129-131: `completedOrders` filters by `["confirmed", "processing", "shipped", "delivered"]` -- should include `"completed"`
- Line 134: `todayRevenue` same issue
- Line 137: `monthRevenue` same issue  
- Line 147: `revenueChartData` same issue
- Line 39: `STATUS_OPTIONS` uses old statuses -- should be `["pending", "processing", "completed", "cancelled", "refunded"]`
- Lines 21-37: `STATUS_COLORS_HEX` and `STATUS_COLORS` missing `completed` and `refunded`, have unused `confirmed`/`shipped`/`delivered`

### Issue 2: Query Key Mismatch (CRITICAL)
Dashboard fetches orders with queryKey `["admin-orders"]`. Orders page mutations invalidate `["admin-orders-list"]` and `["admin-order-counts"]` but never `["admin-orders"]`. So dashboard stats won't refresh after status changes or order creation from the orders page.

**Fix**: Update dashboard to use the same query keys, OR add invalidation of `["admin-orders"]` in orders page mutations. Best approach: align dashboard to also invalidate properly, and add cross-invalidation.

### Issue 3: CreateOrderPanel Missing Invalidations
After creating an order, `CreateOrderPanel` only invalidates `admin-orders-list` and `admin-order-counts`. It does NOT invalidate:
- `admin-orders` (dashboard)
- `admin-all-order-items` (dashboard top products)
- `admin-customer-count` (dashboard)
- `admin-low-stock` (dashboard low stock after stock deduction)

### Issue 4: Orders Page Mutations Missing Dashboard Invalidations
`statusMutation`, `bulkMutation`, and `deleteMutation` in `AdminOrders.tsx` don't invalidate dashboard query keys.

Same for `AdminOrderDetail.tsx` -- status and delete mutations don't invalidate dashboard keys.

## Changes

### 1. Fix `src/pages/admin/AdminDashboard.tsx`
- Update `STATUS_OPTIONS` to `["pending", "processing", "completed", "cancelled", "refunded"]`
- Update `STATUS_COLORS` and `STATUS_COLORS_HEX` to include `completed` (green) and `refunded` (purple), remove `confirmed`/`shipped`/`delivered`
- Change revenue filters from `["confirmed", "processing", "shipped", "delivered"]` to `["completed"]` (only completed orders count as revenue)
- This affects: `completedOrders`, `todayRevenue`, `monthRevenue`, `revenueChartData`

### 2. Fix `src/pages/admin/AdminOrders.tsx`
- Add invalidation of `["admin-orders"]`, `["admin-all-order-items"]`, `["admin-customer-count"]`, `["admin-low-stock"]` to `statusMutation`, `bulkMutation`, and `deleteMutation` onSuccess callbacks

### 3. Fix `src/pages/admin/AdminOrderDetail.tsx`
- Add invalidation of `["admin-orders"]`, `["admin-all-order-items"]`, `["admin-low-stock"]` to `statusMutation` and `deleteMutation` onSuccess callbacks

### 4. Fix `src/components/admin/CreateOrderPanel.tsx`
- Add invalidation of `["admin-orders"]`, `["admin-all-order-items"]`, `["admin-customer-count"]`, `["admin-low-stock"]` to `createMutation` onSuccess callback

## Summary of Files Changed
1. `src/pages/admin/AdminDashboard.tsx` -- Fix status alignment and revenue calculation
2. `src/pages/admin/AdminOrders.tsx` -- Add dashboard query invalidations
3. `src/pages/admin/AdminOrderDetail.tsx` -- Add dashboard query invalidations
4. `src/components/admin/CreateOrderPanel.tsx` -- Add dashboard query invalidations

## No Database Changes Required
- Stock deduction trigger (`decrement_stock_on_order`) exists and works
- Stock restoration trigger (`restore_stock_on_cancel`) exists and works on cancel
- Order number generation trigger exists
- Customer upsert trigger exists

