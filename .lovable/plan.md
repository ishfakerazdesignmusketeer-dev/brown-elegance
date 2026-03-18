

# Sales Filters for Orders + Dashboard Sales Calculator

## Changes Overview

Two files to modify, no database changes needed.

---

### 1. AdminOrders.tsx — Add Source, Payment Status, and Payment Method Filters

**Current state**: Only has status tabs, date filter, and search. No filters for source, payment status, or payment method.

**Add 3 new filter dropdowns** in the toolbar area (line ~302-378), alongside the existing date filter:

- **Source filter** (`sourceFilter` state): Options — All Sources, Website, Instagram, Messenger, Phone, Walk-in
- **Payment Status filter** (`paymentStatusFilter` state): Options — All Payment, Paid, Partial, Unpaid
- **Payment Method filter** (`paymentMethodFilter` state): Options — All Methods, COD, bKash, Nagad

Each filter applies to the Supabase query (lines 127-155):
- `sourceFilter !== "all"` → `.eq("source", sourceFilter)`
- `paymentStatusFilter !== "all"` → `.eq("payment_status", paymentStatusFilter)` (handle "unpaid" as `is.null` or `eq`)
- `paymentMethodFilter !== "all"` → `.eq("payment_method", paymentMethodFilter)`

Add a **filtered sales summary bar** above the table showing: total orders in current filter, total revenue, paid amount, unpaid amount — so admin can quickly see sales for any combination of filters.

---

### 2. AdminDashboard.tsx — Add Sales Calculator Section

**Add a new "Sales Calculator" card** after the existing stats rows (around line 254), with:

- Date range picker (today, this week, this month, last month, custom)
- Source filter dropdown
- Payment status filter dropdown
- Display calculated metrics: Total Orders, Total Revenue, Paid Revenue, Unpaid Revenue, Average Order Value

This uses the already-fetched `orders` array, filtered client-side by selected criteria.

---

### Files Changed
- `src/pages/admin/AdminOrders.tsx` — add 3 filter dropdowns + filtered summary bar
- `src/pages/admin/AdminDashboard.tsx` — add sales calculator section

No database or other file changes.

