

# Add Skeleton Loading Placeholders

3 small changes across 2 files.

## Changes

### 1. Product Grid Skeletons (`src/components/home/ProductGrid.tsx`, lines 62-67)

Replace the current `<Skeleton>` components with the user's exact markup:

```
<div key={i}>
  <div className="w-full bg-[#ede9d9] animate-pulse rounded-md" style={{aspectRatio:'4/5'}} />
  <div className="h-4 w-24 bg-[#ede9d9] animate-pulse rounded-md mt-2" />
  <div className="h-4 w-16 bg-[#ede9d9] animate-pulse rounded-md mt-1" />
</div>
```

Keep the 6-card count as-is.

### 2. Hero Carousel Loading State (`src/components/home/HeroCarousel.tsx`, lines 78-90)

Replace the current skeleton section with a simple cream background + pulse:

```
<section className="relative h-screen w-full overflow-hidden bg-[#F8F5E9] animate-pulse" />
```

### 3. Product Grid staleTime (`src/components/home/ProductGrid.tsx`, line 33)

Update from `2 * 60 * 1000` to `5 * 60 * 1000`. Hero and CategoryCards already use 5+ minutes.

## Summary

- 2 files changed: `ProductGrid.tsx`, `HeroCarousel.tsx`
- Skeleton cards match the 4:5 aspect ratio of real product cards
- Hero shows a clean cream pulse instead of multiple skeleton blocks
- All homepage queries cached for 5 minutes

