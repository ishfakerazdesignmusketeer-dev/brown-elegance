

# Image Performance Optimization

## Overview

Add lazy loading, async decoding, placeholder backgrounds, and Page Visibility API autoplay control across all image-rendering components. Also add a preconnect hint to the Supabase storage domain in `index.html`.

---

## 1. Hero Carousel (`src/components/home/HeroCarousel.tsx`)

**Image attributes:**
- First slide (index 0): `loading="eager"` + `decoding="async"`
- All other slides: `loading="lazy"` + `decoding="async"`

**Placeholder background:**
- Add `bg-[#F8F5E9]` to each slide container div (the one wrapping the `<img>`)

**Page Visibility API -- pause autoplay when tab is hidden:**
- Add a `useEffect` that listens to `document.visibilitychange`
- When `document.hidden` is true, call `emblaApi.plugins().autoplay.stop()`
- When visible again, call `emblaApi.plugins().autoplay.play()`
- Clean up the event listener on unmount

---

## 2. Product Grid (`src/components/home/ProductGrid.tsx`)

**Image attributes:**
- All product images: add `loading="lazy"` + `decoding="async"`

**Placeholder background:**
- The link container already has `bg-muted`; change to `bg-[#F8F5E9]` for the cream placeholder
- The `aspect-[3/4]` container is already in place -- no layout shift changes needed

---

## 3. Collections Page (`src/pages/Collections.tsx`)

Same as Product Grid:
- Add `loading="lazy"` + `decoding="async"` to all product images
- Change link container background to `bg-[#F8F5E9]`

---

## 4. Category Cards (`src/components/home/CategoryCards.tsx`)

- Add `loading="lazy"` + `decoding="async"` to category card images

---

## 5. Product Detail (`src/pages/ProductDetail.tsx`)

- Main image: `loading="eager"` + `decoding="async"` (it's the primary content)
- Thumbnail images: `loading="lazy"` + `decoding="async"`
- Add `bg-[#F8F5E9]` to the main image container

---

## 6. Featured Carousel (`src/components/home/FeaturedCarousel.tsx`)

- Add `loading="lazy"` + `decoding="async"` to the featured story image

---

## 7. `index.html` -- Preconnect

Add before the Google Fonts preconnect:
```html
<link rel="preconnect" href="https://obbwfxknunfyyvfgfocw.supabase.co">
```

Note: Dynamic preloading of the first hero image is complex (requires fetching from DB before React mounts). Instead, the preconnect hint ensures the browser establishes the connection early, and the first slide's `loading="eager"` ensures it loads immediately.

---

## Files Modified

| File | Changes |
|---|---|
| `index.html` | Add preconnect link |
| `src/components/home/HeroCarousel.tsx` | loading/decoding attrs, bg placeholder, visibility API |
| `src/components/home/ProductGrid.tsx` | loading/decoding attrs, cream bg |
| `src/pages/Collections.tsx` | loading/decoding attrs, cream bg |
| `src/components/home/CategoryCards.tsx` | loading/decoding attrs |
| `src/pages/ProductDetail.tsx` | loading/decoding attrs, cream bg |
| `src/components/home/FeaturedCarousel.tsx` | loading/decoding attrs |

