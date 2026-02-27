
# Fix Size Chart & Return Policy Modal Positioning

## Problem
Both modals use `fixed inset-0` centered overlay which forces users to scroll away from their context on the product page.

## Solution
Replace both full-screen centered modals with inline floating popovers that appear near the trigger buttons, using smart up/down positioning.

### Changes to `src/pages/ProductDetail.tsx`

**1. Add refs and direction state**
- Add `useRef` for both trigger buttons and popover containers
- Add `openDirection` state for each popover ('up' | 'down')
- Add `useEffect` for outside-click detection
- Add `useEffect` for smart positioning (check space above vs below trigger)

**2. Replace Size Chart trigger button (line 429-436)**
- Add `ref={sizeChartTriggerRef}` to the button
- Toggle behavior: `onClick={() => setSizeChartOpen(!sizeChartOpen)}`
- Wrap button in a `relative` container

**3. Replace Size Chart modal (lines 567-593)**
- Remove the full-screen `fixed inset-0` overlay
- Instead, render an inline floating card right after the trigger button inside its relative wrapper
- Styles: `absolute z-50 w-[360px] bg-background rounded-lg shadow-2xl border`
- Position dynamically: `bottom: 100%` (up) or `top: 100%` (down)
- Add `popover-enter` animation class

**4. Replace Return Policy trigger button (line 437-443)**
- Same treatment: add ref, toggle, relative wrapper

**5. Replace Return Policy modal (lines 596-621)**
- Same floating popover pattern, `w-[360px]`
- Content: return policy text with close button header

**6. Mobile behavior (screen < 768px)**
- Use `useIsMobile()` hook (already available)
- On mobile: render as a fixed bottom sheet instead of inline popover
- `fixed bottom-0 left-0 right-0 z-50 rounded-t-xl max-h-[80vh] overflow-auto`
- Slide-up animation
- Light backdrop overlay on mobile only

### CSS additions to `src/index.css`

Add two new animations:
```css
@keyframes popoverIn {
  from { opacity: 0; transform: translateY(6px) scale(0.98); }
  to { opacity: 1; transform: translateY(0) scale(1); }
}
.popover-enter {
  animation: popoverIn 0.15s ease-out forwards;
}

@keyframes slideUp {
  from { transform: translateY(100%); }
  to { transform: translateY(0); }
}
.slide-up-enter {
  animation: slideUp 0.25s ease-out forwards;
}
```

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ProductDetail.tsx` | Replace both modals with inline popovers (desktop) / bottom sheets (mobile) |
| `src/index.css` | Add `popoverIn` and `slideUp` animations |

### Key Behavior
- **Desktop**: Floating card appears anchored near the clicked button, positioned above or below based on available space. Closes on outside click or Escape.
- **Mobile**: Bottom sheet slides up from screen bottom, max 80vh height, scrollable content. Light backdrop, closes on backdrop tap or X button.
- **No page scroll disruption** in either case.
