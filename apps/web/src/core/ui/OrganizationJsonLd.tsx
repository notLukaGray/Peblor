import { serializeJsonLd } from "@/core/lib/serialize-json-ld";

type Props = {
  name: string;
  url: string;
  logo?: string;
  description?: string;
};

/**
 * Injects Organization JSON-LD for the site, giving search engines a clear
 * identity for the entity behind the website — name, URL, and optional logo.
 * Rendered in the root layout alongside WebSite schema.
 */
export function OrganizationJsonLd({ name, url, logo, description }: Props) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name,
    url,
    ...(logo && { logo }),
    ...(description && { description }),
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: serializeJsonLd(schema) }}
    />
  );
}
