import { serializeJsonLd } from "@/core/lib/serialize-json-ld";

type Props = {
  name: string;
  url: string;
  description?: string;
  searchUrl?: string;
};

/**
 * Injects WebSite JSON-LD with site name, URL, and optional search action.
 * Rendered in the root layout. When searchUrl is provided, a SearchAction
 * potentialAction is included so search engines understand the site search
 * endpoint.
 */
export function WebSiteJsonLd({ name, url, description, searchUrl }: Props) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name,
    url,
    ...(description && { description }),
    ...(searchUrl && {
      potentialAction: {
        "@type": "SearchAction",
        target: {
          "@type": "EntryPoint",
          urlTemplate: searchUrl,
        },
        "query-input": "required name=search_term",
      },
    }),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
