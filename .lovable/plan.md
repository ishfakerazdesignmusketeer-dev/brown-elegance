

# Add "Experience Studio Exclusive" Feature

## Overview
Add a new product flag `is_studio_exclusive` that marks products as view-only on the storefront -- no online ordering allowed. These products display a premium studio announcement block with address/hours info pulled from admin settings.

---

## Phase 1: Database Migration

**Add column + seed settings rows:**

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS is_studio_exclusive boolean DEFAULT false;

INSERT INTO admin_settings (key, value) VALUES
  ('studio_name', ''),
  ('studio_address', ''),
  ('studio_city', ''),
  ('studio_map_url', ''),
  ('studio_hours', '')
ON CONFLICT (key) DO NOTHING;
```

---

## Phase 2: Admin Product Panel (`src/components/admin/ProductPanel.tsx`)

- Add `isStudioExclusive` state (initialized from `product.is_studio_exclusive`)
- Add toggle section below Pre-Order with building icon, description text, and amber warning box
- Include `is_studio_exclusive` in the product save payload
- Reset state on new product

---

## Phase 3: Admin Products Table (`src/pages/admin/AdminProducts.tsx`)

- Add `is_studio_exclusive` to the `Product` interface
- Add "Studio" column between Pre-Order and Featured (deep purple/indigo toggle color: `data-[state=checked]:bg-indigo-600`)
- Add `is_studio_exclusive` toggle label to the mutation labels map
- Update `colSpan` from 8 to 9 for loading/empty states
- Column count: Product | Category | Price | Stock | Pre-Order | Studio | Featured | Active | Actions

---

## Phase 4: Admin Settings (`src/pages/admin/AdminSettings.tsx`)

- Add a new "Experience Studio Information" section (separate card above or below existing settings card)
- Fields: Studio Name, Studio Address, City, Google Maps URL, Opening Hours
- Add these keys to `SETTING_META` with labels and placeholders
- Add a separate `orderedKeys` group for studio settings rendered in their own section
- Uses the same save mechanism (updates admin_settings rows)

---

## Phase 5: Storefront -- Product Cards (`src/components/home/ProductGrid.tsx` + `src/pages/Collections.tsx`)

Both files get the same changes:
- Add `is_studio_exclusive` to the Product interface and query select
- Update `getBadge` priority: Studio Exclusive (purple, top-left) > Pre-Order > Sold Out > SALE
- When studio exclusive: card NOT grayed out, button text changes to "View at Studio" (purple styling), button click navigates to product detail instead of adding to cart

---

## Phase 6: Storefront -- Product Detail (`src/pages/ProductDetail.tsx`)

- Add `is_studio_exclusive` to Product interface and query select
- Fetch studio settings from `admin_settings` (studio_name, studio_address, studio_city, studio_hours, studio_map_url) using a `useQuery`
- When `is_studio_exclusive = true`:
  - Hide size selector, quantity selector, and add-to-cart/pre-order button
  - Show the studio exclusive announcement block with:
    - Deep purple left border (4px), light purple bg (`#F5F3FF`)
    - "EXPERIENCE STUDIO EXCLUSIVE" uppercase heading
    - Description text about visiting the studio
    - Divider, then address/hours (hidden if empty)
    - "View on Google Maps" button (disabled with tooltip if URL not set)
  - Badge at top: purple "Studio Exclusive" instead of Pre-Order/Sold Out

---

## Phase 7: Storefront -- Add to Cart Modal (`src/components/cart/AddToCartModal.tsx`)

- Add `is_studio_exclusive` to the product interface/query
- If product is studio exclusive, show a message instead of size/qty selectors and disable the add button

---

## Phase 8: Checkout Protection (`src/pages/Checkout.tsx`)

- Before placing order, check each cart item against products table for `is_studio_exclusive`
- If any item is studio exclusive, show error toast and block submission
- This is a safety net for edge cases (old cart data, direct API calls)

---

## Files Changed Summary

| File | Change |
|------|--------|
| Database migration | Add column + seed settings |
| `src/components/admin/ProductPanel.tsx` | Add studio exclusive toggle section |
| `src/pages/admin/AdminProducts.tsx` | Add Studio column with purple toggle |
| `src/pages/admin/AdminSettings.tsx` | Add Studio Information settings section |
| `src/components/home/ProductGrid.tsx` | Add studio badge + button change |
| `src/pages/Collections.tsx` | Add studio badge + button change |
| `src/pages/ProductDetail.tsx` | Studio announcement block, hide purchase UI |
| `src/components/cart/AddToCartModal.tsx` | Block studio exclusive products |
| `src/pages/Checkout.tsx` | Cart protection check |

