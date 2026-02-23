

# Add Optional Email Authentication to Brown House

A comprehensive authentication system that keeps guest checkout intact while adding account features for returning customers and admin email-based dashboard access.

## Database Changes

### 1. Create `profiles` table
```sql
CREATE TABLE public.profiles (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name text,
  phone text,
  default_address text,
  default_city text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own profile" ON public.profiles
  FOR SELECT USING (id = auth.uid());

CREATE POLICY "Users can update own profile" ON public.profiles
  FOR UPDATE USING (id = auth.uid());

CREATE POLICY "Users can insert own profile" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());
```

### 2. Auto-create profile on signup (trigger)
```sql
CREATE OR REPLACE FUNCTION public.create_profile_on_signup()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name)
  VALUES (NEW.id, NEW.raw_user_meta_data->>'full_name');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.create_profile_on_signup();
```

### 3. Add `user_id` column to orders
```sql
ALTER TABLE public.orders ADD COLUMN IF NOT EXISTS user_id uuid REFERENCES auth.users(id);
```

### 4. Insert `admin_email` setting
```sql
INSERT INTO public.admin_settings (key, value)
VALUES ('admin_email', 'houseofbrown.global@gmail.com')
ON CONFLICT (key) DO NOTHING;
```

## New Files

### 1. `src/contexts/AuthContext.tsx`
- AuthProvider wrapping the app
- Manages user state via `supabase.auth.onAuthStateChange` (set up BEFORE `getSession`)
- Fetches `admin_email` from `admin_settings` table
- Compares logged-in user's email to determine `isAdmin`
- Exposes: `user`, `isAdmin`, `isLoading`, `signIn`, `signUp`, `signOut`

### 2. `src/components/AuthModal.tsx`
- Dialog with two tabs: Sign In / Sign Up
- Sign In: email, password, forgot password link, "continue as guest" option
- Sign Up: full name, email, password, confirm password
- Post-signup: "Check your email to confirm" message
- Forgot password calls `resetPasswordForEmail` with redirect to `/reset-password`
- Styled with cream bg, Cormorant heading, minimal inputs

### 3. `src/pages/ResetPassword.tsx`
- Checks for `type=recovery` in URL hash
- Form to set new password via `supabase.auth.updateUser`
- Public route

### 4. `src/pages/MyOrders.tsx`
- Protected route (redirect to `/` if not logged in)
- Queries orders where `user_id = auth.uid()`
- Shows order cards with number, date, items, total, status badge
- Empty state with "Start Shopping" link

### 5. `src/pages/MyProfile.tsx`
- Protected route
- Form: full name, email (read-only), phone, default address, default city
- Reads/writes to `profiles` table
- Save button updates profile

## Modified Files

### 1. `src/App.tsx`
- Wrap with `<AuthProvider>`
- Add routes: `/my-orders`, `/my-profile`, `/reset-password`

### 2. `src/components/layout/Navigation.tsx`
- User icon behavior changes based on auth state:
  - **Not logged in**: clicking opens AuthModal
  - **Logged in**: clicking opens dropdown with: greeting, My Orders, My Profile, Admin Dashboard (if isAdmin), Sign Out
- Same behavior in mobile menu sidebar

### 3. `src/pages/Checkout.tsx`
- If logged in with profile data, pre-fill form fields (name, phone, address, city)
- On order submit, include `user_id` in the order insert
- After successful guest order, show subtle "Create an account to track orders" banner

### 4. `src/pages/admin/AdminSettings.tsx`
- Add `admin_email` to the ordered keys and SETTING_META

### 5. `src/components/admin/AdminLayout.tsx`
- If user is logged in and `isAdmin`, auto-set `sessionStorage` admin auth (skip password gate)

## Technical Details

- Email confirmation is required (no auto-confirm) per security guidelines
- Auth state listener (`onAuthStateChange`) is set up before `getSession()` call
- Profile creation is handled server-side via trigger (no client race conditions)
- Orders RLS keeps existing anon INSERT policy; adds user-specific SELECT policy
- Guest checkout flow remains completely unchanged for non-authenticated users

