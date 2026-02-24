
# Website Performance Optimization Plan

## Problems Found

### 1. CSS `content-visibility: auto` on ALL images (THE MAIN CULPRIT)
In `src/index.css`, there's a global rule:
```css
img {
  content-visibility: auto;
}
```
This tells the browser to skip rendering images that are off-screen. When you scroll away, the browser **discards** the rendered image. When you scroll back, it has to **re-decode and re-paint** it -- causing the "reload" flash you're seeing. This is great for long lists of hundreds of items, but destructive for a landing page with only a handful of images.

### 2. Image optimization does nothing for your images
The `getImageUrl()` function only transforms Supabase storage URLs. Your product images are hosted on **Cloudflare R2** (`pub-12652926770d4b41b09dd22412430496.r2.dev`) and category images on **ibb.co**. These URLs pass through completely untouched -- no resizing, no compression. The browser downloads the full original file every time.

### 3. Favicon is 2.7 MB
The `favicon.png` file is **2,735 KB**. A favicon should be under 10 KB. This single file is larger than all your JavaScript combined and loads on every page.

### 4. No hero image preloading
The first hero image (largest element on screen) only starts loading after React mounts, queries the database, and renders. There's no `<link rel="preload">` to give the browser a head start.

---

## The Fix (4 changes)

### Step 1: Remove the global `content-visibility: auto` from images
**File:** `src/index.css`

Remove the `img { content-visibility: auto; }` rule. This single change fixes the "images reload when scrolling back" problem entirely.

### Step 2: Compress the favicon
**File:** `public/favicon.png`

Resize to 64x64 pixels and compress to PNG (target: under 10 KB). This saves ~2.7 MB on every page load.

### Step 3: Preload the first hero image
**File:** `index.html`

Add a `<link rel="preload">` for the first hero slide image so the browser starts downloading it immediately, before React even boots. This shaves seconds off the perceived load time. Since the hero image URL comes from the database, we'll add preload dynamically in the HeroCarousel component using a `useEffect` that injects a `<link rel="preload">` tag into `<head>` for the first slide's image.

### Step 4: Add proper lazy loading boundaries
**File:** `src/components/home/ProductGrid.tsx`, `src/components/home/CategoryCards.tsx`

Keep `loading="lazy"` on below-the-fold images (product grid, category cards) but ensure hero carousel images use `loading="eager"` (already done for index 0). No `content-visibility` anywhere.

---

## Technical Details

| Change | File | What |
|--------|------|------|
| Remove content-visibility | `src/index.css` | Delete the `img { content-visibility: auto; }` rule |
| Compress favicon | `public/favicon.png` | Resize to 64x64, compress (~10 KB) |
| Preload hero image | `src/components/home/HeroCarousel.tsx` | Add dynamic `<link rel="preload">` for first slide |
| Lazy load below-fold | `src/components/home/ProductGrid.tsx` | Change product images from `loading="eager"` to `loading="lazy"` |

### Expected Impact
- No more "image reload" flashing when scrolling back to products
- ~2.7 MB less data on every page load (favicon)
- Hero image starts loading ~1-2 seconds earlier (preload)
- Below-fold images don't compete with hero for bandwidth (lazy loading)
