"use client";

import { useNavigation } from "@pb/runtime-react/core/navigation-context";
import { accessCookieName } from "@/core/lib/auth-constants";
import type { ReactNode } from "react";

type Props = {
  href: string;
  onClick?: (e: React.MouseEvent<HTMLAnchorElement>) => void;
  children?: ReactNode;
  [key: string]: unknown;
};

type PageManifest = {
  route: string;
  tier: "static" | "mixed" | "client";
  protected: boolean;
  criticalAssets: string[];
};

const prefetchedRoutes = new Set<string>();

function injectPreconnect(assetUrl: string): void {
  if (!assetUrl.startsWith("http://") && !assetUrl.startsWith("https://")) return;
  try {
    const origin = new URL(assetUrl).origin;
    if (document.querySelector(`link[rel="preconnect"][href="${origin}"]`)) return;
    const link = document.createElement("link");
    link.rel = "preconnect";
    link.href = origin;
    link.crossOrigin = "anonymous";
    document.head.appendChild(link);
  } catch (err) {
    console.warn("[web] Failed to preconnect to origin (invalid URL)", assetUrl, err);
  }
}

function hasAccessCookie(): boolean {
  if (typeof document === "undefined") return false;
  return document.cookie.split(";").some((c) => c.trim().startsWith(`${accessCookieName}=`));
}

function manifestSlug(href: string): string {
  return href === "/" ? "root" : href;
}

async function fetchManifest(href: string): Promise<PageManifest | null> {
  try {
    const slug = manifestSlug(href);
    const res = await fetch(`/manifests${slug}.json`, { priority: "low" } as RequestInit);
    if (!res.ok) return null;
    return (await res.json()) as PageManifest;
  } catch (err) {
    console.warn("[web] Failed to fetch page manifest", href, err);
    return null;
  }
}

export function TransitionLink({ href, onClick, children, ...rest }: Props) {
  const { navigate, isNavigating, prefetch } = useNavigation();

  const handlePointerEnter = () => {
    if (href.startsWith("http") || href.startsWith("//")) return;
    if (prefetchedRoutes.has(href)) return;
    prefetchedRoutes.add(href);

    void fetchManifest(href).then((manifest) => {
      // Always preconnect CDN origins for critical assets.
      for (const asset of manifest?.criticalAssets ?? []) injectPreconnect(asset);

      // Full page prefetch — skip if protected and user isn't unlocked.
      if (!manifest || !manifest.protected || hasAccessCookie()) {
        prefetch(href);
      }
    });
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (onClick) onClick(e);
    if (e.defaultPrevented) return;
    if (e.metaKey || e.ctrlKey || e.button !== 0) return;
    if (href.startsWith("http") || href.startsWith("//")) return;
    e.preventDefault();
    navigate(href);
  };

  return (
    <a
      href={href}
      onClick={handleClick}
      onPointerEnter={handlePointerEnter}
      data-pending={isNavigating ? "" : undefined}
      {...rest}
    >
      {children}
    </a>
  );
}
