

# Fix 4 Issues on Live Website

## Fix 1 -- Favicon Not Showing

The favicon system is already mostly wired up. The `useDynamicFavicon` hook reads from `useBranding` which queries `admin_settings` for `favicon_url`, and `BrandingSection` already uses `upsert`. The issue is likely cache-busting and the hardcoded favicon in `index.html`.

### Changes:

**File: `index.html`**
- Change the hardcoded `<link rel="icon" href="/favicon.png" type="image/png">` to use a generic id for dynamic replacement:
  `<link rel="icon" id="dynamic-favicon" href="/favicon.png" type="image/png">`

**File: `src/hooks/use-dynamic-favicon.ts`**
- Add cache-busting query param to the favicon URL: `link.href = data.faviconUrl + '?t=' + Date.now()`
- Target the element by id `dynamic-favicon` first, falling back to `link[rel='icon']`

**File: `src/components/admin/BrandingSection.tsx`**
- After successful favicon upload, also invalidate the `branding` query key (already done) -- no changes needed here, the upsert logic is already correct

No other files touched.

## Fix 2 -- Category Images Not Showing

After investigation, the admin upload and storefront rendering code both look correct:
- `AdminCategories.tsx` uploads to `category-images` bucket and saves the full public URL to `categories.image_url`
- `CategoryCards.tsx` reads `image_url` and renders via `LazyImage`
- The database schema confirms `image_url` column exists

The code appears correct. However, the `LazyImage` component may have issues. Let me check it to confirm.

**Investigation needed:** Read `src/components/ui/lazy-image.tsx` to verify it handles external URLs correctly.

If the issue is that the `LazyImage` component doesn't render properly, I'll add an `onError` fallback. Otherwise, no code changes needed for this fix -- it's likely a data issue (empty URLs in the database) or an external image host being blocked.

## Fix 3 -- PDF Invoice (Admin + Download)

Create a shared PDF generation utility using `jsPDF` and `jspdf-autotable`.

### Changes:

**Install dependencies:** `jspdf` and `jspdf-autotable`

**New file: `src/lib/generateInvoicePDF.ts`**
- Export `generateInvoicePDF(order)` function
- Uses jsPDF to create a professional invoice with:
  - Brown House branding header
  - Order number, date, payment method
  - Customer billing details
  - Items table using autoTable
  - Subtotal, delivery, discount, total
  - Payment status, advance amount, amount to collect
  - Footer with thank you message
- Downloads as `BrownHouse-Invoice-{order_number}.pdf`

**File: `src/pages/admin/AdminOrderDetail.tsx`**
- Import `generateInvoicePDF` from `@/lib/generateInvoicePDF`
- Import `Download` icon from lucide-react
- Add a "Download Invoice" button in the Actions card, next to "Print Invoice":
  ```
  <Button variant="outline" size="sm" className="w-full justify-start gap-2" onClick={() => generateInvoicePDF(order)}>
    <Download className="w-3.5 h-3.5" /> Download Invoice
  </Button>
  ```

## Fix 4 -- Invoice on Order Confirmation

**File: `src/pages/OrderConfirmation.tsx`**
- Import `generateInvoicePDF` from `@/lib/generateInvoicePDF`
- Import `Download` icon from lucide-react
- Add a "Download Your Invoice" button between the order summary and "Continue Shopping" button
- Map the `OrderState` data to the format expected by `generateInvoicePDF` (the confirmation page has `items` with CartItem format, need to adapt field names)

---

## Files Summary

| File | Action |
|------|---------|
| `index.html` | Add id to favicon link tag |
| `src/hooks/use-dynamic-favicon.ts` | Add cache-busting, target by id |
| `src/components/ui/lazy-image.tsx` | Investigate, possibly add onError |
| `src/lib/generateInvoicePDF.ts` | **Create** -- shared PDF generator |
| `src/pages/admin/AdminOrderDetail.tsx` | Add Download Invoice button |
| `src/pages/OrderConfirmation.tsx` | Add Download Invoice button |

**Dependencies to install:** `jspdf`, `jspdf-autotable`

