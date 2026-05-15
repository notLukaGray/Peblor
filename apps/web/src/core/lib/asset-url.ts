export function resolveAssetUrl(url: string, base: string): string {
  if (!url || url.startsWith("http://") || url.startsWith("https://")) return url;
  const baseNorm = base.replace(/\/$/, "");
  return baseNorm + (url.startsWith("/") ? url : `/${url}`);
}
