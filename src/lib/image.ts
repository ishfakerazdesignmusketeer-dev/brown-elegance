export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality: number = 75
): string {
  if (!url) return '';
  if (!url.includes('supabase.co/storage/v1/object/public/')) return url;
  const transformUrl = url.replace(
    '/storage/v1/object/public/',
    '/storage/v1/render/image/public/'
  );
  return `${transformUrl}?width=${width}&quality=${quality}&format=webp`;
}
