import { getPageAsync, getPeblorPropsFromPage } from "@pb/core/load";
import { PeblorServerPage } from "@pb/runtime-react/server";

// Render the 404 page without reading cookies/headers — the responsive CSS layer
// handles layout at the client level, matching the isMobile:false baseline used
// by all SSG slug pages. Dynamic I/O here adds latency with no real personalisation.
export default async function NotFound() {
  const page = await getPageAsync("404");
  if (!page) return <p style={{ padding: "2rem" }}>404 — Page not found</p>;

  const props = await getPeblorPropsFromPage(page, "404", { isMobile: false });
  if (!props) return <p style={{ padding: "2rem" }}>404 — Page not found</p>;

  return <PeblorServerPage {...props} />;
}
