import { serializeJsonLd } from "@/core/lib/serialize-json-ld";

type Props = {
  url: string;
  name: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
};

/**
 * Injects WebPage JSON-LD for the current page, providing search engines
 * with structured metadata — URL, title, description, and dates. Wired into
 * both the root layout (for the home page) and the catch-all route (for all
 * content pages).
 */
export function WebPageJsonLd({
  url,
  name,
  description,
  datePublished,
  dateModified,
  image,
}: Props) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "WebPage",
    url,
    name,
    ...(description && { description }),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    ...(image && { image }),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
