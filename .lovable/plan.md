
# Major Admin Panel Overhaul

This is a large multi-part implementation covering inventory logic, new pages, payment enhancements, analytics, and admin polish. Due to the scope, this will be implemented in phases.

---

## Phase 1: Database Schema Changes

Create a single migration with all needed schema updates:

**Orders table additions:**
- `stock_deducted` (boolean, default false) -- tracks whether stock was deducted
- `payment_type` (text, default 'cod') -- 'full', 'advance_cod', 'cod'  
- `advance_amount` (integer, default 0)
- `amount_to_collect` (integer, default 0)

Note: `delivery_zone`, `delivery_charge`, and `payment_status` already exist.

**New table: `stock_history`**
- id, product_id (FK products), variant_id (uuid), product_name, size, change_amount (integer), reason (text), order_id (FK orders, nullable), created_at
- RLS: authenticated users get full access, anon gets SELECT
- Enable realtime

**Replace existing stock triggers:**
- Drop `decrement_stock_on_order` trigger (currently fires on order_items INSERT)
- Drop `restore_stock_on_cancel` trigger (currently fires on orders UPDATE)
- Create new `handle_stock_on_status_change` trigger on orders UPDATE that:
  - When status changes TO 'confirmed' AND stock_deducted = false: deduct stock from variants, log to stock_history, set stock_deducted = true
  - When status changes TO 'cancelled' AND stock_deducted = true: restore stock, log to stock_history, set stock_deducted = false

---

## Phase 2: Stock Deduction Logic (Part 1)

**Status change handlers** in `AdminOrders.tsx`, `OrderDetailModal.tsx`, `AdminDashboard.tsx`:
- After any status mutation succeeds, invalidate product variant queries so storefront updates
- Add `queryClient.invalidateQueries({ queryKey: ["product"] })` to all status mutation onSuccess callbacks

**Storefront sync** in `ProductDetail.tsx`:
- Size buttons already show "Out of Stock" when stock = 0
- Add "Only X left" amber warning when stock is 1-5 for the selected size
- Already implemented partially; enhance with amber text below size buttons

---

## Phase 3: Delivery Zone Pricing (Part 3)

**Checkout (`Checkout.tsx`):**
- Already has delivery zone selector with dynamic prices from admin_settings
- Update delivery prices from current defaults (100/130) to match requested (60/120)
- This is controlled via admin_settings keys `delivery_inside_dhaka` and `delivery_outside_dhaka` -- update values in database

**Create Order Panel (`CreateOrderPanel.tsx`):**
- Replace the manual delivery charge input with a delivery zone pill selector
- Add "Inside Dhaka -- 60" and "Outside Dhaka -- 120" pill buttons
- Fetch delivery prices from admin_settings (same as checkout)
- Auto-set delivery charge based on selection
- Save `delivery_zone` to order on creation
- Update totals section to show zone label

---

## Phase 4: Advanced Payment for Manual Orders (Part 4)

**Create Order Panel (`CreateOrderPanel.tsx`):**
- Add "In-Store" to payment methods
- Add payment type selector: Full Payment | Advance + COD | Full COD
- When "Advance + COD" selected: show advance amount input, auto-calculate amount_to_collect
- Auto-set payment_status based on selection (paid/partial/unpaid)
- Save payment_type, advance_amount, amount_to_collect to order

**Order Detail Modal (`OrderDetailModal.tsx`):**
- Add Payment Breakdown section showing: Order Total, Advance Paid, To Collect, Method, Status
- Add "Mark as Fully Paid" button when status is partial/unpaid
- Add "partial" to payment status colors (amber)

**Orders List (`AdminOrders.tsx`):**
- Add payment status column with colored badges
- "Paid" green, "Partial X due" amber, "Unpaid X due" red

---

## Phase 5: Inventory Page (Part 2)

**New file: `src/pages/admin/AdminInventory.tsx`**

Full inventory management page with:
- 4 summary cards: Total SKUs, Low Stock (amber), Out of Stock (red), Healthy (green)
- Filter bar: search, stock status filter, category filter, sort options
- Table: Product Image, Name, Category, Size, SKU, Stock, Status badge, Add Stock action
- Inline stock adjustment: click "+ Add Stock" to show input, confirm to update variant stock and log to stock_history
- Bulk select + bulk stock adjustment
- Collapsible "Recent Stock Changes" section showing last 50 entries from stock_history

**Sidebar (`AdminLayout.tsx`):**
- Add Inventory item with Package icon between Products and Categories
- Reorder nav items per spec

**Router (`App.tsx`):**
- Add route: `inventory` -> `AdminInventory`

---

## Phase 6: Dashboard Improvements (Part 6)

**`AdminDashboard.tsx` enhancements:**

- **Row 1** (4 cards): Total Revenue, Today's Revenue, This Month, Avg Order Value -- already exists
- **Row 2** (5 cards): Total Orders, Pending, Confirmed, Completed, Customers -- partially exists, add Confirmed and Completed counts
- **Row 3** (3 cards): Low Stock (amber), Out of Stock (red), Abandoned Carts with value -- add abandoned carts card
- **Revenue chart**: Make full width instead of 2/3
- **New chart**: Orders by Source bar chart (Messenger, Instagram, Phone, Walk-in, Website)
- **Order Status donut**: Keep but make smaller, place beside source chart
- **New chart**: Payment Status horizontal bar (Paid %, Partial %, Unpaid %)
- **Recent Orders**: Add payment status badge column

---

## Phase 7: Abandoned Cart Analytics (Part 5)

**`AdminAbandonedCarts.tsx` enhancements:**

- Update top metrics: Total Abandoned Carts, Abandoned Revenue (sum of subtotals), Recovery Rate %, Avg Cart Value
- Add recovery line chart (last 30 days): abandoned per day vs recovered per day
- Add "Expired" status for carts older than 48 hours without conversion
- Update WhatsApp template to Bangla version provided
- Add "Copy Message" button alongside existing "Open WhatsApp"

---

## Phase 8: Admin Polish (Part 7)

**Sidebar (`AdminLayout.tsx`):**
- Active item: `#2C1810` background, white text (currently `bg-gray-900`)
- Hover: `#F5F0EB` background
- Group nav items with subtle dividers between groups
- Ensure abandoned carts badge shows count

**Consistent styling across all admin pages:**
- Badge colors: pending amber, confirmed blue/cyan, completed green, cancelled red, refunded purple -- already mostly consistent
- Ensure status dropdowns in order list trigger stock deduction via the database trigger (already handled by trigger)

---

## Files to Create
| File | Purpose |
|------|---------|
| `src/pages/admin/AdminInventory.tsx` | Inventory management page |

## Files to Modify
| File | Changes |
|------|---------|
| `src/App.tsx` | Add inventory route |
| `src/components/admin/AdminLayout.tsx` | New sidebar items, grouping, brand colors |
| `src/components/admin/CreateOrderPanel.tsx` | Delivery zone selector, advanced payment |
| `src/components/admin/OrderDetailModal.tsx` | Payment breakdown, mark as paid |
| `src/pages/admin/AdminOrders.tsx` | Payment status column, invalidate product queries on status change |
| `src/pages/admin/AdminDashboard.tsx` | New charts, improved layout, payment status |
| `src/pages/admin/AdminAbandonedCarts.tsx` | Analytics, Bangla template, charts |
| `src/pages/ProductDetail.tsx` | "Only X left" warning for low stock |

## Database Migration
One migration covering: stock_deducted column, payment columns, stock_history table, replacement triggers, RLS policies.
