
# "You May Also Like" Product Recommendations

## What This Does
Adds a product suggestions section below the main product details on every product page. When a customer views a product, they will see a row of related products to encourage browsing and boost sales.

## How It Works
- Shows up to 4 related products from the **same category** as the current product
- If the product has no category or fewer than 4 category matches, fills remaining slots with other active products (random)
- Each suggested product card shows the image, name, and price -- clicking takes the customer to that product's page
- The section appears between the product details and the footer, with a "You May Also Like" heading

## Technical Details

### New Component: `src/components/product/YouMayAlsoLike.tsx`
- Accepts `productId` and `categoryId` as props
- Queries the `products` table for up to 4 active products in the same category, excluding the current product
- Falls back to random active products if not enough category matches
- Renders a responsive grid (2 columns on mobile, 4 on desktop)
- Each card links to `/product/{slug}` and uses the existing `getImageUrl` and `formatPrice` helpers
- Uses `@tanstack/react-query` with a query key like `["related-products", productId]`

### Edit: `src/pages/ProductDetail.tsx`
- Import and render `<YouMayAlsoLike />` after the `</main>` closing tag, before the size chart modal and `<Footer />`
- Pass `product.id` and `product.category_id` as props

### Styling
- Matches the existing site aesthetic: `font-heading` for the title, `font-body` for price/labels
- Uses the cream background (`bg-cream`) consistent with the rest of the page
- Product cards use a `bg-[#F8F5E9]` image container matching the product detail page style
- Section padding kept consistent with other homepage sections (`py-10 lg:py-14`)
