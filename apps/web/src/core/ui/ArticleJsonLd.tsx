import { serializeJsonLd } from "@/core/lib/serialize-json-ld";

type Props = {
  url: string;
  headline: string;
  description?: string;
  datePublished?: string;
  dateModified?: string;
  image?: string;
  authorName?: string;
  authorUrl?: string;
};

/**
 * Injects Article JSON-LD for article-style content pages (research, writing).
 * Provides headline, description, publish/modify dates, featured image, and
 * author attribution. Typically used alongside WebPage schema.
 */
export function ArticleJsonLd({
  url,
  headline,
  description,
  datePublished,
  dateModified,
  image,
  authorName,
  authorUrl,
}: Props) {
  const schema: Record<string, unknown> = {
    "@context": "https://schema.org",
    "@type": "Article",
    url,
    headline,
    ...(description && { description }),
    ...(datePublished && { datePublished }),
    ...(dateModified && { dateModified }),
    ...(image && { image }),
    ...(authorName && {
      author: {
        "@type": "Person",
        name: authorName,
        ...(authorUrl && { url: authorUrl }),
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
