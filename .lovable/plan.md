
# Multi-Feature Update: Product Detail, Checkout, and Coming Soon

## Overview
This plan covers 5 interconnected features: shipping time display, size chart typography, inside/outside Dhaka delivery pricing, return policy, and a "Coming Soon" product type.

---

## Phase 1: Database Migration

Add new columns and settings rows in a single migration:

```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS is_coming_soon boolean DEFAULT false;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS delivery_zone text DEFAULT 'inside_dhaka';

INSERT INTO admin_settings (key, value) VALUES
  ('return_policy_content', ''),
  ('instagram_url', ''),
  ('delivery_inside_dhaka', '100'),
  ('delivery_outside_dhaka', '130')
ON CONFLICT (key) DO NOTHING;
```

Update `src/integrations/supabase/types.ts` will auto-regenerate after migration.

---

## Phase 2: Shipping Time Display (Product Detail)

**File:** `src/pages/ProductDetail.tsx`

Below the Add to Cart / Pre-Order button area, add conditional shipping notices:

- **Regular product**: Light gray bordered box with truck icon: "Standard Delivery: 2-3 Business Days"
- **Pre-order product**: Already exists (amber bordered box with clock icon and 7-day message) -- no change needed
- **Studio exclusive / Coming soon**: No shipping info shown

---

## Phase 3: Delivery Charges Display (Product Detail)

**File:** `src/pages/ProductDetail.tsx`

Below the shipping time notice, add a small delivery fee info box:
- "Delivery Charges" heading
- "Inside Dhaka: TK100" and "Outside Dhaka: TK130"
- Light border, small font, espresso text
- Hidden for studio exclusive and coming soon products
- Fetch delivery prices from admin_settings (keys: `delivery_inside_dhaka`, `delivery_outside_dhaka`)

---

## Phase 4: Size Chart Button Typography

**File:** `src/pages/ProductDetail.tsx`

Update the Size Chart trigger button styling:
- `font-weight: 700`, `text-[13px]`, `uppercase`, `tracking-widest`, `underline`
- Full dark foreground color (not muted)
- Add ruler icon before text (use Lucide `Ruler` icon)

Update Size Chart modal:
- Header: `font-heading text-2xl font-bold` (Cormorant Garamond)
- "All measurements are in inches" note: `font-bold` instead of plain gray

---

## Phase 5: Return Policy Button and Modal

**File:** `src/pages/ProductDetail.tsx`

- Add "Return Policy" button next to Size Chart button with same bold/underline/uppercase style
- Uses Lucide `Undo2` icon
- Clicking opens a modal (same style as size chart modal)
- Modal header: "Return Policy" in `font-heading text-2xl font-bold`
- Content loaded from `admin_settings` key `return_policy_content`
- Fallback text if not set: "Our return policy will be available soon. Please contact us for any queries."
- Content renders with preserved line breaks (`whitespace-pre-line`)
- New `useQuery` for return policy content

---

## Phase 6: Inside/Outside Dhaka Checkout

**File:** `src/pages/Checkout.tsx`

Major changes:
1. Remove hardcoded `DELIVERY_CHARGE = 80`
2. Add `deliveryZone` state: `'inside_dhaka' | 'outside_dhaka'` defaulting to `'inside_dhaka'`
3. Fetch delivery prices from `admin_settings` keys `delivery_inside_dhaka` and `delivery_outside_dhaka`
4. Add radio selector in the form between City and Order Notes fields:
   - "Delivery Zone" label
   - Two radio options styled as clickable cards: "Inside Dhaka -- TK100" and "Outside Dhaka -- TK130"
   - Default: Inside Dhaka selected
5. Compute `deliveryCharge` dynamically based on selected zone
6. Update `total` calculation to use dynamic delivery charge
7. Include `delivery_zone` in the order insert payload
8. Update order summary to show "Delivery (Inside Dhaka)" or "Delivery (Outside Dhaka)" with the correct amount
9. Update navigation state passed to confirmation page

---

## Phase 7: Admin Settings -- Return Policy and Delivery

**File:** `src/pages/admin/AdminSettings.tsx`

Add to `SETTING_META`:
- `return_policy_content`: label "Return Policy Content", placeholder text
- `instagram_url`: label "Instagram URL", placeholder "https://instagram.com/..."
- `delivery_inside_dhaka`: label "Delivery Charge Inside Dhaka (TK)", type "number"
- `delivery_outside_dhaka`: label "Delivery Charge Outside Dhaka (TK)", type "number"

Add new sections:
1. **Delivery Charges** section (small card) with `delivery_inside_dhaka` and `delivery_outside_dhaka` fields
2. **Return Policy** section with a textarea for `return_policy_content` with character count

Add these keys to the ordered key groups so they render in separate sections.

---

## Phase 8: Admin Order Detail -- Delivery Zone

**File:** `src/pages/admin/AdminOrderDetail.tsx`

- Display "Delivery Zone: Inside Dhaka" or "Outside Dhaka" in the shipping/order details card
- Map `inside_dhaka` to "Inside Dhaka" and `outside_dhaka` to "Outside Dhaka"

---

## Phase 9: Coming Soon Product Type

### Admin Product Panel (`src/components/admin/ProductPanel.tsx`)
- Add `isComingSoon` state, initialized from `product.is_coming_soon`
- Add toggle section below Studio Exclusive with crystal ball icon
- Description: "Product image will be blurred. Price and details hidden. Teaser only."
- Include `is_coming_soon` in save payload
- Reset on new product

### Admin Products Table (`src/pages/admin/AdminProducts.tsx`)
- Add `is_coming_soon` to Product interface
- Show a small "CS" dark badge next to product name when `is_coming_soon` is true
- Add `is_coming_soon` to toggle labels map (no separate column needed)

### Storefront Product Cards (`src/components/home/ProductGrid.tsx` and `src/pages/Collections.tsx`)
- Add `is_coming_soon` to Product interface and query select
- Update badge priority: Studio Exclusive > Coming Soon (dark/black) > Pre-Order > Sold Out > SALE
- When `is_coming_soon`:
  - Image: apply `filter: blur(8px)` CSS class
  - Dark semi-transparent overlay with centered "Coming Soon" white text (Cormorant Garamond, bold)
  - Product name: show "???" instead
  - Price: completely hidden
  - Button area: hidden or show disabled "Coming Soon" text
  - Card link: prevent navigation (use `e.preventDefault()` or remove Link wrapper)

### Storefront Product Detail (`src/pages/ProductDetail.tsx`)
- Add `is_coming_soon` to Product interface and query select
- When `is_coming_soon`:
  - Show full-page coming soon display:
    - Product image as blurred background
    - Dark overlay
    - Centered content: "DROPPING SOON" heading, teaser text, Instagram button
  - Hide all purchase UI (size, quantity, cart, price, description)
  - Fetch `instagram_url` from admin_settings
  - Instagram button links to the URL (opens new tab)

---

## Phase 10: Add to Cart Modal Protection

**File:** `src/components/cart/AddToCartModal.tsx`
- Add `is_coming_soon` to product interface
- If product is coming soon, show message and disable add button

---

## Files Changed Summary

| File | Changes |
|------|---------|
| Database migration | Add `is_coming_soon` column, `delivery_zone` column, seed settings |
| `src/pages/ProductDetail.tsx` | Shipping time, delivery charges, size chart typography, return policy modal, coming soon full-page display |
| `src/pages/Checkout.tsx` | Delivery zone selector, dynamic pricing, save `delivery_zone` |
| `src/pages/admin/AdminSettings.tsx` | Return policy textarea, delivery charges, instagram URL fields |
| `src/pages/admin/AdminOrderDetail.tsx` | Show delivery zone label |
| `src/components/admin/ProductPanel.tsx` | Coming soon toggle section |
| `src/pages/admin/AdminProducts.tsx` | Coming soon badge next to product name |
| `src/components/home/ProductGrid.tsx` | Coming soon badge, blurred image, hidden price/name |
| `src/pages/Collections.tsx` | Coming soon badge, blurred image, hidden price/name |
| `src/components/cart/AddToCartModal.tsx` | Block coming soon products |
