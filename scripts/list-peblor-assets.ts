/** List asset URLs from all Peblor JSON. Usage: npm run list-assets */

import { discoverAllPages, getPageAsync } from "@pb/core/load";
import { getAllAssetUrlsFromPage } from "@pb/core/media";

async function main() {
  const slugs = (await discoverAllPages()).map((page) => page.slugSegments.join("/"));

  if (slugs.length === 0) {
    return;
  }

  const allUrls = new Set<string>();

  for (const slug of slugs) {
    const page = await getPageAsync(slug);
    if (!page) {
      process.exitCode = 1;
      continue;
    }
    const urls = getAllAssetUrlsFromPage(page);
    for (const url of urls) {
      if (!allUrls.has(url)) {
        allUrls.add(url);
        console.log(url);
      }
    }
  }
}

main();
