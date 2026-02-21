

# Fix Product Card Image Display

Apply the user's exact image patterns to 3 locations across 2 files.

## Changes

### 1. Homepage Product Grid Cards (`src/components/home/ProductGrid.tsx`, ~line 73-80)

**Container (Link):** Add `style={{aspectRatio: '4/5'}}` and keep `overflow-hidden bg-[#F8F5E9]`
- From: `className="block relative overflow-hidden bg-[#F8F5E9] mb-5"`
- To: `className="block relative overflow-hidden bg-[#F8F5E9] mb-5" style={{aspectRatio: '4/5'}}`

**Image (line ~77):**
- From: `className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"`
- To: `className="w-full h-full object-cover object-center transition-transform duration-700 group-hover:scale-105"`

### 2. Product Detail — Main Image (`src/pages/ProductDetail.tsx`, ~line 149)

Already `w-full h-auto block` — just confirm it stays as-is. No change needed.

### 3. Product Detail — Thumbnails (`src/pages/ProductDetail.tsx`, ~line 163 + 170)

**Thumbnail button (~line 163):** Add `style={{aspectRatio: '4/5'}}`, keep `w-20 overflow-hidden bg-[#F8F5E9]`

**Thumbnail image (~line 170):**
- From: `className="w-full h-auto block"`
- To: `className="w-full h-full object-cover object-center"`

## Summary
4 line changes across 2 files. Main detail image untouched.

