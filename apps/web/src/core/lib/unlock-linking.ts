import type { SectionBlock } from "@pb/contracts";
import { PROTECTED_PAGE_PATHS } from "@/core/lib/protected-slugs.generated";
import { getModalProps } from "@pb/core/resolve";
import { cdnBase } from "@/core/lib/globals";

export function isUnlockEnabled(): boolean {
  return typeof process.env.SITE_PASSWORD === "string" && process.env.SITE_PASSWORD.length > 0;
}

export function safeRedirectPath(value: unknown): string | null {
  if (typeof value !== "string" || !value.trim()) return null;
  const trimmed = value.trim();
  return trimmed.startsWith("/") && !trimmed.startsWith("//") ? trimmed : null;
}

export function getSingleQueryValue(value: string | string[] | undefined): string | undefined {
  return Array.isArray(value) ? value[0] : value;
}

export function getSafeUnlockPreviewUrl(value: string | undefined): string | null {
  if (!value) return null;
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  if (cdnBase && value.startsWith(cdnBase.endsWith("/") ? cdnBase : cdnBase + "/")) return value;
  return null;
}

export function isProtectedHref(href: string): boolean {
  if (!href.startsWith("/")) return false;
  const pathOnly = href.split("?")[0]?.split("#")[0] ?? href;
  const normalizedPath = pathOnly.replace(/^\/+|\/+$/g, "");
  return PROTECTED_PAGE_PATHS.has(normalizedPath);
}

export function toUnlockModalHref(currentPath: string, redirectHref: string): string {
  const params = new URLSearchParams();
  params.set("unlock_redirect", redirectHref);
  return `${currentPath}?${params.toString()}`;
}

export function rewriteProtectedInternalLinks(
  sections: SectionBlock[],
  currentPath: string
): SectionBlock[] {
  const rewriteUnknown = (value: unknown): unknown => {
    if (Array.isArray(value)) return value.map(rewriteUnknown);
    if (value == null || typeof value !== "object") return value;
    const record = value as Record<string, unknown>;
    const next: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(record)) {
      next[k] = rewriteUnknown(v);
    }
    const href = typeof record.href === "string" ? record.href : null;
    if (
      href &&
      (record.type === "elementLink" || record.type === "elementButton") &&
      isProtectedHref(href)
    ) {
      next.href = toUnlockModalHref(currentPath, href);
    }
    return next;
  };

  return sections.map((section) => rewriteUnknown(section) as SectionBlock);
}

export function injectUnlockRedirect(sections: SectionBlock[], redirect: string): SectionBlock[] {
  return sections.map((block) => {
    if (block.type !== "formBlock" || block.action !== "unlock") return block;
    return { ...block, actionPayload: { ...block.actionPayload, redirect } };
  });
}

export async function buildUnlockModalProps(redirect: string | null, enabled: boolean) {
  if (!enabled || !redirect) return null;
  return getModalProps("unlock", {
    transformSections: (sections) => injectUnlockRedirect(sections, redirect),
  });
}
