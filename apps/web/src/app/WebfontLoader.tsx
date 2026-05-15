"use client";

import { useEffect } from "react";

export function WebfontLoader({ urls }: { urls: string[] }) {
  useEffect(() => {
    if (urls.length === 0) return;
    const links = urls.map((url) => {
      const link = document.createElement("link");
      link.rel = "preload";
      link.href = url;
      link.as = "style";
      link.onload = () => {
        link.onload = null;
        link.rel = "stylesheet";
      };
      document.head.appendChild(link);
      return link;
    });
    return () => {
      for (const link of links) link.remove();
    };
  }, [urls]);

  return null;
}
