

# Unify Invoice PDF Generation

## Changes (3 files only)

### 1. `src/lib/generateInvoicePDF.ts` — Full rewrite
Replace the entire function with the user's provided version featuring:
- Safe field extraction with multiple fallback field names
- Styled header with dark background bar and gold accents
- Delivery zone display
- Advance/amount-to-collect support
- Dark footer bar
- Uses `BDT` formatting with `toLocaleString()` instead of `formatPrice`

### 2. `src/pages/OrderConfirmation.tsx` — Update download button
- The existing `onClick` already constructs an order object and calls `generateInvoicePDF` — this works fine with the new robust function since it handles `order_items` with `product_name`/`unit_price`/`size`/`quantity` fields.
- Update the button `className` to the user's specified styling: white background, `border-[#2C1810]`, rounded-lg, hover fill effect.
- Remove the `variant="outline"` prop since we're using custom classes.

### 3. No admin changes needed
The admin already imports and calls `generateInvoicePDF` from the same path — verified it uses the shared function. The new function's fallback field handling ensures compatibility with both order object shapes.

