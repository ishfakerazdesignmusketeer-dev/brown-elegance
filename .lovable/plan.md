

# Fix Broken Product Images

## Problem
The `getImageUrl` helper rewrites image URLs to use the `/render/image/` transformation endpoint, which is not available on this project. The main product image broke because its `onError` fallback was removed in the last edit. Thumbnails still work because they kept their `onError` fallback.

## Solution
Stop using the broken image transformation entirely. Use the original storage URLs directly for all product images.

### Changes

**`src/pages/ProductDetail.tsx` (line 162)** -- Main image: use raw URL instead of transformed
- From: `src={getImageUrl(images[mainImage], 1200)}`
- To: `src={images[mainImage]}`

**`src/pages/ProductDetail.tsx` (line 185)** -- Thumbnails: use raw URL
- From: `src={getImageUrl(img, 200)}`
- To: `src={img}`

**`src/components/home/ProductGrid.tsx` (lines 75, 83)** -- Homepage grid: use raw URLs
- Line 75: `src={getImageUrl(originalUrl, 600)}` to `src={originalUrl}`
- Line 83: `src={getImageUrl(product.images[1], 600)}` to `src={product.images[1]}`

**`src/pages/Collections.tsx` (line ~131)** -- Collection grid: use raw URL
- From: `src={getImageUrl(originalUrl, 600)}` to `src={originalUrl}`

This removes all `getImageUrl` calls from product image rendering. The images will load directly from storage, which works reliably.

## Files changed
- `src/pages/ProductDetail.tsx` (2 lines)
- `src/components/home/ProductGrid.tsx` (2 lines)
- `src/pages/Collections.tsx` (1 line)

