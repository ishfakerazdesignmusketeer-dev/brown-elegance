

# Redesign Category Cards Section (Visual Only)

## Scope
Replace only the visual presentation of the category cards in `src/components/home/CategoryCards.tsx`. No changes to data fetching, routing, or any other component/page.

## Changes

### File: `src/components/home/CategoryCards.tsx`
Replace the entire JSX return and remove unused imports (`LazyImage`, `PLACEHOLDER_GRADIENTS`). Add import for `isPant` from `@/lib/sizes.ts` to dynamically determine size labels per category.

**New design:**
- Section header: "Curated Collections" subtitle + "Shop by Category" title + decorative diamond separator
- Two-column grid on desktop (`md:grid-cols-2`), single column on mobile
- Each card: tall (580px desktop, 420px mobile), warm background (`#F0EAE0` / `#EAE4D8` alternating), no images
- Card content: watermark roman numeral, top row with index number + tag (Heritage/Contemporary), centered category name in large serif font (72px desktop, 52px mobile), tagline, bottom row with size info + "Shop Now" CTA with animated line
- Hover effect: background darkens slightly, CTA line extends, text color shifts to gold
- Navigation preserved: wraps each card in existing `<Link to={/collections/${cat.slug}}>` -- unchanged
- Uses `isPant(cat.name)` to dynamically show "Waist Sizes: 29-36" vs "Available Sizes: S-M-L-XL"

### File: `index.html`
The required fonts (Cormorant Garamond and Montserrat) -- Cormorant Garamond is already loaded. Add Montserrat weight 300/400 to the existing Google Fonts preload URL.

## What stays the same
- `useQuery` hook and query key
- Supabase fetch logic
- `Link` component with `to={/collections/${cat.slug}}`
- Category interface
- Loading skeleton pattern
- No other files touched

