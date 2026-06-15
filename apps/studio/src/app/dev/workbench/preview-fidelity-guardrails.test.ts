import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

function readRepoFile(pathFromRepoRoot: string): string {
  return readFileSync(join(process.cwd(), pathFromRepoRoot), "utf8");
}

describe("preview fidelity guardrails", () => {
  it("uses canonical renderers for sections/pages/frames", () => {
    const sections = readRepoFile(
      "apps/studio/src/app/dev/layout/sections/LayoutSectionsPanels.tsx"
    );
    const pages = readRepoFile("apps/studio/src/app/dev/layout/pages/LayoutPagesDevClient.tsx");
    const frames = readRepoFile(
      "apps/studio/src/app/dev/layout/frames/LayoutFramesPreviewPanel.tsx"
    );
    expect(sections).toContain("SectionRenderer");
    expect(pages).toContain("PeblorRenderer");
    expect(frames).toContain("LayoutRendererPreviewCard");
    expect(frames).toContain("FramePreviewGapWrapDirection");
    expect(frames).toContain("FramePreviewAlignItems");
  });

  it("keeps element previews on one global viewport selector", () => {
    const typographyPreview = readRepoFile(
      "apps/studio/src/app/dev/elements/_shared/TypographyLiveMotionPreview.tsx"
    );
    const imageToolbar = readRepoFile(
      "apps/studio/src/devtools/app-dev/elements/image/image-preview-toolbar.tsx"
    );
    expect(typographyPreview).not.toContain("setPreviewBreakpoint");
    expect(imageToolbar).not.toContain("setPreviewDevice(");
  });

  it("only forces onMount in guided mode", () => {
    const helper = readRepoFile(
      "apps/studio/src/app/dev/elements/_shared/typography-workbench-preview.ts"
    );
    expect(helper).toContain('mode === "guided"');
    expect(helper).toContain('trigger: "onMount"');
  });
});
