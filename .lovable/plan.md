

# Fix Admin Authentication System

## Overview
Replace the old password-gate admin login (`/admin/login` + `sessionStorage`) with proper Supabase Auth-based admin protection. Admin access will work through the regular user login flow -- sign in with the admin email, and admin routes become accessible.

## Changes

### 1. Delete `src/pages/admin/AdminLogin.tsx`
Remove the standalone password login page entirely.

### 2. Update `src/App.tsx` -- Route Cleanup
- Remove the `AdminLogin` import and `/admin/login` route
- Change `/admin` redirect from `/admin/login` to `/admin/dashboard`
- Wrap the `AdminLayout` route in a new `AdminRoute` guard component that checks `useAuth().isAdmin`

The admin routes block will look like:
```text
/admin         --> redirect to /admin/dashboard
/admin/*       --> wrapped in AdminRoute (checks isAdmin)
  /dashboard
  /orders
  /products
  ... etc
```

### 3. Create `src/components/admin/AdminRoute.tsx`
A simple guard component:
- Uses `useAuth()` to get `user`, `isAdmin`, `isLoading`
- Shows a loading spinner while auth is loading
- Redirects to `/` if not logged in or not admin
- Renders children (Outlet) if authorized

### 4. Update `src/components/admin/AdminLayout.tsx`
- Remove all `sessionStorage` checks and references
- Remove the `useEffect` that checks `brown_admin_auth`
- Update the sidebar logout button to call `signOut()` from `useAuth()` and navigate to `/`
- Add admin email display in sidebar header (small avatar circle with first letter + email)

### 5. Update `src/components/layout/Navigation.tsx`
- Remove `sessionStorage.setItem("brown_admin_auth", "true")` from `handleAdminClick`
- Simply navigate to `/admin/dashboard` directly

### 6. Delete the Edge Function `supabase/functions/verify-admin-password/index.ts`
No longer needed since we're not using password-gate authentication.

### 7. Add Better Error Logging in `ProductPanel.tsx`
The save mutation already shows errors in toast. Will ensure the actual error message from the database is displayed so issues are visible.

## Security Note
The existing RLS policies already allow `anon` role full access to admin tables (products, product_variants, etc.), so authenticated requests will also work. No RLS migration is needed -- the current policies permit both anon and authenticated access. The admin protection is handled at the application routing level via `AdminRoute`.

## Files Changed
1. **Delete**: `src/pages/admin/AdminLogin.tsx`
2. **Delete**: `supabase/functions/verify-admin-password/index.ts`
3. **Create**: `src/components/admin/AdminRoute.tsx`
4. **Edit**: `src/App.tsx`
5. **Edit**: `src/components/admin/AdminLayout.tsx`
6. **Edit**: `src/components/layout/Navigation.tsx`

