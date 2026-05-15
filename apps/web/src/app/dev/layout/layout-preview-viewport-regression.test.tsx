import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { getDefaultStyleToolPersistedV3 } from "@/app/dev/style/style-tool-persistence";
import { buildPageLayerPreviewSections } from "@/app/dev/layout/_shared/layout-preview-fixtures";
import {
  buildLayoutColumnsSection,
  getDefaultLayoutColumnsDraft,
} from "@/app/dev/layout/columns/layout-columns-dev-state";
import { WorkbenchPreviewProvider } from "@/app/dev/workbench/workbench-preview-context";
import { PeblorRenderer, SectionRenderer } from "@pb/runtime-react/renderers";

describe("layout preview viewport regression", () => {
  it("renders distinct section output for desktop vs mobile", () => {
    const section = buildLayoutColumnsSection(getDefaultLayoutColumnsDraft());
    const desktop = renderToStaticMarkup(
      <WorkbenchPreviewProvider breakpoint="desktop">
        <SectionRenderer section={section} isFirstSection />
      </WorkbenchPreviewProvider>
    );
    const mobile = renderToStaticMarkup(
      <WorkbenchPreviewProvider breakpoint="mobile">
        <SectionRenderer section={section} isFirstSection />
      </WorkbenchPreviewProvider>
    );
    expect(desktop).not.toEqual(mobile);
  });

  it("renders distinct page output for desktop vs mobile", () => {
    const style = getDefaultStyleToolPersistedV3();
    const layeredSections = buildPageLayerPreviewSections({
      zIndexLayers: style.zIndexLayers,
      opacityScale: style.opacityScale,
    });
    const sections = [
      buildLayoutColumnsSection(getDefaultLayoutColumnsDraft()),
      ...layeredSections,
    ];
    const desktop = renderToStaticMarkup(
      <WorkbenchPreviewProvider breakpoint="desktop">
        <PeblorRenderer resolvedBg={null} resolvedSections={sections} serverIsMobile={false} />
      </WorkbenchPreviewProvider>
    );
    const mobile = renderToStaticMarkup(
      <WorkbenchPreviewProvider breakpoint="mobile">
        <PeblorRenderer resolvedBg={null} resolvedSections={sections} serverIsMobile={true} />
      </WorkbenchPreviewProvider>
    );
    expect(desktop).not.toEqual(mobile);
  });
});
