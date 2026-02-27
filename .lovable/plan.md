
# Fix: Product Page Scrolls From Footer Upward

## Problem
When navigating to a product page, the page briefly renders at the previous scroll position (often the footer) and then visibly scrolls upward. This happens because `ScrollToTop` uses `useEffect`, which fires **after** the browser paints the frame -- so the user sees the old scroll position first.

## Solution
Two changes to `src/components/ScrollToTop.tsx`:

1. **Switch `useEffect` to `useLayoutEffect`** -- this fires synchronously before the browser paints, so the scroll position resets before the user sees anything.
2. **Use `behavior: "instant"`** on `window.scrollTo` to prevent any visible scroll animation.

### Updated Code
```typescript
import { useLayoutEffect } from "react";
import { useLocation } from "react-router-dom";

const ScrollToTop = () => {
  const { pathname } = useLocation();

  useLayoutEffect(() => {
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
  }, [pathname]);

  return null;
};

export default ScrollToTop;
```

## Why This Works
- `useLayoutEffect` runs synchronously after DOM mutations but **before the browser repaints**, so the scroll position is already at the top when the user first sees the new page.
- `behavior: "instant"` ensures there's no smooth-scroll animation -- it just snaps to the top immediately.

## Files Changed
| File | Change |
|------|--------|
| `src/components/ScrollToTop.tsx` | Replace `useEffect` with `useLayoutEffect`, add `behavior: "instant"` |

One file, two-line change. No other files affected.
