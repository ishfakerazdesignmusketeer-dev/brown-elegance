export function getImageUrl(url: string, width?: number): string {
  if (!url) return '';

  // Only transform URLs that are confirmed Supabase storage
  if (url.includes('.supabase.co/storage/v1/object/public/')) {
    const base = url.replace(
      '/storage/v1/object/public/',
      '/storage/v1/render/image/public/'
    );
    return width ? `${base}?width=${width}&quality=75&format=origin` : url;
  }

  // Return all other URLs (Unsplash, external) completely unchanged
  return url;
}
