
# Remove Pathao Integration + Improve Order Management UX

## Part 1: Remove All Pathao Integration

### Database Migration
Drop Pathao-specific columns from `orders` table and clean up `admin_settings`:

```sql
ALTER TABLE orders 
  DROP COLUMN IF EXISTS pathao_consignment_id,
  DROP COLUMN IF EXISTS pathao_status,
  DROP COLUMN IF EXISTS pathao_sent_at,
  DROP COLUMN IF EXISTS item_weight,
  DROP COLUMN IF EXISTS item_description,
  DROP COLUMN IF EXISTS recipient_city_id,
  DROP COLUMN IF EXISTS recipient_zone_id,
  DROP COLUMN IF EXISTS recipient_area_id,
  DROP COLUMN IF EXISTS delivery_type,
  DROP COLUMN IF EXISTS amount_to_collect;
```

Data cleanup (via insert tool):
```sql
DELETE FROM admin_settings WHERE key IN (
  'pathao_client_id', 'pathao_client_secret', 'pathao_username',
  'pathao_password', 'pathao_store_id', 'pathao_sender_phone',
  'pathao_access_token', 'pathao_refresh_token', 'pathao_token_expires_at'
);
```

### Files to Delete
- `src/lib/pathaoApi.ts`
- `src/components/admin/PathaoLocationModal.tsx`

### Files to Modify

**`src/pages/admin/AdminSettings.tsx`**
- Remove Pathao import, all pathao state variables, `handlePathaoConnect`, `handlePathaoTest`
- Remove `pathaoKeys` array and the entire "Pathao Courier Integration" section (lines 247-307)
- Remove pathao entries from `SETTING_META`
- Remove `showPathaoPasswords` state

**`src/pages/admin/AdminOrders.tsx`** -- Major rewrite
- Remove all Pathao imports and related state (`sendingPathao`, `isSyncing`, `pathaoModalOrder`, `bulkPathaoModal`, `bulkPathaoProgress`)
- Remove auto-poll `useEffect` (lines 188-221)
- Remove `handleSendToPathao` and `handleBulkPathao` functions
- Remove `renderCourierCell` function
- Remove Courier column from table header and rows
- Remove "Send to Pathao" bulk action option
- Remove syncing indicator and bulk pathao progress bar
- Remove PathaoLocationModal usage
- Remove Pathao-related fields from `Order` interface
- Update `STATUS_LIST` to only: `pending`, `processing`, `confirmed`, `completed`, `cancelled`, `refunded`
- Change eye button to open order detail modal instead of navigating
- Change order number click to open modal instead of navigating

**`src/pages/admin/AdminOrderDetail.tsx`** -- Major rewrite into modal component
- Remove all Pathao imports and functions (`handleSendToPathao`, `handleRefreshPathaoStatus`)
- Remove Pathao-related state (`showPathaoModal`, `refreshingStatus`, `sendingToPathao`)
- Remove PathaoLocationModal usage
- Remove shipping label section
- Remove `handlePrintLabel`
- Remove entire Courier card from right column (lines 588-709)
- Remove Pathao buttons ("Send to Pathao Courier") from courier section
- Update `STATUS_LIST` to match reduced set

**`src/pages/admin/AdminDashboard.tsx`**
- Remove `pathao_consignment_id`, `pathao_status`, `pathao_sent_at` from Order interface
- Remove courier stats computation (lines 166-173: `pendingDispatch`, `inTransitCount`, `deliveredToday`, `returnedCount`)
- Remove entire "Courier Overview" grid section (lines 258-277)
- Remove courier-related entries from `STATUS_COLORS_HEX`, `STATUS_COLORS`, `STATUS_OPTIONS`
- Update to reduced status set

**`src/components/admin/AdminLayout.tsx`**
- Remove Courier nav item from `navItems` (line 21)
- Remove `courierTodayCount` query and prop

**`src/App.tsx`**
- Remove AdminCourier import and route (lines 34, 89)
- Remove AdminOrderDetail route (line 83) -- order detail will be a modal within AdminOrders

**`src/pages/admin/AdminCourier.tsx`** -- Delete entirely (can keep as it uses `courier_bookings` table, not Pathao, but user said to remove courier page)

**`src/components/admin/CreateOrderPanel.tsx`**
- No Pathao fields to remove (it doesn't have Pathao fields)

---

## Part 2: Create Order Modal

### Convert `CreateOrderPanel` from Sheet to Dialog
Replace the `Sheet` component with a centered `Dialog` modal:
- Max-width 720px, rounded-xl
- Fixed header: "Create New Order" with subtitle
- Scrollable body with sections separated by dividers
- Fixed footer with live total and Cancel/Create Order buttons

### Section Changes
1. **Order Source**: Convert to pill buttons with emoji icons instead of dropdown
2. **Customer Info**: Two-column grid on desktop. Add District dropdown (Bangladesh districts list) and Thana dropdown (loads based on district -- hardcoded common thanas per district)
3. **Products**: Same search + size + qty flow, but show product thumbnails in the items list
4. **Payment**: Convert to pill button selectors instead of dropdowns

### Footer
- Left side: "Total: (amount)" updating live
- Right side: Cancel button + Create Order button

---

## Part 3: Order Detail Modal

### New Component: `src/components/admin/OrderDetailModal.tsx`
A large modal (max-width 900px) opened from the orders list when clicking the eye icon or order number. Two-column layout.

### Left Column (60%)

**Pathao Quick Copy Section** (light blue/indigo background box)
- Title: "Pathao Entry -- Copy & Paste"
- 9 copy cards in order: Recipient Name, Phone, Address, City (district), Zone/Thana, Amount to Collect, Item Description (auto-generated), Item Quantity, Merchant Order ID
- Each card: clickable anywhere to copy, shows "Copied!" feedback for 2 seconds
- "Copy All as Text" button at bottom -- copies formatted multi-line text

**Order Items Table** -- same as current detail page

**Order Notes** -- timeline + add note form

### Right Column (40%)
- **Order Status**: dropdown + Update button
- **Customer Details**: name, phone, address (read-only display)
- **Shipping Address**: address, district fields
- **Payment**: method + status (editable dropdowns)
- **Order Meta**: order ID, source, date, delivery zone

### Modal Header
- Left: Order number + status badge
- Right: Print Invoice button + Close button

### Integration with AdminOrders
- Add `selectedOrderId` state to `AdminOrders`
- Eye button and order number click both set `selectedOrderId`
- Render `OrderDetailModal` when `selectedOrderId` is set
- On close, clear `selectedOrderId` and refetch orders

### Keep AdminOrderDetail Page
Keep the route `/admin/orders/:id` working as a fallback (direct URL access), but the primary UX path is via the modal from the list.

---

## Technical Summary

| File | Action |
|------|--------|
| `src/lib/pathaoApi.ts` | Delete |
| `src/components/admin/PathaoLocationModal.tsx` | Delete |
| `src/pages/admin/AdminCourier.tsx` | Delete |
| `src/components/admin/OrderDetailModal.tsx` | Create -- new modal component |
| `src/pages/admin/AdminOrders.tsx` | Rewrite -- remove Pathao, add modal integration |
| `src/pages/admin/AdminOrderDetail.tsx` | Simplify -- remove all Pathao code, keep as standalone page |
| `src/pages/admin/AdminDashboard.tsx` | Simplify -- remove courier stats section |
| `src/pages/admin/AdminSettings.tsx` | Simplify -- remove Pathao section |
| `src/components/admin/AdminLayout.tsx` | Remove courier nav item |
| `src/components/admin/CreateOrderPanel.tsx` | Convert from Sheet to Dialog modal with improved UX |
| `src/App.tsx` | Remove courier route |
| DB Migration | Drop 10 Pathao columns from orders |
| DB Data cleanup | Delete 9 Pathao keys from admin_settings |
