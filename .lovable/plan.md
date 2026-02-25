

# Rebuild Admin Products Page + Pre-Order + Storefront Updates

## Overview
This is a large feature that touches the database schema, the admin products page, the product panel, the stock overview, the dashboard, and multiple storefront pages. It adds offer pricing, pre-order support, SKU/weight/SEO fields, size-level availability toggles, and storefront restrictions for out-of-stock/pre-order products.

---

## Phase 1: Database Migration

Add new columns to `products` and `product_variants` tables, plus a unique constraint for upsert support.

```sql
ALTER TABLE products
  ADD COLUMN IF NOT EXISTS offer_price integer,
  ADD COLUMN IF NOT EXISTS sku text,
  ADD COLUMN IF NOT EXISTS weight integer,
  ADD COLUMN IF NOT EXISTS meta_title text,
  ADD COLUMN IF NOT EXISTS meta_description text,
  ADD COLUMN IF NOT EXISTS is_featured boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_preorder boolean DEFAULT false;

ALTER TABLE product_variants
  ADD COLUMN IF NOT EXISTS is_available boolean DEFAULT true;

ALTER TABLE product_variants
  DROP CONSTRAINT IF EXISTS product_variants_product_id_size_key;

ALTER TABLE product_variants
  ADD CONSTRAINT product_variants_product_id_size_key
  UNIQUE (product_id, size);
```

---

## Phase 2: Admin Products Page -- Table Layout

**File: `src/pages/admin/AdminProducts.tsx`** (full rewrite)

Replace the card grid with a professional table layout:

- **Header**: "Product Management" title + red "+ New Product" button
- **Search bar**: Full-width below header, filters by name or SKU in real-time
- **Table columns**: Product (thumbnail + name) | Category | Price (offer + regular) | Stock (total + size warnings) | Pre-Order toggle | Featured toggle | Active toggle | Actions (edit/delete)
- **Table styling**: White bg, alternating `#F9F9F9` rows, bottom borders, hover highlight, sticky header, horizontal scroll on mobile
- **Inline toggle mutations**: `is_preorder`, `is_featured`, `is_active` -- each updates Supabase instantly with toast feedback
- **Stock warnings per size**: red text for stock=0 ("XL: Out of stock"), amber for 1-5 ("XL: 1 left"), no warning for >5
- **Product interface** updated to include new fields: `offer_price`, `sku`, `weight`, `is_featured`, `is_preorder`, `meta_title`, `meta_description`
- **Variant interface** updated to include `is_available`

---

## Phase 3: Product Panel Rebuild

**File: `src/components/admin/ProductPanel.tsx`** (full rewrite)

Reorganized into collapsible sections:

1. **Basic Info**: Name, Slug (auto-generated), Category dropdown, Description
2. **Pricing**: Regular Price + Offer Price side by side
3. **Images**: Up to 5 URL inputs with thumbnail previews, upload button, first = main
4. **Sizes and Stock**: Table with Size | Stock Input (with color-coded indicator) | Enable toggle (`is_available`). Sizes: S, M, L, XL, XXL. Color feedback: green >5, amber 1-5, red 0
5. **Pre-Order**: Toggle with description text ("Customers see 7-day delivery notice")
6. **Additional Details**: SKU (with auto-generate button: initials + random number), Weight (grams), Is Featured toggle, Is Active toggle
7. **Meta / SEO** (collapsible): Meta Title (defaults to product name), Meta Description (textarea, 160 char counter)

**Save logic**:
- New: INSERT product, then INSERT variants per enabled size
- Edit: UPDATE product (not upsert), then UPSERT variants using `ON CONFLICT (product_id, size)`
- Invalidate: `admin-products`, `admin-stock-overview`, `admin-low-stock`, `products`, `product-detail`

---

## Phase 4: Stock Overview Update

**File: `src/components/admin/StockOverview.tsx`** (edit)

- Add XXL to SIZES array
- Color-code each cell: green text/white bg for >5, amber text/`#FEF3C7` bg for 1-5, red text/`#FEE2E2` bg + strikethrough for 0
- Add legend below table: green "In Stock", yellow "Low Stock (<=5)", red "Out of Stock"

---

## Phase 5: Dashboard Updates

**File: `src/pages/admin/AdminDashboard.tsx`** (edit)

- Split the existing `lowStockCount` into two separate stat cards:
  - "Low Stock Sizes": `WHERE stock <= 5 AND stock > 0`
  - "Out of Stock Sizes": `WHERE stock = 0`
- Both cards link to `/admin/products`

---

## Phase 6: Storefront -- Product Detail Page

**File: `src/pages/ProductDetail.tsx`** (edit)

- Update query to fetch `offer_price`, `is_preorder`, and `is_available` from variants
- **Price display**: If `offer_price` exists, show offer price bold + regular price strikethrough
- **Size selector**: Disable sizes where `stock = 0 OR is_available = false` (strikethrough, gray, cursor-not-allowed). Low stock (1-5): small amber dot on button corner + tooltip "Only X left!"
- **Add to Cart protection**: Validate stock before adding, show error toasts for out-of-stock or insufficient quantity
- **Pre-order mode** (when `is_preorder = true`):
  - Replace "Add to Cart" button text with "Pre-Order Now" (amber/gold background)
  - Show notice box below button: clock icon + "Order in your door step by 7 days" (amber border)
  - Out-of-stock sizes still disabled
- **Sold Out badge**: When ALL sizes are out of stock and NOT pre-order, show "Sold Out" badge instead of "Pre-Order"

---

## Phase 7: Storefront -- Product Cards (Home + Collections)

**Files: `src/components/home/ProductGrid.tsx` and `src/pages/Collections.tsx`** (edit both)

- Update queries to also fetch `offer_price`, `is_preorder`, and `product_variants(stock)`
- **Badge priority** (only one shown): Pre-Order (amber, top-left) > Sold Out (red, top-left) > SALE (red, top-right)
  - "Sold Out": all variant stocks = 0, card has `opacity-75`, add-to-cart button disabled
  - "Pre-Order": `is_preorder = true`, card NOT grayed out
  - "SALE": `offer_price` exists and is less than `price`
- **Price display**: If `offer_price`, show offer price bold + regular price strikethrough gray

---

## Phase 8: Storefront -- Add to Cart Modal

**File: `src/components/cart/AddToCartModal.tsx`** (edit)

- Update variant query to include `is_available`
- Disable sizes where `stock = 0 OR is_available = false`
- Add stock validation before adding to cart (toast errors)
- If product is pre-order, change button text to "Pre-Order Now"

---

## Summary of All Files

| File | Action |
|------|--------|
| Database migration | New columns + constraint |
| `src/pages/admin/AdminProducts.tsx` | Full rewrite -- table layout |
| `src/components/admin/ProductPanel.tsx` | Full rewrite -- new sections |
| `src/components/admin/StockOverview.tsx` | Edit -- colors + XXL + legend |
| `src/pages/admin/AdminDashboard.tsx` | Edit -- split low stock stats |
| `src/pages/ProductDetail.tsx` | Edit -- pre-order, sale, stock restrictions |
| `src/components/home/ProductGrid.tsx` | Edit -- badges, sale pricing |
| `src/pages/Collections.tsx` | Edit -- badges, sale pricing |
| `src/components/cart/AddToCartModal.tsx` | Edit -- stock validation, pre-order |

