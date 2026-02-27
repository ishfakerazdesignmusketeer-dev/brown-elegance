
Goal: make Size Chart and Return Policy behave as true on-screen modals that appear immediately in the current viewport (desktop + mobile), with backdrop-click dismissal, without any “scroll down to find modal” behavior.

What I found:
1. In `src/pages/ProductDetail.tsx`, both overlays are currently rendered with `fixed inset-0` and should normally center in viewport.
2. The page root has `className="... page-transition"` (`ProductDetail.tsx`, line around 273).
3. In `src/index.css`, `.page-transition` animates with `transform: translateY(...)`.
4. A transformed ancestor can create a containing block for `position: fixed` descendants, which explains why the modal can appear centered relative to the long page content instead of the visible screen on some devices/browsers.
5. That matches your symptom exactly: customer clicks near top section but modal appears “in middle of full page,” and on mobile it feels like it goes to footer area.

Implementation approach:
Use the existing shared Dialog primitive (already in codebase) for both Size Chart and Return Policy. The Dialog content renders in a portal, so it is no longer affected by transformed ancestors in the product page tree.

Planned code changes:

1) Update imports in `src/pages/ProductDetail.tsx`
- Add:
  - `Dialog`
  - `DialogContent`
  - `DialogHeader`
  - `DialogTitle`
  from `@/components/ui/dialog`
- Keep existing state (`sizeChartOpen`, `returnPolicyOpen`).
- Remove now-unneeded manual close icon import if it becomes unused (`X`).

2) Replace custom Size Chart modal block
- Remove current custom structure:
  - `<div className="fixed inset-0 ...">`
  - manual backdrop
  - manual stopPropagation container
- Replace with:
  - `<Dialog open={sizeChartOpen} onOpenChange={setSizeChartOpen}>`
  - `<DialogContent ...>` with max width/height constraints (`max-w-md`, `max-h-[80vh]`, `overflow-auto`)
  - Header via `DialogHeader` + `DialogTitle`
  - Existing size chart content/image body preserved
- Keep trigger behavior as-is (`setSizeChartOpen(!sizeChartOpen); setReturnPolicyOpen(false)`).

3) Replace custom Return Policy modal block
- Same migration to Dialog structure:
  - `<Dialog open={returnPolicyOpen} onOpenChange={setReturnPolicyOpen}>`
  - `<DialogContent ...>`
  - `DialogHeader` + `DialogTitle`
  - Existing policy text body preserved
- Keep trigger behavior as-is (`setReturnPolicyOpen(!returnPolicyOpen); setSizeChartOpen(false)`).

4) Remove manual modal event plumbing no longer needed
- Remove the Escape-key `useEffect` in `ProductDetail.tsx` since Dialog handles Escape + backdrop click automatically and consistently.
- Ensure no stale handlers remain.

5) Optional stabilization if animation still interferes
- If needed after verification, add a guard class strategy:
  - Temporarily disable `.page-transition` transform while either dialog is open.
- This is likely unnecessary once using portalized Dialog, but I’ll keep it as fallback.

Why this will fix your exact issue:
- Portalized Dialog is rendered outside the transformed product page container.
- So modal positioning is tied to the actual viewport, not page document height.
- On mobile, tapping Size Chart/Return Policy opens modal immediately “in front of user,” not near footer.
- Backdrop tap closes instantly (your requested behavior).

Behavior after implementation:
- Click Size Chart -> modal appears on current screen, centered in viewport.
- Click Return Policy -> same.
- Click dark background -> closes.
- Press Escape (desktop) -> closes.
- No forced scroll, no “searching” for the modal location.

Files to update:
- `src/pages/ProductDetail.tsx` (main change)
- `src/index.css` unchanged for this fix unless fallback tweak is required.

Verification checklist:
1. Desktop on `/product/jakti-storm`: open both modals from top section and confirm immediate on-screen display.
2. Mobile viewport: open both modals while scrolled at various positions; confirm they still appear in current viewport.
3. Confirm backdrop click closes both.
4. Confirm no page jump/scroll shift when opening/closing.
5. Confirm only one modal can be open at a time.

Technical notes:
- This aligns with existing project patterns (`ContactModal` already uses shared Dialog components).
- It reduces custom modal logic and removes brittle manual event handlers.
- It preserves current data fetching and content rendering.
