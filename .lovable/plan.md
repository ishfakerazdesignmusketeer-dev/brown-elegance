

# Add `getOptimizedImageUrl()` Utility and Apply Across Codebase

## Overview

Create a utility function that rewrites Supabase storage URLs to use the image transform API, then apply it at every image render point so browsers download only the size they need in WebP format.

---

## Part 1: New Utility Function

**File:** `src/lib/image.ts` (new file)

```typescript
export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality: number = 75
): string {
  if (!url || !url.includes("supabase")) return url;
  return (
    url.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    ) + `?width=${width}&quality=${quality}&format=webp`
  );
}
```

Returns the original URL unchanged for non-Supabase URLs (Unsplash, placeholders, etc.).

---

## Part 2: Apply to All Image Locations

| File | Image Element | Call |
|---|---|---|
| `src/components/home/HeroCarousel.tsx` | Slide background image | `getOptimizedImageUrl(url, 1920, 80)` |
| `src/components/home/ProductGrid.tsx` | Product card image | `getOptimizedImageUrl(url, 600, 75)` |
| `src/components/home/CategoryCards.tsx` | Category card image | `getOptimizedImageUrl(url, 800, 75)` |
| `src/pages/Collections.tsx` | Product card image | `getOptimizedImageUrl(url, 600, 75)` |
| `src/pages/ProductDetail.tsx` | Main image | `getOptimizedImageUrl(url, 1200, 80)` |
| `src/pages/ProductDetail.tsx` | Thumbnail buttons | `getOptimizedImageUrl(url, 200, 70)` |
| `src/pages/admin/AdminProducts.tsx` | Admin product grid thumbnail | `getOptimizedImageUrl(url, 200, 70)` |

---

## Technical Details

- Each file gets a new import: `import { getOptimizedImageUrl } from "@/lib/image";`
- The function wraps the existing `src` attribute value -- no other markup changes
- Non-Supabase URLs (Unsplash hero fallbacks, `/placeholder.svg`) pass through untouched
- The `format=webp` parameter lets the CDN serve WebP to all modern browsers

