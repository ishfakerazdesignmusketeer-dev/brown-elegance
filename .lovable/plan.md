

## Fix Brown Story Section Layout

The video card currently sits flush-left with no centering, making it look unbalanced. The card is also a bit small (270x480px). Here's the fix:

### Changes to `src/components/home/FeaturedCarousel.tsx`

1. **Increase card size** from 270x480px to 320x560px for a more substantial presence
2. **Center the grid content** by adding `items-center` and changing the video column to use `flex justify-center` so the card is centered within its grid cell (not left-aligned)
3. **On mobile**, center the card and allow it to scale nicely
4. **Add subtle styling** to the placeholder card (border, slightly more prominent text) so the "Video coming soon" state looks polished rather than like a leftover element

### Visual Result
- The video card will be centered within the left column instead of hugging the left edge
- Larger card size gives it more visual weight and balance against the text on the right
- The overall section will feel symmetrical and intentional

