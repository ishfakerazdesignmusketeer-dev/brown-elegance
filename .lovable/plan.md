

# Brand Rename, Hero Slides, Categories, and Footer Management

## Overview

This update touches every layer of the app: database (4 new tables, 1 altered table), storefront pages (hero, collections, footer, navigation), admin pages (3 new), and a brand rename from "Brown" to "Brown House" across all user-facing text.

---

## Part 1: Brand Name Change ("Brown" to "Brown House")

**Files to update (user-facing text only, no variable/file renames):**

| File | What changes |
|---|---|
| `index.html` | Title: "Brown House -- Premium Bengali Ethnic Wear", og:title, author meta |
| `src/components/admin/AdminLayout.tsx` | "Brown Admin" to "Brown House Admin" (two occurrences: desktop sidebar + mobile header) |
| `src/components/admin/InvoicePrint.tsx` | "BROWN" to "BROWN HOUSE", tagline "Premium Bengali Menswear" stays, URL "www.brownbd.com" to "www.brownhouse.com" |
| `src/pages/admin/AdminOrders.tsx` | WhatsApp message "Order Update -- BROWN" to "Order Update -- BROWN HOUSE" |
| `src/pages/Checkout.tsx` | WhatsApp message "New Order -- BROWN" to "New Order -- BROWN HOUSE" |
| `src/pages/admin/AdminAbandonedCarts.tsx` | Recovery message "at BROWN" to "at BROWN HOUSE" (line 86) |
| `src/components/home/HeroCarousel.tsx` | Headline "Brown --" to "Brown House --" |

Note: The Navigation and Footer components use the logo image (`src/assets/logo.png`), not text -- those remain unchanged unless the logo itself changes.

---

## Part 2: Database Migration

One SQL migration covering all new tables and alterations:

**Table: `hero_slides`**
- id, image_url, title, subtitle, cta_text, cta_url, sort_order, is_active, created_at
- RLS: anon SELECT (where is_active = true), anon INSERT/UPDATE/DELETE for admin

**Table: `categories`**
- id, name, slug (unique), description, image_url, sort_order, is_active, created_at
- RLS: anon SELECT, anon INSERT/UPDATE/DELETE for admin

**Table: `footer_settings`**
- id, key (unique), value, sort_order
- RLS: anon SELECT, anon INSERT/UPDATE/DELETE for admin

**Alter `products`:**
```sql
ALTER TABLE products ADD COLUMN IF NOT EXISTS category_id uuid REFERENCES categories(id);
```

**Seed data:**
- 4 hero slides using existing Unsplash URLs from `HeroCarousel.tsx`
- 3 categories: Panjabi, Flare Pant, Fabric
- Update all existing products: `SET category_id = (SELECT id FROM categories WHERE slug = 'panjabi')`
- 14 footer_settings rows (brand_tagline, contact info, social URLs, 3 link columns, copyright)

**Storage buckets:**
- `hero-images` (public)
- `category-images` (public)

---

## Part 3: File Structure

```text
New files:
  src/pages/Collections.tsx               -- /collections/:slug page
  src/pages/admin/AdminHeroSlides.tsx      -- hero slide management
  src/pages/admin/AdminCategories.tsx      -- category management
  src/pages/admin/AdminFooter.tsx          -- footer settings management

Modified files:
  index.html                              -- title/meta
  src/App.tsx                             -- new routes
  src/components/home/HeroCarousel.tsx     -- load from DB
  src/components/home/CategoryCards.tsx    -- load from DB
  src/components/layout/Navigation.tsx     -- Collections dropdown
  src/components/layout/Footer.tsx         -- load from DB
  src/components/admin/AdminLayout.tsx     -- 3 new sidebar items + rename
  src/components/admin/ProductPanel.tsx    -- dynamic category selector
  src/components/admin/InvoicePrint.tsx    -- brand rename
  src/pages/admin/AdminOrders.tsx          -- brand rename in WhatsApp msg
  src/pages/admin/AdminAbandonedCarts.tsx  -- brand rename in recovery msg
  src/pages/Checkout.tsx                   -- brand rename in WhatsApp msg
  src/pages/ProductDetail.tsx             -- breadcrumb with category link
```

---

## Part 4: Hero Carousel (`HeroCarousel.tsx`)

- Replace hardcoded `heroSlides` array with a `useQuery` fetching from `hero_slides` where `is_active = true`, ordered by `sort_order`
- Show skeleton (full viewport with pulsing overlay) while loading
- If no slides returned, fall back to a single placeholder slide
- Each slide renders: image, optional title/subtitle overlay (bottom-left, matching current layout), optional CTA button
- Keep existing Embla carousel behavior (5s autoplay, pause on hover, dots)
- Brand headline "Brown House -- Handwoven Khadi, Tailored Quietly" becomes the first slide's title/subtitle from DB

---

## Part 5: Admin Hero Slides Page (`AdminHeroSlides.tsx`)

**Route:** `/admin/hero-slides`

- Header: "Hero Slides" + "Add Slide" button
- List of slides ordered by sort_order, each showing:
  - Thumbnail (80x60)
  - Title + subtitle
  - Sort order
  - Active toggle (inline update)
  - Edit button (opens slide-over panel)
  - Delete button (with confirm dialog)
  - Up/down arrows for reordering (swap sort_order values)

**Slide Panel (slide-over):**
- Two tabs: "Upload" and "URL"
  - Upload tab: file input to `hero-images` bucket
  - URL tab: text input for direct URL
- Title (optional)
- Subtitle (optional)
- CTA Button Text (optional)
- CTA Button URL (optional)
- Sort Order (number)
- Is Active toggle
- Save button

---

## Part 6: Category System

### A) Database + Seed (covered in Part 2)

### B) Navigation Dropdown (`Navigation.tsx`)
- Add "Collections" as a nav link with a dropdown
- On hover/click, show a dropdown listing all active categories from DB
- Each links to `/collections/:slug`
- Mobile hamburger: add categories as sub-items

### C) Collections Page (`Collections.tsx`)
- Route: `/collections/:slug`
- Fetch category by slug from `categories` table
- Fetch products where `category_id = category.id AND is_active = true`
- Breadcrumb: Home > Collections > [Category Name]
- Page title = category name
- Product grid identical to `ProductGrid` design
- Empty state: "No products in this category yet"
- Uses AnnouncementBar + Navigation + Footer layout

### D) Category Cards (`CategoryCards.tsx`)
- Replace hardcoded 3 cards with dynamic fetch from `categories` table
- Each card: category image (or gradient placeholder), name, "Shop Now" link to `/collections/:slug`
- Keep existing card design and hover animations
- Section header changes from "Shop by Mood" to "Shop by Category"

### E) Product Detail Breadcrumb (`ProductDetail.tsx`)
- Fetch category name from `categories` table using `category_id`
- Breadcrumb: Home > [Category Name (linked to /collections/:slug)] > Product Name

### F) Admin Categories Page (`AdminCategories.tsx`)
- Route: `/admin/categories`
- Table: Name, Slug, Products Count, Active, Sort, Actions
- Products Count: fetched via a count query on `products` where `category_id = category.id`
- Up/down sort buttons
- Active toggle per row
- Edit opens slide-over panel
- Delete: only allowed if products count = 0, else show error toast

**Category Panel (slide-over):**
- Name (auto-generates slug on typing)
- Slug (editable)
- Description (textarea)
- Image: Upload tab (to `category-images` bucket) or URL tab
- Sort Order
- Is Active toggle
- Save

### G) Product Panel Update (`ProductPanel.tsx`)
- Replace static `CATEGORIES` array with dynamic fetch from `categories` table
- Dropdown shows category names
- On select, store both `category` (text name for backward compat) and `category_id` (uuid)
- On save, include `category_id` in the product upsert

---

## Part 7: Footer Management

### A) Footer Component (`Footer.tsx`)
- On mount, fetch all rows from `footer_settings`
- Parse link columns: format "Label|URL,Label|URL" split into arrays
- Replace all hardcoded text with dynamic values
- Graceful fallbacks if keys are missing
- Show skeleton while loading
- Brand name in copyright from DB

### B) Admin Footer Page (`AdminFooter.tsx`)
- Route: `/admin/footer`
- Organized into 4 sections:

**Section 1: Brand and Contact**
- Brand Tagline, Contact Email, Contact Phone, Contact Address

**Section 2: Social Media**
- Instagram URL, Facebook URL

**Section 3: Link Columns (3 side-by-side editors)**
Each column:
- Column Title input
- Dynamic link list: each row has [Label input] [URL input] [remove button]
- Add link button
- Up/down reorder arrows per link
- Saved as "Label|URL,Label|URL" format

**Section 4: Copyright**
- Copyright text input

"Save All" button at bottom

---

## Part 8: Sidebar Update (`AdminLayout.tsx`)

Final 12-item navigation:
1. Dashboard
2. Hero Slides (new)
3. Orders (pending badge)
4. Abandoned Carts (unrecovered badge)
5. Products
6. Categories (new)
7. Customers
8. Coupons
9. Courier (today badge)
10. Payments
11. Footer (new)
12. Settings

New icons from lucide-react: `Image` (hero slides), `Tag` or `Layers` (categories), `Link` (footer).

---

## Part 9: Routing (`App.tsx`)

**New public route:**
```tsx
<Route path="/collections/:slug" element={<Collections />} />
```

**New admin routes (inside AdminLayout):**
```tsx
<Route path="hero-slides" element={<AdminHeroSlides />} />
<Route path="categories" element={<AdminCategories />} />
<Route path="footer" element={<AdminFooter />} />
```

---

## Build Order

1. Database migration (tables, seeds, storage buckets, product update)
2. Brand name changes across all files
3. `App.tsx` -- new routes
4. `AdminLayout.tsx` -- 12-item sidebar + rename
5. `HeroCarousel.tsx` -- dynamic from DB
6. `AdminHeroSlides.tsx` -- new page
7. `CategoryCards.tsx` -- dynamic from DB
8. `Collections.tsx` -- new page
9. `AdminCategories.tsx` -- new page
10. `ProductPanel.tsx` -- dynamic category dropdown
11. `ProductDetail.tsx` -- breadcrumb update
12. `Navigation.tsx` -- Collections dropdown
13. `Footer.tsx` -- dynamic from DB
14. `AdminFooter.tsx` -- new page
15. `AdminSettings.tsx` -- no changes needed (already has all keys)
16. `index.html` -- title/meta update
17. `InvoicePrint.tsx`, `AdminOrders.tsx`, `Checkout.tsx`, `AdminAbandonedCarts.tsx` -- brand text fixes

---

## Technical Notes

- All new tables use anon SELECT RLS for public reads; admin writes are allowed via anon key (same pattern as Phase 2/3, password-gated at frontend level).
- The `categories` table uses a `slug` unique constraint for URL routing via `/collections/:slug`.
- The `footer_settings` link format `"Label|URL,Label|URL"` is parsed client-side with a simple `.split(",").map(s => s.split("|"))` pattern.
- Hero slides query uses `is_active = true` filter at the RLS level for public safety.
- Product category migration sets all existing products to "panjabi" category since they are all panjabis currently.
- The `category_id` column on `products` is nullable to support backward compatibility with any products that may not have a category assigned yet.
- Collections dropdown in Navigation uses a `useQuery` with stale time of 5 minutes to avoid re-fetching on every page nav.
- Storage buckets `hero-images` and `category-images` are created with public access, matching the existing `product-images` bucket pattern.

