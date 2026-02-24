

# Subtle Scroll Reveal Animations

## Overview
Add elegant, understated fade-and-rise animations that trigger as sections scroll into view. Uses the browser's native IntersectionObserver for smooth, performant animations -- no extra libraries needed. The effect is a gentle upward drift with opacity change, consistent with the luxury brand aesthetic.

## Approach
Create a single reusable hook (`useScrollReveal`) that attaches to any element. When the element enters the viewport, it transitions from slightly below and transparent to its final position. Each section gets a small stagger delay so content flows in naturally rather than all at once.

## Changes

### 1. New Hook: `src/hooks/use-scroll-reveal.ts`
- Custom hook using `IntersectionObserver` with a 10% threshold
- Returns a `ref` to attach to any element
- Applies a CSS class (`scroll-revealed`) when the element enters the viewport
- Triggers only once per element (no re-animation on scroll back up)

### 2. CSS: `src/index.css`
Add two small utility classes:
- `.scroll-reveal` -- initial state: `opacity: 0; transform: translateY(24px)`
- `.scroll-revealed` -- final state: `opacity: 1; transform: translateY(0)` with a `0.7s cubic-bezier` transition
- Respects `prefers-reduced-motion` by disabling the animation for accessibility

### 3. Apply to Homepage Sections
Each section heading block and content grid gets the reveal treatment:
- **ProductGrid** -- section title block + product grid
- **CategoryCards** -- section title block + category grid
- **FeaturedCarousel** -- section title block + carousel content
- **Newsletter** -- entire inner content block
- **YouMayAlsoLike** -- section title + product grid

### 4. Apply to Product Detail Page
- Product info column (right side) fades in on load
- "You May Also Like" section reveals on scroll

## Technical Details

**Hook usage pattern** (same in every component):
```tsx
import { useScrollReveal } from "@/hooks/use-scroll-reveal";

const titleRef = useScrollReveal();
const contentRef = useScrollReveal();

<div ref={titleRef} className="scroll-reveal text-center mb-16">
  ...heading...
</div>
<div ref={contentRef} className="scroll-reveal grid ...">
  ...content...
</div>
```

**CSS additions** (in `src/index.css`):
```css
.scroll-reveal {
  opacity: 0;
  transform: translateY(24px);
  transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
              transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
}
.scroll-revealed {
  opacity: 1;
  transform: translateY(0);
}
@media (prefers-reduced-motion: reduce) {
  .scroll-reveal { opacity: 1; transform: none; transition: none; }
}
```

**Performance notes:**
- No JavaScript animation frames -- purely CSS transitions triggered by a class toggle
- IntersectionObserver is extremely lightweight
- `will-change` is intentionally not used to avoid layer promotion overhead
- Each observer disconnects after triggering (fires once)

## Files Modified
1. `src/hooks/use-scroll-reveal.ts` (new)
2. `src/index.css` (add 2 utility classes)
3. `src/components/home/ProductGrid.tsx`
4. `src/components/home/CategoryCards.tsx`
5. `src/components/home/FeaturedCarousel.tsx`
6. `src/components/home/Newsletter.tsx`
7. `src/components/product/YouMayAlsoLike.tsx`

