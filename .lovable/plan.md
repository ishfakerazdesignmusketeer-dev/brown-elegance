

# Rebuild Admin Orders -- WooCommerce Style

## Overview
Complete rebuild of the `/admin/orders` page into a WooCommerce-inspired order management system with a list view, detail view, order notes, pagination, date filtering, and bulk actions.

## Database Changes

### New Table: `order_notes`
Stores admin notes and status change history per order.

```text
order_notes
  id          uuid (PK)
  order_id    uuid (FK -> orders.id ON DELETE CASCADE)
  note        text (NOT NULL)
  created_at  timestamptz (default now())
  created_by  text (default 'admin')
```
RLS: anon and authenticated full access (matches existing pattern).

### New Column on `orders`
- `source` text DEFAULT 'Website' -- tracks where the order came from (Website, Messenger, Instagram, Phone, Walk-in)

`payment_method` and `payment_status` already exist on the orders table, so no changes needed for those.

## File Structure

### Files to Create
1. **`src/pages/admin/AdminOrders.tsx`** -- Complete rewrite (list view)
2. **`src/pages/admin/AdminOrderDetail.tsx`** -- New detail page (two-column layout)

### Files to Edit
3. **`src/App.tsx`** -- Add route for `/admin/orders/:id`
4. **`src/components/admin/InvoicePrint.tsx`** -- Minor: accept `source` prop

## Detailed Component Design

### 1. Orders List Page (`AdminOrders.tsx`)

**Header**: "Orders" title (no Add Order button for now -- orders come from the storefront)

**Status Filter Tabs**: Horizontal tabs with live counts from the database
- All | Pending | Processing | Completed | Cancelled | Refunded
- Each tab shows `(count)` fetched via a single query grouping by status
- Active tab has bottom border highlight

**Toolbar Row**:
- Select-all checkbox
- Bulk action dropdown (Change to Processing / Completed / Cancelled / Delete) + Apply button
- Date filter dropdown: All dates / This month / Last month / Custom range (date pickers)
- Search input: searches order_number, customer_name, customer_phone via `.or()` + `.ilike()`
- Results count text: "X items -- Page X of Y"

**Table Columns**: Checkbox | Order | Date | Status | Items | Total | Source | Actions

- **Order**: `#BRN-XXXXX Customer Name` as blue clickable link to detail page
- **Date**: Relative time ("2 hours ago") with full date in tooltip
- **Status**: Colored badge pill. Clicking opens inline dropdown to change status directly
  - Pending = yellow, Processing = blue, Completed = green, Cancelled = red, Refunded = purple
- **Items**: "X items" count
- **Total**: Formatted price
- **Source**: Small colored tag (Website/Messenger/Instagram/Phone/Walk-in)
- **Actions**: Eye (view detail), Printer (print invoice), Trash (delete with confirm)

**Pagination**: 20 per page using `.range(from, to)` with `{ count: 'exact' }`. Navigation shows page input and prev/next buttons.

### 2. Order Detail Page (`AdminOrderDetail.tsx`)

Route: `/admin/orders/:id`

**Layout**: Two columns (left ~65%, right ~35%)

**Left Column**:

*Order Items Table*:
- Columns: Product | Size | Qty | Price | Total
- Summary at bottom: Subtotal, Delivery, Discount (with coupon code), bold Total

*Order Notes Timeline*:
- Fetched from `order_notes` table, sorted newest first
- Each note shows timestamp + text + "by admin"
- Add note textarea + "Add Note" button at bottom
- When status changes, an automatic note is added: "Status changed to [status]"

**Right Column** (stacked cards):

*Order Status Card*: Dropdown to change status + "Update" button

*Order Actions Card*: Print Invoice button, WhatsApp button (existing logic), Delete Order (with alert dialog confirm)

*Customer Details Card*: Name, phone, address, city (read-only display)

*Payment Card*: Payment method display, payment status badge

*Order Meta Card*: Order number, source tag, full created date

*Courier Section*: Reuse existing `CourierSection` component (moved to its own file or kept inline)

### 3. Route Addition (`App.tsx`)
Add: `<Route path="orders/:id" element={<AdminOrderDetail />} />`

## Technical Details

**Status counts query** (single query for all tabs):
```text
For each status, run a head-only count query.
Cache with queryKey ["admin-order-counts"].
```

**Pagination query pattern**:
```text
PAGE_SIZE = 20
from = (page - 1) * PAGE_SIZE
to = from + PAGE_SIZE - 1

supabase.from('orders')
  .select('*, order_items(*)', { count: 'exact' })
  .order('created_at', { ascending: false })
  .range(from, to)
  // + status filter, search filter, date filter as needed
```

**Date filter logic**:
- This month: `.gte('created_at', startOfMonth(new Date()))`
- Last month: `.gte('created_at', startOfMonth(subMonths(new Date(), 1))).lt('created_at', startOfMonth(new Date()))`
- Custom: date picker popover with from/to dates

**Delete order**: Soft approach -- just uses `supabase.from('orders').delete().eq('id', id)` with an AlertDialog confirmation. The `order_notes` table has `ON DELETE CASCADE` so notes clean up automatically.

**Auto-note on status change**: When the status update mutation succeeds, insert a row into `order_notes` with text like "Status changed to Processing".

## Design
- Clean white background, consistent with existing admin panel styling
- Table has subtle hover highlight (`hover:bg-gray-50`)
- Status badges use colored pills matching the spec colors
- Mobile: table scrolls horizontally, detail page stacks to single column
- All existing admin sidebar and layout remain untouched

