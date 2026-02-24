

# Production Readiness Optimization Plan

## Current Performance Snapshot

| Metric | Current | Target | Status |
|--------|---------|--------|--------|
| First Contentful Paint | 4.6s | < 2s | Needs work |
| Full Page Load | 5.5s | < 3s | Needs work |
| CLS | 0.0005 | < 0.1 | Good |
| DOM Nodes | 1,036 | < 1,500 | Good |
| JS Heap | 16.6MB | < 30MB | Good |
| Image reload on scroll | Fixed | Fixed | Good |

## Issues Found

### 1. Render-blocking Google Fonts (biggest impact)
The Google Fonts CSS link in `index.html` blocks the entire first paint. The browser cannot render anything until both Cormorant Garamond and Lora fonts are downloaded. This is why FCP is 4.6 seconds.

**Fix:** Add `media="print" onload="this.media='all'"` to the font stylesheet link so fonts load without blocking render, with a `<noscript>` fallback.

### 2. All pages eagerly imported in App.tsx
Every page (ProductDetail, Checkout, Collections, MyOrders, etc.) is imported at the top level, meaning ALL page code downloads before the homepage renders. Only admin pages use `lazy()`.

**Fix:** Lazy-load all non-homepage pages (ProductDetail, Checkout, OrderConfirmation, Collections, MyOrders, MyProfile, ResetPassword, NotFound) using `React.lazy()` with `Suspense`.

### 3. Category card images on ibb.co are slow (1.3s each)
Three category images load from `i.ibb.co.com` and take 1.3 seconds each. These are large JPGs without any optimization. Unlike the product images on R2 which are WebP, these are uncompressed.

**Fix:** These are below the fold, so keep `loading="lazy"` but add `decoding="async"` (already there) and CSS containment to their containers to prevent layout shifts.

### 4. Duplicate API calls
The categories endpoint is called twice (once for navigation, once for CategoryCards) with different query keys (`nav-categories` vs `categories-public`). Same data, two requests.

**Fix:** Unify to a single query key so React Query deduplicates automatically.

### 5. Logo loaded twice
The `logo.png` (61KB) is imported both in `Navigation.tsx` and `Footer.tsx` as separate module imports. While Vite deduplicates the asset in production, in dev mode it fetches twice.

**Fix:** No code change needed -- this resolves itself in production builds.

### 6. AnnouncementBar marquee uses non-standard animation
The `animate-marquee-rtl` animation runs continuously, causing the GPU to composite on every frame even when not visible.

**Fix:** Add `will-change: transform` to the marquee element and use `contain: content` to limit paint scope.

## Implementation Plan

### Step 1: Non-blocking Google Fonts
**File:** `index.html`

Replace the blocking `<link>` for Google Fonts with a non-blocking pattern:
```html
<link rel="preload" href="https://fonts.googleapis.com/css2?family=..." as="style" onload="this.onload=null;this.rel='stylesheet'">
<noscript><link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=..."></noscript>
```

This alone should cut FCP by 1-2 seconds.

### Step 2: Lazy-load non-homepage routes
**File:** `src/App.tsx`

Convert these to `lazy()` imports:
- ProductDetail
- Checkout
- OrderConfirmation
- Collections
- MyOrders
- MyProfile
- ResetPassword
- NotFound

Keep `Index` (homepage) as eager since it's the landing page.

### Step 3: Deduplicate category queries
**File:** `src/components/layout/Navigation.tsx`

Change the query key from `["nav-categories"]` to `["categories-public"]` so it shares the cache with `CategoryCards.tsx`. Both queries fetch the same data.

### Step 4: Add CSS containment to category cards
**File:** `src/components/home/CategoryCards.tsx`

Add `style={{ contain: 'layout style' }}` to the category card `<Link>` wrapper, matching what we did for product cards.

### Step 5: Optimize AnnouncementBar animation
**File:** `src/components/layout/AnnouncementBar.tsx`

Add `will-change: transform` and `contain: content` to the marquee container to reduce paint scope.

### Step 6: Add font-display fallback in CSS
**File:** `src/index.css`

Add fallback font styling so text is visible immediately while custom fonts load (FOUT instead of FOIT):
```css
body {
  font-display: swap;
}
```

## What's Already Good

- Hero image preloading is working correctly
- Product images no longer flash on scroll (eager loading fix)
- Admin routes are properly lazy-loaded
- React Query caching is well-configured (10m stale, 30m gc)
- Vite manual chunks split vendors properly
- CLS is excellent at 0.0005
- Favicon has been compressed

## Expected Impact

| Metric | Before | After (estimated) |
|--------|--------|-------------------|
| FCP | 4.6s | ~2-2.5s |
| Full Load | 5.5s | ~3-3.5s |
| Initial JS payload | All pages | Homepage only |
| API calls | 9 | 8 (deduplicated categories) |

## Technical Summary

| Change | File | Impact |
|--------|------|--------|
| Non-blocking fonts | `index.html` | FCP drops 1-2s |
| Lazy routes | `src/App.tsx` | Less JS to parse on homepage |
| Deduplicate queries | `Navigation.tsx` | 1 fewer API call |
| CSS containment | `CategoryCards.tsx` | Smoother scrolling |
| Marquee optimization | `AnnouncementBar.tsx` | Less GPU usage |
| Font fallback | `src/index.css` | Text visible instantly |

