

# Fix: Admin Manual Order Uses Regular Price Instead of Offer Price

## Root Cause

In `src/components/admin/CreateOrderPanel.tsx`:

1. The `Product` interface (line 31-37) doesn't include `offer_price`
2. When adding an item (line 136), it always uses `selectedProduct.price` — never checks for `offer_price`
3. The product search dropdown (line 367) and selection display (line 375) also show only the regular price

## Fix — Single File Change

**File**: `src/components/admin/CreateOrderPanel.tsx`

1. Add `offer_price: number | null` to the `Product` interface
2. In `addItem()` (line 136), change `unitPrice` to use `selectedProduct.offer_price ?? selectedProduct.price`
3. In the product search list (line 367), show offer price when available
4. In the selected product display (line 375), show offer price when available

No other files or database changes needed.

