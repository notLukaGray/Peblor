type PageProtectionMeta = {
  visibility?: string;
  passwordProtected?: boolean;
  robots?: string;
  sitemap?: unknown;
};

export function isPageProtected(meta: PageProtectionMeta | null | undefined): boolean {
  if (!meta) return false;
  return meta.passwordProtected === true || meta.visibility === "protected";
}

export function isPageListed(meta: PageProtectionMeta | null | undefined): boolean {
  if (!meta) return true;
  return meta.visibility !== "unlisted";
}

export function isPageIndexable(meta: PageProtectionMeta | null | undefined): boolean {
  if (!meta) return true;
  if (isPageProtected(meta)) return false;
  if (!isPageListed(meta)) return false;
  if (typeof meta.robots === "string" && meta.robots.toLowerCase().includes("noindex"))
    return false;
  return meta.sitemap !== false;
}
