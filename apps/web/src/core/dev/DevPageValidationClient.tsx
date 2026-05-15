"use client";

import { usePathname } from "next/navigation";
import { useEffect } from "react";

/** Current page slug path from pathname. */
function getSlugFromPathname(pathname: string): string | null {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length < 2) return null;
  return segments.join("/");
}

/** Only validate when we're on a peblor detail route (e.g. /teaching/foo, /work/bar). Skip index/section routes like /teaching, /work, and internal dev tools like /dev/*, /playground. */
function isPeblorDetailPath(pathname: string): boolean {
  const segments = pathname.split("/").filter(Boolean);
  if (segments[0] === "dev" || segments[0] === "playground") return false;
  return segments.length >= 2;
}

export function DevPageValidationClient() {
  const pathname = usePathname();

  useEffect(() => {
    if (process.env.NODE_ENV !== "development") return;
    if (!pathname || !isPeblorDetailPath(pathname)) return;

    const slug = getSlugFromPathname(pathname);
    if (!slug) return;

    const controller = new AbortController();
    const url = `/api/dev/page-validation?slug=${encodeURIComponent(slug)}`;

    async function run() {
      try {
        const res = await fetch(url, { signal: controller.signal });
        if (!res.ok) return;
        const data: {
          results: { slug: string; valid: boolean; errors: string[] }[];
          summary: { validCount: number; invalidCount: number };
        } = await res.json();

        if (!Array.isArray(data.results) || data.results.length === 0) return;

        const [page] = data.results;
        if (!page) return;
        if (page.valid) return;

        console.error("[peblor validation] Page has errors:", page.slug);
        for (const error of page.errors) {
          console.error(error);
        }
      } catch (error) {
        if ((error as { name?: string }).name === "AbortError") return;
        console.error("[peblor validation] Failed to fetch validation results", error);
      }
    }

    void run();

    return () => {
      controller.abort();
    };
  }, [pathname]);

  return null;
}
