

# Fix 3 Issues on Live Website

## Fix 1 -- OG Image / Social Share Thumbnail

**File: `index.html`**

Update the `<head>` meta tags to replace Lovable branding with Brown House branding:

- Replace the existing `og:image` and `twitter:image` pointing to `lovable.dev/opengraph-image-p98pqg.png` with the hero image URL from R2: `https://pub-12652926770d4b41b09dd22412430496.r2.dev/hero1.webp`
- Add missing OG tags: `og:url`, `og:image:width`, `og:image:height`, `og:site_name`
- Add missing Twitter tags: `twitter:title`, `twitter:description`
- Remove `twitter:site` referencing `@Lovable`
- The `<title>` and `<meta name="description">` are already correct -- no change needed

**Note:** WebP support for OG images is good on WhatsApp/Telegram but inconsistent on older Facebook crawlers. If social previews still don't show, the image may need to be converted to JPG and hosted at a static path like `/og-image.jpg`.

## Fix 2 -- Category Images Not Showing

After investigation, the code and data are both correct:
- The `categories` table has valid `image_url` values (one Supabase storage URL, one ibb.co URL)
- The `CategoryCards` component correctly reads `image_url` and renders it via `LazyImage`
- The conditional logic (`cat.image_url ? <LazyImage> : <gradient placeholder>`) is correct

**No code changes needed.** The category images should be rendering. If they aren't visible, the issue is likely:
1. The images are lazy-loaded (IntersectionObserver with 300px rootMargin) -- they appear on scroll
2. A browser cache issue -- hard refresh should fix it
3. The ibb.co URL may be blocked by some networks

## Fix 3 -- Favicon Not Persisting

The current database shows `favicon_url` row exists but has an empty string value, meaning no favicon has been successfully saved yet. Two issues to fix:

**Issue A: `useDynamicFavicon` doesn't handle JPEG type correctly**
The hook sets `link.type = "image/png"` for non-SVG files, but the BrandingSection only accepts JPEG for favicons. Fix: detect `.jpg`/`.jpeg` and set appropriate MIME type.

**Issue B: Ensure favicon persists by using `upsert` instead of `update`**
The BrandingSection uses `.update()` which could silently fail if there's a key matching issue. Switch to `.upsert({ key, value }, { onConflict: 'key' })` for reliability. This requires a unique constraint on the `key` column.

### Changes:

**Database migration:**
- Add a UNIQUE constraint on `admin_settings.key` if not already present (to support `upsert` with `onConflict`)

**File: `src/hooks/use-dynamic-favicon.ts`**
- Fix MIME type detection: handle `.jpg`/`.jpeg` as `image/jpeg`, `.png` as `image/png`, `.svg` as `image/svg+xml`

**File: `src/components/admin/BrandingSection.tsx`**
- Change `.update({ value: publicUrl }).eq("key", field.key)` to `.upsert({ key: field.key, value: publicUrl }, { onConflict: 'key' })`
- Same for `handleRemove`: use `.upsert({ key: field.key, value: null }, { onConflict: 'key' })`

---

## Files Summary

| File | Action |
|------|--------|
| `index.html` | Update OG/Twitter meta tags |
| `src/hooks/use-dynamic-favicon.ts` | Fix MIME type for JPEG favicons |
| `src/components/admin/BrandingSection.tsx` | Use upsert for reliable save |
| Database migration | Add UNIQUE on admin_settings.key |

No other files touched. No styling changes. No component refactors.

