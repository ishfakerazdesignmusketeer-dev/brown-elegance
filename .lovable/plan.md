

# Redesign Inventory Page: Grouped Product-First Layout

## Overview
Replace the flat row-per-SKU table with a grouped, expandable product-card layout where each product is a collapsible card containing its size variants as nested rows with inline stock editors.

## What Changes

### File: `src/pages/admin/AdminInventory.tsx` (full rewrite)

#### 1. Data Grouping
- Instead of flattening into `InventoryRow[]`, group variants by product into a `GroupedProduct` structure:
  - `productId`, `productName`, `productImage`, `category`, `sku`
  - `variants[]` (sorted by size order: S, M, L, XL, XXL, then numeric 28-36)
  - Computed: `totalStock`, `lowStockCount`, `outOfStockCount`, `healthStatus`

#### 2. Summary Cards (updated counts)
- **Total SKUs**: still count of all product+size combinations
- **Low Stock Products**: count of products with at least one size at 1-5 units
- **Out of Stock Products**: count of products with at least one size at 0 units
- **Healthy Products**: count of products where ALL sizes are 6+ units

#### 3. Filter Bar (updated)
- Search: filters which product cards show (by product name)
- Stock filter options: All Products | Has Low Stock | Has Out of Stock | All Healthy
- Category filter: unchanged
- Sort options: A-Z | Z-A | Most Critical First (out-of-stock products first, then low stock, then healthy) | Total Stock Low to High
- Add **[Expand All]** and **[Collapse All]** buttons on the right

#### 4. Product Cards (new layout)
Each product renders as a bordered card with:

**Header row:**
- Product thumbnail (40x40, rounded)
- Product name (bold)
- Category badge
- Total stock count (sum of all sizes)
- Alert badges: red "X Out of Stock" / amber "X Low Stock" / green "All Good"
- Collapse/expand chevron
- Left border color: green (all healthy), amber (has low stock), red (has out of stock)

**Variant rows (nested, indented):**
- Background: `#FAFAF8`
- Columns: Size (bold pill) | Stock (color-coded number) | Status badge | Actions

**Actions per variant -- inline stock editor:**
- `[-]` button: decrement by 1 (min 0)
- Editable number input showing current stock
- `[+]` button: increment by 1
- Changes save on blur or Enter key
- Small edit icon opens a "Set Stock" dialog for bulk quantity changes

#### 5. Stock Mutation Logic
- Refactor `addStockMutation` into a `setStockMutation` that accepts an absolute new value (or a delta)
- Reason logged as `'manual_adjustment'` for +/- buttons, `'manual_restock'` for set-stock dialog
- Same query invalidations as before

#### 6. Set Stock Dialog
- Small dialog: "Set Stock for [Product] -- Size [X]"
- Single number input for new stock value
- Cancel / Save buttons
- On save: calculates delta from current stock, updates variant, logs to stock_history

#### 7. Stock History Section
- Completely unchanged -- stays at bottom as collapsible

### Technical Details

**Size ordering constant:**
```text
const SIZE_ORDER = ['S','M','L','XL','XXL','28','29','30','31','32','33','34','35','36'];
```

**Product health classification:**
```text
- "critical": any variant has stock = 0
- "warning": any variant has stock 1-5 (but none at 0)
- "healthy": all variants stock >= 6
```

**Sort "Most Critical First":**
```text
critical products first, then warning, then healthy.
Within same tier: sort by total stock ascending.
```

**State management:**
- `expandedIds: Set<string>` -- tracks which product cards are expanded (default: all)
- `editingVariant: { variantId, productId, productName, size, currentStock } | null` -- for the set-stock dialog
- Remove: `selectedIds`, `bulkAddValue`, `editingId`, `addStockValue` (replaced by inline editors)
- Each variant row manages its own local stock value via controlled input

**Inline stock input behavior:**
- Displays current stock as editable number
- On blur or Enter: if value changed, fire mutation with delta
- `[-]` and `[+]` buttons fire mutation immediately with delta of -1 / +1

## Files Changed
| File | Action |
|------|--------|
| `src/pages/admin/AdminInventory.tsx` | Rewrite with grouped layout |

No database changes needed. No new files needed.
