

# Fix Size Chart & Return Policy -- Simple Fixed Modal

## Problem
The current popover approach (desktop) and bottom sheet (mobile) are not working well. On mobile, clicking these links scrolls the user to the footer area. The user wants simple fixed modals that appear centered on the current screen with backdrop click to dismiss.

## Solution
Replace ALL the popover/bottom-sheet logic with a simple fixed viewport-centered modal for both desktop and mobile. Click the backdrop to close. This actually **simplifies** the code by removing refs, direction detection, and separate mobile/desktop branches.

### Changes to `src/pages/ProductDetail.tsx`

**1. Remove unnecessary state and refs:**
- Remove `sizeChartDirection`, `returnPolicyDirection` states
- Remove `sizeChartTriggerRef`, `sizeChartPopoverRef`, `returnPolicyTriggerRef`, `returnPolicyPopoverRef` refs
- Remove the smart positioning `useEffect` blocks (lines 144-156)
- Remove the outside-click `useEffect` (lines 126-142)
- Keep Escape key handler (lines 116-123)

**2. Simplify trigger buttons (lines 470-527):**
- Remove the `relative` wrapper divs and refs from both buttons
- Remove the inline desktop popover markup that sits inside the button wrappers
- Keep the buttons as simple toggles

**3. Replace mobile bottom sheets (lines 650-686) with fixed centered modals:**
- Remove the `isMobile` condition -- same modal for all screen sizes
- Render both modals as fixed viewport-centered overlays:

```text
+----------------------------------+
|  Fixed backdrop (bg-black/50)    |
|  click to dismiss                |
|  +----------------------------+  |
|  | Modal card (centered)      |  |
|  | - Header with close button |  |
|  | - Scrollable content       |  |
|  +----------------------------+  |
+----------------------------------+
```

- Desktop: `max-w-md` centered card
- Mobile: `max-w-[95vw]` with `max-h-[80vh]` scrollable content
- Uses existing `popover-enter` animation class
- Positioned with `fixed inset-0 z-50 flex items-center justify-center`

**4. Place modals right before `<Footer />`** to keep them in the normal flow but visually overlay via fixed positioning.

### No CSS changes needed
The existing `popover-enter` animation in `src/index.css` will be reused. The `slide-up-enter` class becomes unused but harmless to keep.

### Files Changed

| File | Change |
|------|--------|
| `src/pages/ProductDetail.tsx` | Replace popovers + bottom sheets with fixed centered modals, remove refs/direction logic |

### Key Behavior
- **Both desktop and mobile**: Fixed centered modal appears over current viewport. No scroll change.
- **Backdrop click**: Dismisses the modal instantly.
- **Escape key**: Also dismisses.
- **Content scrolls** inside the modal if it exceeds max height.
- Much simpler code -- removes ~50 lines of positioning/ref logic.
