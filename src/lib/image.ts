export function getOptimizedImageUrl(
  url: string,
  width: number,
  quality: number = 75
): string {
  if (!url || !url.includes("supabase")) return url;
  return (
    url.replace(
      "/storage/v1/object/public/",
      "/storage/v1/render/image/public/"
    ) + `?width=${width}&quality=${quality}&format=webp`
  );
}
