
# Fix 7 Issues: Navbar, Footer, Sizing, XXL, FK Error, Cart Delete, Realtime

## Fix 1 -- Navbar Cleanup

**File: `src/components/layout/Navigation.tsx`**

- Remove "CRAFTSMANSHIP" and "ABOUT" from `navLinks` array (keep only "SHOP" and "CONTACT")
- Remove the Search icon button (lines 156-158)
- Remove `Search` from lucide-react import
- Mobile menu: the `navLinks.slice(1)` loop will automatically only render CONTACT since the others are removed

## Fix 2 -- Footer Modals

**File: `src/components/layout/Footer.tsx`**

- Import `ContactModal` from `@/components/ContactModal`
- Add state: `contactOpen`, `returnPolicyOpen`
- Fetch `return_policy_content` from `admin_settings` (same query pattern as ProductDetail)
- In `renderLinkCol`, detect links by label:
  - "Contact Us" -> render as `<button>` that sets `contactOpen = true`
  - "Return Policy" -> render as `<button>` that sets `returnPolicyOpen = true`
  - All other links render as `<a>` (unchanged)
- Render `<ContactModal>` at bottom
- Render a `<Dialog>` for Return Policy (same pattern as ProductDetail -- simple dialog with the policy content rendered as paragraphs)
- Import Dialog components from `@/components/ui/dialog`

## Fix 3 -- Pant Sizing System

Create a shared utility to avoid duplication:

**New file: `src/lib/sizes.ts`**
```typescript
export const isPant = (category?: string | null) =>
  /pant|flare/i.test(category || '');

export const getSizes = (category?: string | null) =>
  isPant(category)
    ? ['29','30','31','32','33','34','35','36']
    : ['S','M','L','XL'];

export const SIZE_ORDER = ['S','M','L','XL','29','30','31','32','33','34','35','36'];
```

**Files to update:**

1. **`src/pages/ProductDetail.tsx`**
   - Replace `SIZES_ORDER` with `getSizes(product.category)`
   - Change "Size" label to dynamic: `isPant(product.category) ? "WAIST SIZE" : "SIZE"`

2. **`src/components/cart/AddToCartModal.tsx`**
   - Add `category` to `ProductForModal` interface
   - Replace `SIZES_ORDER` with `getSizes(product.category)`
   - Update callers (ProductGrid, Collections) to pass `category` in the product object

3. **`src/components/admin/ProductPanel.tsx`**
   - Replace static `SIZES` with dynamic `getSizes(category)` based on selected category name
   - When category changes, reinitialize stocks/availability for the new size set
   - Update variant upsert loop to use dynamic sizes
   - Change "Size" header to "Waist Size" when isPant

4. **`src/components/admin/StockOverview.tsx`**
   - Replace `SIZES` with dynamic sizes per product (use product's actual variant sizes from DB, filtered through `getSizes`)

5. **`src/components/admin/CreateOrderPanel.tsx`**
   - Product interface already includes `product_variants` with actual sizes from DB
   - The size buttons already render from `selectedProduct.product_variants` -- just filter out XXL (handled by Fix 4)
   - No structural change needed since it already uses actual DB variants

6. **`src/pages/admin/AdminInventory.tsx`**
   - Replace `SIZE_ORDER` with imported `SIZE_ORDER` from `src/lib/sizes.ts` (removes XXL)

7. **`src/components/home/ProductGrid.tsx`** and **`src/pages/Collections.tsx`**
   - Pass `category` field when setting `modalProduct` for AddToCartModal

## Fix 4 -- Remove XXL Everywhere

This is largely handled by Fix 3 since `getSizes()` returns `['S','M','L','XL']` (no XXL). Specifically:

- `src/pages/ProductDetail.tsx`: uses `getSizes()` which excludes XXL
- `src/components/cart/AddToCartModal.tsx`: uses `getSizes()` which excludes XXL
- `src/components/admin/ProductPanel.tsx`: uses `getSizes()` which excludes XXL
- `src/components/admin/StockOverview.tsx`: remove XXL from SIZES
- `src/pages/admin/AdminInventory.tsx`: remove XXL from SIZE_ORDER
- `src/components/product/SizeChartTable.tsx`: already has no XXL row -- no change needed
- `src/components/admin/CreateOrderPanel.tsx`: renders from DB variants, filter out XXL with `.filter(v => v.size !== 'XXL')`

Existing XXL data in the database is preserved; it's just hidden from all UI surfaces.

## Fix 5 -- Bulk Delete Foreign Key Error

**Database migration:**
```sql
ALTER TABLE abandoned_carts
  DROP CONSTRAINT IF EXISTS abandoned_carts_converted_order_id_fkey;

ALTER TABLE abandoned_carts
  ADD CONSTRAINT abandoned_carts_converted_order_id_fkey
  FOREIGN KEY (converted_order_id)
  REFERENCES orders(id)
  ON DELETE SET NULL;
```

**File: `src/pages/admin/AdminOrders.tsx`**

- In `bulkMutation` delete branch (line 192-194): before deleting orders, null out `abandoned_carts.converted_order_id` and delete related `order_items` and `order_notes`
- In `deleteMutation` (line 214-218): same -- null out abandoned_carts reference, delete order_items and order_notes before deleting the order

## Fix 6 -- Abandoned Cart Delete

**File: `src/pages/admin/AdminAbandonedCarts.tsx`**

Add single and bulk delete functionality:

- Add state: `selectedIds: Set<string>`, `deleteConfirmIds: string[] | null`
- Add a `deleteMutation` using `useMutation` that deletes from `abandoned_carts` by IDs
- On success: invalidate `admin-abandoned-carts` and `admin-abandoned-count` queries, show toast
- Add RLS policy for DELETE on `abandoned_carts` (via migration) -- currently users can't DELETE
- UI changes:
  - Add checkbox column to table header and each row
  - Add trash icon button on each row (triggers single delete confirmation)
  - Add bulk action bar when items selected: "[X selected] [Delete Selected]"
  - Add `AlertDialog` for delete confirmation
  - On delete success: clear selection, refetch data

**Database migration (same migration as Fix 5):**
- Add DELETE RLS policy for `abandoned_carts`:
```sql
CREATE POLICY "abandoned_carts_anon_delete"
ON public.abandoned_carts FOR DELETE
USING (true);
```

## Fix 7 -- Full Real-Time Dashboard Sync

**File: `src/pages/admin/AdminDashboard.tsx`**

- Add `useEffect` that subscribes to Supabase realtime channels on mount:
  - `dashboard-orders` channel listening to `orders` table changes
  - `dashboard-carts` channel listening to `abandoned_carts` table changes
  - `dashboard-stock` channel listening to `product_variants` table changes
- On any change event: invalidate all dashboard-related queries using `queryClient`
- Clean up channels on unmount
- Remove or reduce `refetchInterval` since realtime handles updates

**File: `src/pages/admin/AdminAbandonedCarts.tsx`**

- Add `useEffect` subscribing to `abandoned_carts` realtime channel
- On change: invalidate `admin-abandoned-carts` query
- Clean up on unmount

**Database migration (same migration):**
- Enable realtime for orders and abandoned_carts tables (product_variants already enabled via stock_history migration):
```sql
ALTER PUBLICATION supabase_realtime ADD TABLE public.orders;
ALTER PUBLICATION supabase_realtime ADD TABLE public.abandoned_carts;
ALTER PUBLICATION supabase_realtime ADD TABLE public.product_variants;
```

---

## Files Summary

| File | Action |
|------|--------|
| `src/lib/sizes.ts` | **Create** -- shared isPant/getSizes/SIZE_ORDER utilities |
| `src/components/layout/Navigation.tsx` | Remove Craftsmanship, About, Search |
| `src/components/layout/Footer.tsx` | Add Contact + Return Policy modal triggers |
| `src/pages/ProductDetail.tsx` | Dynamic sizes, waist size label, remove XXL |
| `src/components/cart/AddToCartModal.tsx` | Add category to interface, dynamic sizes |
| `src/components/home/ProductGrid.tsx` | Pass category to AddToCartModal |
| `src/pages/Collections.tsx` | Pass category to AddToCartModal |
| `src/components/admin/ProductPanel.tsx` | Dynamic sizes based on category |
| `src/components/admin/StockOverview.tsx` | Remove XXL |
| `src/components/admin/CreateOrderPanel.tsx` | Filter out XXL from variant buttons |
| `src/pages/admin/AdminInventory.tsx` | Use shared SIZE_ORDER (no XXL) |
| `src/pages/admin/AdminOrders.tsx` | Fix FK error on delete (null refs first) |
| `src/pages/admin/AdminAbandonedCarts.tsx` | Add delete (single+bulk), realtime |
| `src/pages/admin/AdminDashboard.tsx` | Add realtime subscriptions |
| Database migration | FK ON DELETE SET NULL, DELETE RLS policy, realtime publication |
