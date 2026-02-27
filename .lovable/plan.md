

# Blazing Fast Brown House -- Performance Overhaul

## Implementation Order (as requested)

### 1. Create LazyImage Component
**New file: `src/components/ui/lazy-image.tsx`**

A reusable component with:
- `IntersectionObserver` with 300px rootMargin for early loading
- `priority` prop: when true, skips observer and loads eagerly with `fetchPriority="high"`
- Cream-colored skeleton placeholder (#F8F5E9) with shimmer animation while loading
- Fade-in transition (opacity 0 to 1, 300ms) when image loads
- Image URLs passed through as-is (no URL modification per user instructions)
- Accepts all standard props: `src`, `alt`, `className`, `width`, `height`

### 2. Add Shimmer + Page Transition CSS
**Edit: `src/index.css`**

Add two animations:
```css
@keyframes shimmer {
  0% { background-position: 200% 0; }
  100% { background-position: -200% 0; }
}
.skeleton-shimmer {
  background: linear-gradient(90deg, #ede9d9 25%, #e4dfc8 50%, #ede9d9 75%);
  background-size: 200% 100%;
  animation: shimmer 1.5s infinite;
}
@keyframes pageIn {
  from { opacity: 0; transform: translateY(6px); }
  to { opacity: 1; transform: translateY(0); }
}
.page-transition {
  animation: pageIn 0.2s ease-out forwards;
}
```

### 3. Skeleton Screens -- Replace All Spinners

**ProductGrid (`src/components/home/ProductGrid.tsx`)**
- Replace existing skeleton placeholders with shimmer-animated versions (8 cards)
- Replace `<img>` with `<LazyImage>`, first 4 get `priority={true}`
- Add `onMouseEnter` for image preloading + React Query data prefetch
- Use `useQueryClient` to prefetch product detail data on hover

**Collections (`src/pages/Collections.tsx`)**
- Upgrade skeleton to shimmer (12 cards in 2-col grid matching real layout)
- Replace `<img>` with `<LazyImage>`, first 4 priority
- Add hover prefetch (same as ProductGrid)

**ProductDetail (`src/pages/ProductDetail.tsx`)**
- Upgrade loading skeleton: large shimmer rect left (aspect 3/4), lines + button placeholders right
- Replace main image and thumbnails with `<LazyImage>` (main = priority, thumbs = lazy)

**CategoryCards (`src/components/home/CategoryCards.tsx`)**
- Upgrade skeleton to shimmer
- Replace `<img>` with `<LazyImage priority={false}>`

**YouMayAlsoLike (`src/components/product/YouMayAlsoLike.tsx`)**
- Upgrade skeleton to shimmer
- Replace `<img>` with `<LazyImage priority={false}>`

**HeroCarousel (`src/components/home/HeroCarousel.tsx`)**
- Replace loading state with shimmer instead of `animate-pulse`
- First slide: `<LazyImage priority={true}>`, others `priority={false}`

**AdminFallback in App.tsx**
- Replace spinner with a shimmer skeleton layout

### 4. React Query -- Aggressive Caching
**Edit: `src/App.tsx`**

Configure `QueryClient` with global defaults:
```typescript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      gcTime: 10 * 60 * 1000,
      refetchOnWindowFocus: false,
      refetchOnMount: false,
      refetchOnReconnect: false,
      retry: 1,
    }
  }
});
```

Remove per-query `staleTime`/`refetchOnWindowFocus`/`refetchOnMount` overrides from ProductGrid (they're now defaults).

### 5. Hover Prefetching (ProductGrid + Collections)
On product card `onMouseEnter`:
- Preload full-size image: `new Image().src = product.images[0]`
- Prefetch product detail data: `queryClient.prefetchQuery({ queryKey: ['product', slug], ... })`

This makes product detail pages feel instant after hovering.

### 6. Page Transitions
**Edit: `src/pages/Index.tsx`, `ProductDetail.tsx`, `Collections.tsx`, `Checkout.tsx`, `MyOrders.tsx`, `MyProfile.tsx`**

Wrap each page's root `<div>` with `className="page-transition"` to get the subtle fade-in on navigation.

### 7. Aspect Ratio Containers (CLS = 0)
Already mostly done. Verify and ensure:
- ProductGrid cards: `aspect-ratio: 4/5` on wrapper (already set)
- Collections cards: `aspect-ratio: 3/4` on wrapper (already set)
- ProductDetail thumbnails: fixed `aspect-ratio: 4/5` (already set)
- LazyImage wrapper inherits parent's aspect ratio

### 8. Scroll Performance CSS
- Product card hover already uses `transform: scale()` (good, GPU-accelerated)
- Add `will-change: transform` to `.embla__container` (already done in CSS)
- Verify no hover animations use margin/padding/width/height

### 9. Cart -- Already Optimistic
The cart is localStorage-first with debounced Supabase sync. No changes needed -- it's already instant.

### 10. Font Loading -- Already Optimized
`index.html` already has `preconnect`, `preload as style`, and `display=swap`. No changes needed.

---

## Files Summary

| File | Action |
|------|--------|
| `src/components/ui/lazy-image.tsx` | **Create** -- LazyImage with observer + shimmer + fade |
| `src/index.css` | **Edit** -- Add shimmer keyframes + page transition |
| `src/components/home/ProductGrid.tsx` | **Edit** -- LazyImage, shimmer skeletons, hover prefetch |
| `src/pages/Collections.tsx` | **Edit** -- LazyImage, shimmer skeletons, hover prefetch |
| `src/pages/ProductDetail.tsx` | **Edit** -- LazyImage, better shimmer skeleton |
| `src/components/home/CategoryCards.tsx` | **Edit** -- LazyImage, shimmer skeleton |
| `src/components/product/YouMayAlsoLike.tsx` | **Edit** -- LazyImage, shimmer skeleton |
| `src/components/home/HeroCarousel.tsx` | **Edit** -- LazyImage, shimmer loading state |
| `src/App.tsx` | **Edit** -- QueryClient caching defaults, skeleton fallback |
| `src/pages/Index.tsx` | **Edit** -- page-transition class |

## What Stays Unchanged
- `src/lib/image.ts` -- No URL modifications per user instructions (R2 URLs used as-is)
- `src/contexts/CartContext.tsx` -- Already optimistic
- `index.html` -- Font loading already optimized
- All admin pages -- Storefront first (admin can be done in a follow-up)

