

# Full Performance Optimization and Cleanup

## 1. Image Loading -- Complete Rewrite

**File: `src/lib/image.ts`**

Replace `getOptimizedImageUrl` with the new `getImageUrl` function that uses `format=origin` instead of `format=webp` and has a cleaner API.

**Files using images (update import + function name + add safe `onError`):**
- `src/components/home/HeroCarousel.tsx` -- `getImageUrl(url, 1920)`, keep `loading="eager"` on slide 0, add `fetchpriority="high"` on slide 0
- `src/components/home/ProductGrid.tsx` -- `getImageUrl(url, 600)`
- `src/pages/Collections.tsx` -- `getImageUrl(url, 600)`
- `src/components/home/CategoryCards.tsx` -- `getImageUrl(url, 800)`
- `src/pages/ProductDetail.tsx` -- main: `getImageUrl(url, 1200)`, thumbs: `getImageUrl(url, 200)`
- `src/pages/admin/AdminProducts.tsx` -- `getImageUrl(url, 200)`

All `onError` handlers will use the pattern:
```
onError={(e) => { e.currentTarget.onerror = null; e.currentTarget.src = originalUrl; }}
```

---

## 2. Hero Carousel -- Performance Fixes

**File: `src/components/home/HeroCarousel.tsx`**

- Slide 0: add `fetchPriority="high"` (already has `loading="eager"`)
- All slides: keep `decoding="async"`
- Add `style={{ contain: "layout" }}` on each slide div
- Autoplay config already has `stopOnInteraction: false, stopOnMouseEnter: true` -- confirmed correct

---

## 3. Supabase Query Optimization

| Query | File | `staleTime` |
|---|---|---|
| hero_slides | HeroCarousel.tsx | 5 min (already set) |
| products (homepage) | ProductGrid.tsx | 2 min (add) |
| categories-public | CategoryCards.tsx | 5 min (already set) |
| footer-settings | Footer.tsx | Infinity (upgrade from 5 min) |
| nav-categories | Navigation.tsx | 5 min (already set) |

**Column selection** -- most queries already select specific columns. Will verify `CategoryCards.tsx` uses specific columns instead of `*` (currently uses `select("*")` -- will change to `select("id, name, slug, description, image_url, sort_order")`).

**Footer cache** -- change `staleTime` and add `gcTime: Infinity` so footer never refetches.

---

## 4. Remove Unused Code and Cleanup

- `src/components/home/Newsletter.tsx` -- remove `console.log` statement
- Remove the fallback hardcoded hero slide array in `HeroCarousel.tsx` (the one with Unsplash URL) -- keep it as a simple placeholder since it handles the empty state
- Scan for unused imports (none found beyond the console.log)

---

## 5. Component Optimization

- **React.memo**: Not creating separate sub-components for ProductCard/CategoryCard since they are inline JSX in map loops. Extracting them into memoized components would add complexity without significant benefit given the small list sizes.
- **CartContext**: Already uses `useCallback` on all handlers -- confirmed correct.
- **AdminLayout badge refresh**: Change pending orders `refetchInterval` from 30000 to 60000 (match the other two).

---

## 6. Bundle Size -- Lazy Load Admin Pages

**File: `src/App.tsx`**

Convert all 12 admin page imports to `React.lazy()` with dynamic imports. Wrap admin routes in `<Suspense>` with a centered spinner fallback.

Pages to lazy-load:
- AdminDashboard, AdminOrders, AdminProducts, AdminCustomers, AdminCoupons, AdminSettings, AdminAbandonedCarts, AdminCourier, AdminPayments, AdminHeroSlides, AdminCategories, AdminFooter

`AdminLogin` stays eager since it's the entry point.

---

## 7. CSS Performance

**File: `src/index.css`**

Add:
```css
html { scroll-behavior: smooth; }

.embla__container {
  will-change: transform;
  backface-visibility: hidden;
}

img { content-visibility: auto; }
```

---

## 8. Vite Config -- Bundle Splitting

**File: `vite.config.ts`**

Add `build.rollupOptions.output.manualChunks` to split vendor bundles:
- `vendor-react`: react, react-dom, react-router-dom
- `vendor-supabase`: @supabase/supabase-js
- `vendor-charts`: recharts
- `vendor-carousel`: embla-carousel-react, embla-carousel-autoplay

Keep `chunkSizeWarningLimit: 1000`. Preserve existing `mode` parameter and `componentTagger` plugin.

---

## Technical Summary of All Files Modified

| File | Changes |
|---|---|
| `src/lib/image.ts` | Rewrite function, rename to `getImageUrl` |
| `src/components/home/HeroCarousel.tsx` | New image fn, `fetchPriority`, `contain: layout`, safe onError |
| `src/components/home/ProductGrid.tsx` | New image fn, `staleTime: 2min`, safe onError |
| `src/components/home/CategoryCards.tsx` | New image fn, specific column select, safe onError |
| `src/pages/Collections.tsx` | New image fn, safe onError |
| `src/pages/ProductDetail.tsx` | New image fn, safe onError |
| `src/pages/admin/AdminProducts.tsx` | New image fn, safe onError |
| `src/components/layout/Footer.tsx` | `staleTime: Infinity`, `gcTime: Infinity` |
| `src/components/admin/AdminLayout.tsx` | Pending refetchInterval 30s to 60s |
| `src/components/home/Newsletter.tsx` | Remove console.log |
| `src/App.tsx` | Lazy load 12 admin pages, add Suspense |
| `src/index.css` | CSS perf rules |
| `vite.config.ts` | Manual chunks for bundle splitting |

