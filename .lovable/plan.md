
# Fix `getOptimizedImageUrl` and Add Fallbacks

## Problem

The current `getOptimizedImageUrl` function checks for `"supabase"` in the URL string, which is too broad. It then attempts to replace a path segment that may not exist in all matching URLs, producing malformed URLs that fail to load images.

## Fix Summary

### 1. Update `src/lib/image.ts`

Replace the function with a stricter check that only transforms URLs containing the exact Supabase storage path `supabase.co/storage/v1/object/public/`. Return an empty string for falsy URLs, and return all other URLs unchanged.

```typescript
export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality: number = 75
): string {
  if (!url) return '';
  if (!url.includes('supabase.co/storage/v1/object/public/')) return url;
  const transformUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );
  return `${transformUrl}?width=${width}&quality=${quality}&format=webp`;
}
```

### 2. Add `onError` fallback to all `<img>` tags using this function

Each image gets an `onError` handler that reverts `src` to the original (untransformed) URL if the optimized one fails. Files and specific locations:

| File | Image(s) | Original URL variable |
|---|---|---|
| `HeroCarousel.tsx` | Slide image (line ~115) | `slide.image_url` |
| `ProductGrid.tsx` | Product card image (line ~75) | `product.images?.[0] ?? "/placeholder.svg"` |
| `Collections.tsx` | Product card image (line ~126) | `product.images?.[0] ?? "/placeholder.svg"` |
| `CategoryCards.tsx` | Category image (line ~62) | `cat.image_url` |
| `ProductDetail.tsx` | Main image (line ~147) | `images[mainImage]` |
| `ProductDetail.tsx` | Thumbnail images (line ~159) | `img` |
| `AdminProducts.tsx` | Admin thumbnail (line ~132) | `product.images[0]` |

### 3. Verify first hero slide stays `loading="eager"`

The current code at line ~118 already uses a conditional: `loading={index === 0 ? "eager" : "lazy"}`. This will be confirmed unchanged.

---

## Files Modified

- `src/lib/image.ts` -- stricter URL check
- `src/components/home/HeroCarousel.tsx` -- add onError
- `src/components/home/ProductGrid.tsx` -- add onError
- `src/pages/Collections.tsx` -- add onError
- `src/components/home/CategoryCards.tsx` -- add onError
- `src/pages/ProductDetail.tsx` -- add onError (main + thumbnails)
- `src/pages/admin/AdminProducts.tsx` -- add onError
