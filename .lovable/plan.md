
# Add Size Chart Popup to Product Detail Page

## Overview
Add a "Size Chart" button on the product detail page that opens a modal showing a size chart image. The image URL is managed from the admin settings page.

## Database Change
Insert a new row into `admin_settings` with key `size_chart_url` so the admin can configure the size chart image URL.

## File Changes

### 1. `src/pages/admin/AdminSettings.tsx`
- Add `size_chart_url` to `SETTING_META` with label "Size Chart Image URL", placeholder "https://... image URL"
- Add `size_chart_url` to the `orderedKeys` array (before `delivery_charge`)
- Add an image preview below the input when the value is a non-empty URL (small thumbnail with max-height)

### 2. `src/pages/ProductDetail.tsx`
- Add `sizeChartOpen` state (`useState(false)`)
- Fetch `size_chart_url` from `admin_settings` using `useQuery`
- Add a "Size Chart" button next to the "Size" label (inline SVG ruler icon + text, styled as underlined link)
- Add a modal overlay that shows when `sizeChartOpen` is true:
  - Fixed overlay with backdrop blur
  - White card with header (title + close button), scrollable image, and "All measurements are in inches" note
  - Close on: click outside, X button, Escape key
  - Only render the button if `size_chart_url` exists
- Fully responsive on mobile with `max-h-[90vh] overflow-auto`

## Technical Details

**ProductDetail.tsx changes:**
- New query: `useQuery({ queryKey: ["size-chart"], queryFn: ... })` fetching from `admin_settings` where key = `size_chart_url`
- Escape key listener via `useEffect` that listens when modal is open
- Size Chart button placed in the existing size selector header row (next to the "Size" label and stock warning)
- Modal built inline (no separate component needed) matching the user's exact markup

**AdminSettings.tsx changes:**
- Add to `SETTING_META`:
```
size_chart_url: { label: "Size Chart Image URL", placeholder: "https://... image URL" }
```
- Add `"size_chart_url"` to `orderedKeys` array
- Add conditional image preview below the input when key is `size_chart_url` and value is non-empty

**Migration:**
- Insert `size_chart_url` key into `admin_settings` if it doesn't already exist
