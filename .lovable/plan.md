

# Remove Pre-Order Badge from Product Cards

## Change

**File: `src/components/home/ProductGrid.tsx`**

In the `getBadge` function (around line 97), remove the line that returns the "Pre-Order" badge:

```typescript
// DELETE this line:
if (p.is_preorder) return { text: "Pre-Order", className: "bg-amber-500 text-white", position: "top-2 left-2" };
```

This is the only change. Nothing else is modified.

