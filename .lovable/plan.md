

# Fix Image Display — object-contain

Targeted CSS-only changes to three image elements across two files. No logic or layout changes.

## Changes

### 1. Product Grid Cards (`src/components/home/ProductGrid.tsx`, line 77)
- Change `object-cover` to `object-contain` on the product card image
- Container already has `bg-[#F8F5E9]` -- no change needed there

### 2. Product Detail — Main Image (`src/pages/ProductDetail.tsx`, line 149)
- Change `object-cover` to `object-contain` on the main product image
- Container already has `bg-[#F8F5E9]` -- no change needed

### 3. Product Detail — Thumbnails (`src/pages/ProductDetail.tsx`, line 163 + 170)
- Change thumbnail container background from `bg-muted` to `bg-[#F8F5E9]`
- Change thumbnail `object-cover` to `object-contain` on line 170

### Summary
Only 4 lines change across 2 files. Everything else stays the same.

