import { PageContent } from "@/app/[...slug]/page-content";
import { siteUrl, siteMetadata } from "@/core/lib/globals";
import { WebPageJsonLd } from "@/core/ui/WebPageJsonLd";

export default async function Home() {
  return (
    <>
      <WebPageJsonLd
        url={siteUrl || "/"}
        name={siteMetadata.title}
        description={siteMetadata.description}
      />
      <PageContent
        slug="presets"
        pagePath="/"
        isMobile={false}
        viewportWidthPx={null}
        nonce={undefined}
        hasAccess={false}
        unlockEnabled={false}
        isUnlockPage={false}
        query={{}}
        filterConfig={undefined}
      />
    </>
  );
}
