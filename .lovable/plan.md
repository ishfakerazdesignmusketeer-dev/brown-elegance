

# Fix Product Image Reloading on Scroll

## Root Cause

The product images use `loading="lazy"`, which tells the browser it's okay to **defer and potentially unload** these images. With only 3 products on the page, lazy loading is counterproductive -- the browser unloads the images when you scroll away, then re-fetches them when you scroll back. The hero images don't have this problem because they use `loading="eager"`.

Additionally, the R2 server isn't sending `Cache-Control` headers, so the browser has weaker caching guarantees for these images.

The image file sizes are actually fine (340-395 KB each, already in WebP format) -- this is not a size problem.

## The Fix (2 changes)

### 1. Switch product images to eager loading
Since there are only 3 products, all images should load eagerly and stay in memory. This is exactly how the hero carousel works and why it doesn't have the reloading issue.

**File:** `src/components/home/ProductGrid.tsx`
- Change `loading="lazy"` to `loading="eager"` on product images
- Add `fetchPriority="low"` so they don't compete with the hero for bandwidth

### 2. Add CSS containment to product image containers
Add `contain: layout style` to each product card's image container (same technique used on the hero slides) so the browser doesn't recalculate layout when scrolling.

**File:** `src/components/home/ProductGrid.tsx`
- Add `style={{ contain: 'layout style' }}` to the image wrapper `<Link>` element

## Technical Details

| Change | File | What |
|--------|------|------|
| Eager loading | `ProductGrid.tsx` | `loading="eager"` + `fetchPriority="low"` on product `<img>` |
| CSS containment | `ProductGrid.tsx` | `contain: layout style` on image container |

### Why This Works
- **Hero images don't reload** because they use `loading="eager"` -- the browser keeps them decoded in memory
- **Product images reload** because `loading="lazy"` lets the browser discard them when off-screen
- With only 3 products, eager loading adds negligible load time but prevents all re-fetching
- `fetchPriority="low"` ensures the hero still loads first

