
# Show Stock Count Per Size + Per-Size Low Stock Alerts

## Overview
Display the actual stock count beneath each size button on the product detail page and the add-to-cart modal. Show a red "Low stock" warning on individual sizes that have 5 or fewer units -- not a blanket warning for the whole product.

## Changes

### 1. `src/pages/ProductDetail.tsx` -- Frontend size buttons with stock count

**Current behavior:** Size buttons show only the size label (S, M, L...). A single "Only N left" message appears only after selecting a low-stock size.

**New behavior:**
- Each size button displays the stock count below the size label (e.g., "M" on top, "8 left" below)
- Sizes with stock 1-5 show a small red "Low stock" text below the button instead of the count
- Out-of-stock sizes stay as-is (line-through, disabled, opacity-40) with no count
- Remove the old single "Only N left" message from the header row since each size now self-reports

**Button markup change:**
```
<button ...>
  <span>{variant.size}</span>
  {variant.stock > 5 && <span className="text-[9px] text-muted-foreground">{variant.stock} left</span>}
  {variant.stock > 0 && variant.stock <= 5 && <span className="text-[9px] text-destructive font-semibold">Low stock</span>}
</button>
```
- Button height increased slightly (h-12 to h-14) to fit the second line
- Flex column layout inside button

### 2. `src/components/cart/AddToCartModal.tsx` -- Same treatment in quick-add modal

Apply the same per-size stock count and "Low stock" alert to the bottom-sheet modal's size buttons. Remove the existing "Only N left" paragraph that shows after selection.

### 3. `src/components/admin/StockOverview.tsx` -- Per-size low stock warning in admin

**Current behavior:** Stock cells are color-coded (red for 0, amber for 1-5, green for 6+) but no explicit text warning.

**New behavior:** No changes needed here -- the color coding already serves as the per-size alert. The amber/red background on individual cells already highlights which specific sizes are low. This matches the user's request: "Low stock should be an alert on each size."

## Technical Details

- No database changes needed -- stock data is already fetched per variant
- No new queries -- existing `product_variants` data has `stock` field
- The threshold for "Low stock" is stock <= 5 (matching existing convention)
- Stock of 0 shows the button as disabled/struck-through with no additional label
