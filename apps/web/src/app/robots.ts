import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: ["/dev", "/dev/", "/api/", "/style-guide"],
    },
    ...(process.env.NEXT_PUBLIC_SITE_URL
      ? { sitemap: `${process.env.NEXT_PUBLIC_SITE_URL}/sitemap.xml` }
      : {}),
  };
}
