
# Update Product Card Buttons to White Background with Bold Black Text

## Overview
Change all product card action buttons (Add to Cart, View at Studio, Pre-Order) to use a pure white background with bold black text for better visibility on the light cream website.

## Changes

### File 1: `src/components/home/ProductGrid.tsx`

**Desktop buttons (line 130-149):**
- Studio Exclusive button: `bg-foreground text-background` → `bg-white text-black font-bold`
- Add to Cart / Pre-Order button: `bg-cream text-foreground` → `bg-white text-black font-bold`

**Mobile bottom bars (line 152-169):**
- Studio Exclusive bar: `bg-foreground/90 text-background` → `bg-white/90 text-black font-bold`
- Add to Cart / Pre-Order bar: `bg-cream/90 text-foreground` → `bg-white/90 text-black font-bold`

### File 2: `src/pages/Collections.tsx`

**Desktop buttons (line 182-198):**
- Studio Exclusive button: `bg-foreground text-background` → `bg-white text-black font-bold`
- Add to Cart / Pre-Order button: `bg-cream text-foreground` → `bg-white text-black font-bold`

**Mobile bottom bars (line 201-218):**
- Studio Exclusive bar: `bg-foreground/90 text-background` → `bg-white/90 text-black font-bold`
- Add to Cart / Pre-Order bar: `bg-cream/90 text-foreground` → `bg-white/90 text-black font-bold`

## Result
All three button types (Add to Cart, View at Studio, Pre-Order) will have a consistent pure white background with bold black text, making them clearly visible against the light cream (#F8F5E9) product card backgrounds.
