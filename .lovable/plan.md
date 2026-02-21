
# Fix Product Image Display — Natural Sizing

Remove all fixed aspect ratios, object-fit, and object-position constraints. Let images display at their natural dimensions.

## Changes

### 1. Product Grid Cards (`src/components/home/ProductGrid.tsx`)

**Line 73** — Link wrapper: remove `aspect-[3/4]` and change to block layout
- From: `className="block relative aspect-[3/4] overflow-hidden bg-[#F8F5E9] mb-5"`
- To: `className="block relative overflow-hidden bg-[#F8F5E9] mb-5"`

**Line 77** — Image: strip object-fit/position, use natural height
- From: `className="w-full h-full object-cover object-top transition-transform duration-700 group-hover:scale-105"`
- To: `className="w-full h-auto block transition-transform duration-700 group-hover:scale-105"`

**Line 84** — Quick Add overlay: keep `absolute inset-0` overlay (it will still work over the naturally-sized image)

### 2. Product Detail — Main Image (`src/pages/ProductDetail.tsx`)

**Line 145** — Container div: remove `aspect-[3/4]`
- From: `className="aspect-[3/4] overflow-hidden bg-[#F8F5E9] mb-3"`
- To: `className="overflow-hidden bg-[#F8F5E9] mb-3"`

**Line 149** — Image: natural sizing
- From: `className="w-full h-full object-cover object-top"`
- To: `className="w-full h-auto block"`

### 3. Product Detail — Thumbnails (`src/pages/ProductDetail.tsx`)

**Line 163** — Thumbnail button: change from fixed `w-16 h-20` to `w-20` with auto height
- From: `` className={`w-16 h-20 overflow-hidden bg-[#F8F5E9] ...`} ``
- To: `` className={`w-20 overflow-hidden bg-[#F8F5E9] ...`} ``

**Line 170** — Thumbnail image: natural sizing
- From: `className="w-full h-full object-cover object-top"`
- To: `className="w-full h-auto block"`

## Summary
7 class changes across 2 files. No logic, layout, or structural changes.
