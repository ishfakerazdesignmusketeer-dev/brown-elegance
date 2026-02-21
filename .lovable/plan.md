
# Add Hover Effects to Product Pages

Two hover effects: second-image fade on homepage cards, and zoom-follow-mouse on product detail main image.

## Changes

### 1. Homepage Product Grid — Second Image Fade (`src/components/home/ProductGrid.tsx`)

**Lines 73-83** — Replace the single image with two stacked absolute images inside the existing container:

- Keep the Link wrapper with `relative overflow-hidden bg-[#F8F5E9]` and `style={{aspectRatio: '4/5'}}`
- First image: `absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ease-in-out group-hover:opacity-0`
- Second image (only if `product.images?.[1]` exists): `absolute inset-0 w-full h-full object-cover object-center transition-opacity duration-500 ease-in-out opacity-0 group-hover:opacity-100`
- Remove the old `transition-transform duration-700 group-hover:scale-105` from the image (replaced by the fade effect)
- The Quick Add overlay (lines 84-95) stays unchanged
- The parent div already has `className="group"` — no change needed

### 2. Product Detail — Zoom on Hover (`src/pages/ProductDetail.tsx`)

**Line 45** — Add two new state variables after `mainImage`:
```
const [zoom, setZoom] = useState(false);
const [pos, setPos] = useState({ x: 50, y: 50 });
```

**Add a handler** (after `handleAddToCart` or near image section):
```
const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
  const rect = e.currentTarget.getBoundingClientRect();
  const x = ((e.clientX - rect.left) / rect.width) * 100;
  const y = ((e.clientY - rect.top) / rect.height) * 100;
  setPos({ x, y });
};
```

**Lines 145-156** — Replace main image container:
- Container div: add `cursor-zoom-in`, `style={{ aspectRatio: '4/5' }}`, and mouse event handlers (`onMouseEnter`, `onMouseLeave`, `onMouseMove`)
- Image: change to `w-full h-full object-cover object-center transition-transform duration-200 ease-out` with inline `style={{ transform: zoom ? 'scale(2)' : 'scale(1)', transformOrigin: ... }}`
- Remove `width`/`height`/`decoding`/`onError` attributes that conflict, keep `loading="eager"`
- Add `draggable={false}` to prevent drag interference

Thumbnails (lines 157-180) remain completely unchanged.

## Summary
- `ProductGrid.tsx`: Replace single image with two stacked images for fade effect (~10 lines changed)
- `ProductDetail.tsx`: Add zoom state + mouse handler + update main image container (~20 lines changed)
- No other files or styling affected
