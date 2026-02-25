

# Add Products Column to Orders List Table

## Overview
Replace the existing "Items" column (which just shows "X items") with a "Products" column that displays product names, sizes, and quantities from each order's line items.

## Changes

### File: `src/pages/admin/AdminOrders.tsx`

**1. Table Header** (line 380)
- Replace `Items` header with `Products`
- Add `hidden md:table-cell` and `min-w-[200px]` classes for responsive behavior

**2. Table Body -- Products Cell** (lines 448-450)
- Replace the simple "X items" text with a detailed product list
- Show each item as: `Product Name -- Size x Qty`
- Size displayed in a small gray badge
- Quantity in accent color
- If more than 2 items, show first 2 then "+X more" in gray italic text

**3. Update colSpan** (lines 389, 393)
- Update `colSpan={8}` to `colSpan={9}` for loading/empty states since the old "Items" column is being replaced (column count stays at 8, so no change needed)

**Rendering logic per cell:**
```text
order.order_items.slice(0, 2).map(item =>
  <div>{item.product_name} -- <badge>{item.size}</badge> x{item.quantity}</div>
)
if order.order_items.length > 2:
  <div class="text-gray italic">+{remaining} more</div>
```

No query changes needed -- `order_items(*)` is already fetched and includes `product_name`, `size`, and `quantity`.

## Technical Notes
- The query already selects `order_items(*)` so all fields are available
- Column count remains 8 (replacing Items, not adding a new column)
- Mobile: column hidden below `md` breakpoint using Tailwind classes

