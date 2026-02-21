

# Fix Product Image Display — object-cover with object-top

Revert from `object-contain` back to `object-cover` but add `object-top` so faces/upper body are visible. Use `aspect-[3/4]` consistently.

## Changes

### 1. Product Grid Cards (`src/components/home/ProductGrid.tsx`, ~line 72-77)
- Container already has `aspect-[3/4]` -- confirm no change needed
- Image: change `object-contain` to `object-cover object-top`

### 2. Product Detail — Main Image (`src/pages/ProductDetail.tsx`, ~line 144-149)
- Container already has `aspect-[3/4]` -- confirm no change needed
- Image: change `object-contain` to `object-cover object-top`

### 3. Product Detail — Thumbnails (`src/pages/ProductDetail.tsx`, ~line 167-170)
- Image: change `object-contain` to `object-cover object-top`

### Summary
3 lines changed across 2 files. Only `object-fit` and `object-position` classes are modified.

