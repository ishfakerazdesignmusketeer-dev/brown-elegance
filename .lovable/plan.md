
# Two-Column Product Grid on Mobile

## Problem
The homepage product grid (`ProductGrid.tsx`) uses `grid-cols-1` on mobile, showing one product per row. Users must scroll extensively to see all products. The Collections page already uses `grid-cols-2` globally and works well -- the homepage should match.

## Change

**File:** `src/components/home/ProductGrid.tsx`

Change the grid class from:
```
grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3
```
to:
```
grid grid-cols-2 lg:grid-cols-3
```

This makes the grid 2 columns by default (including mobile), and 3 columns on large screens. The `sm:grid-cols-2` breakpoint becomes unnecessary since we start at 2.

The gap will also be adjusted slightly for mobile to keep cards from feeling cramped:
```
gap-4 lg:gap-10
```

No other files need changes -- the product card styling (image aspect ratio, text sizing, mobile "Add to Cart" bar) already works well at half-width, as proven by the Collections page.
