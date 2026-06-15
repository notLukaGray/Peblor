import { getPageAsync, getPeblorPropsFromPage } from "@pb/core/load";
import { PeblorServerPage } from "@pb/runtime-react/server";
import { siteUrl, siteMetadata } from "@/core/lib/globals";
import { WebPageJsonLd } from "@/core/ui/WebPageJsonLd";

export default async function Home() {
  const page = await getPageAsync("presets");
  if (!page) return <Fallback />;

  const props = await getPeblorPropsFromPage(page, "presets", { isMobile: false });
  if (!props) return <Fallback />;

  return (
    <>
      <WebPageJsonLd
        url={siteUrl || "/"}
        name={siteMetadata.title}
        description={siteMetadata.description}
      />
      <PeblorServerPage key="/" {...props} />
    </>
  );
}

function Fallback() {
  return (
    <div style={{ padding: "2rem", textAlign: "center" }}>
      <h1>Peblor</h1>
      <p>JSON-driven page builder</p>
    </div>
  );
}
