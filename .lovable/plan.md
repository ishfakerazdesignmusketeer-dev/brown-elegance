
# Fix Product Image Reloading on Scroll

3 changes across 2 files to prevent image reloading and reduce unnecessary API calls.

## Changes

### 1. Homepage Product Grid — Eager Loading (`src/components/home/ProductGrid.tsx`, line 78)

Change `loading="lazy"` to `loading="eager"` and add `fetchpriority="high"` (new attribute after line 79):

```
loading="eager"
decoding="async"
fetchpriority="high"
```

### 2. Homepage Product Grid — Query Cache (`src/components/home/ProductGrid.tsx`, line 33)

Replace current `staleTime: 5 * 60 * 1000` with:

```
staleTime: 10 * 60 * 1000,
gcTime: 30 * 60 * 1000,
refetchOnWindowFocus: false,
refetchOnMount: false,
```

### 3. Product Detail — Main Image Container (`src/pages/ProductDetail.tsx`, line 145)

Add `style` to the main image container `div`:

```
<div className="overflow-hidden bg-[#F8F5E9] mb-3" style={{ contain: 'layout style', willChange: 'auto' }}>
```

## Summary

- 2 files, 3 edits
- Product grid images load eagerly with high priority — no more unload/reload on scroll
- Query data cached 30 min, no refetch on window focus or remount
- Product detail main image container gets CSS containment for stable layout
