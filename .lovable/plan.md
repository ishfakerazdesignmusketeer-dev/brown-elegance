

# Replace Image-Based Size Chart with Styled HTML Tables

## Overview
Replace the current image-based size chart modal with a rich HTML table that shows different data depending on the product's category. The table will be styled to match the Brown House brand aesthetic.

## What Changes

### 1. Size Chart Component (`src/components/product/SizeChartTable.tsx` -- NEW)

A new reusable component that renders the appropriate size chart based on the product category name:

- **Detection logic**: If category name contains "pant" or "flare" (case-insensitive), show Flare Pant chart. Otherwise, default to Panjabi chart.
- **Panjabi chart**: 6 columns (Label Size, Standard Size, Length, Chest, Collar, Sleeve Length), 4 rows (S/M/L/XL).
- **Flare Pant chart**: 5 columns (Waist, Length, Leg Opening, Thigh, High), 8 rows (29-36).
- **Styling**: Brand-matched table with espresso header (#2C1810 with white text), alternating row colors (#FAFAF8 / white), subtle borders (#E8E3DD), bold first column, tabular-nums, italic note in muted brown (#8B7355).

### 2. Update `src/pages/ProductDetail.tsx`

- **Remove** the `sizeChartUrl` query (no longer fetching an image URL from admin_settings).
- **Remove** the `sizeChartUrl` guard on the Size Chart button -- always show the button since data is hardcoded.
- **Replace** the image-based Dialog content with `<SizeChartTable categoryName={category?.name} />`.
- **Update** the Dialog `open` prop from `sizeChartOpen && !!sizeChartUrl` to just `sizeChartOpen`.
- Return Policy modal remains completely unchanged.

## Technical Details

**SizeChartTable component structure:**
```text
+-----------------------------------------------+
| Title: "Size Chart" or "Flare Pant Size Chart" |
+-----------------------------------------------+
| Header row: #2C1810 bg, white text, semibold   |
|-----------------------------------------------|
| Data rows: alternating #FAFAF8 / white         |
| First column: bold, espresso color             |
| All numbers: tabular-nums, center-aligned      |
|-----------------------------------------------|
| Note: italic, 11px, #8B7355                    |
+-----------------------------------------------+
```

**Files changed:**
| File | Action |
|------|--------|
| `src/components/product/SizeChartTable.tsx` | Create new component |
| `src/pages/ProductDetail.tsx` | Replace image chart with table component, remove sizeChartUrl query |

