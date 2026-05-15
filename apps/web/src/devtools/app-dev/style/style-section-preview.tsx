import type { CSSProperties } from "react";
import type { PbContentGuidelines } from "@/app/theme/pb-content-guidelines-config";
import { buildPageDensityCssVars, type PageDensity } from "@pb/contracts";
import { WorkbenchElementPreviewSurface } from "@/app/dev/workbench/workbench-element-preview-surface";
import {
  WorkbenchPreviewProvider,
  type WorkbenchPreviewBreakpoint,
} from "@/app/dev/workbench/workbench-preview-context";
import {
  FramePreviewAlignItems,
  FramePreviewGapWrapDirection,
  FramePreviewJustifyContent,
  FramePreviewPaddingRadius,
} from "./style-frame-previews";

type SectionFlags = {
  showFrame: boolean;
  showCopy: boolean;
  showRich: boolean;
  showButton: boolean;
};

function getSectionFlags(sectionKeys: (keyof PbContentGuidelines)[]): SectionFlags {
  return {
    showFrame: sectionKeys.some((key) => String(key).startsWith("frame")),
    showCopy: sectionKeys.includes("copyTextAlign"),
    showRich: sectionKeys.some((key) => String(key).startsWith("richText")),
    showButton: sectionKeys.some((key) => String(key).startsWith("button")),
  };
}

function previewRootStyle({
  previewDensity,
  previewVars,
  showCopy,
  guidelines,
}: {
  previewDensity: PageDensity;
  previewVars: CSSProperties;
  showCopy: boolean;
  guidelines: PbContentGuidelines;
}): CSSProperties {
  const style: CSSProperties = {
    ...(buildPageDensityCssVars(previewDensity) as CSSProperties),
    ...previewVars,
  };
  if (showCopy) {
    style.textAlign = guidelines.copyTextAlign as CSSProperties["textAlign"];
  }
  return style;
}

function PreviewIntro({ showFrame }: { showFrame: boolean }) {
  if (!showFrame) return null;
  return (
    <p className="mb-3 text-[10px] leading-snug text-muted-foreground">
      Each block isolates one frame behavior so you can tune defaults independently.
    </p>
  );
}

function CopyBlockPreview({ showCopy, showFrame }: { showCopy: boolean; showFrame: boolean }) {
  if (!showCopy || showFrame) return null;
  return (
    <p className="typography-body-sm m-0 max-w-prose">
      Copy uses the token when block has no explicit `textAlign` / `align`.
    </p>
  );
}

function RichTextPreview({ showRich, showFrame }: { showRich: boolean; showFrame: boolean }) {
  if (!showRich) return null;
  return (
    <div className={`typography-body-sm max-w-prose ${showFrame ? "mt-3" : ""}`}>
      <p className="m-0">Paragraph one.</p>
      <p className="m-0 mt-(--pb-rich-text-p-gap)">Paragraph two.</p>
      <span className="mt-(--pb-rich-text-h3-mt) mb-(--pb-rich-text-h3-mb) block text-base font-bold">
        Heading
      </span>
      <p className="m-0">After heading.</p>
    </div>
  );
}

function ButtonPreview({
  showButton,
  showFrame,
  showRich,
}: {
  showButton: boolean;
  showFrame: boolean;
  showRich: boolean;
}) {
  if (!showButton) return null;
  return (
    <div className={showFrame || showRich ? "mt-3" : ""}>
      <button
        type="button"
        className="inline-flex items-center justify-center gap-(--pb-button-label-gap) border border-border font-mono text-[10px]"
        style={{
          paddingTop: "var(--pb-button-naked-pad-y)",
          paddingBottom: "var(--pb-button-naked-pad-y)",
          paddingLeft: "var(--pb-button-naked-pad-x)",
          paddingRight: "var(--pb-button-naked-pad-x)",
          borderRadius: "var(--pb-button-naked-radius)",
        }}
      >
        Label
        <span className="opacity-60">●</span>
      </button>
    </div>
  );
}

function FramePreviewStack({
  showFrame,
  guidelines,
}: {
  showFrame: boolean;
  guidelines: PbContentGuidelines;
}) {
  if (!showFrame) return null;
  return (
    <div className="space-y-4 border-t border-border/50 pt-3">
      <FramePreviewAlignItems guidelines={guidelines} />
      <FramePreviewJustifyContent guidelines={guidelines} />
      <FramePreviewGapWrapDirection guidelines={guidelines} />
      <FramePreviewPaddingRadius guidelines={guidelines} />
    </div>
  );
}

export function SectionPreview({
  title,
  guidelines,
  previewVars,
  previewDensity,
  previewBreakpoint,
  sectionKeys,
}: {
  title: string;
  guidelines: PbContentGuidelines;
  previewVars: CSSProperties;
  previewDensity: PageDensity;
  previewBreakpoint: WorkbenchPreviewBreakpoint;
  sectionKeys: (keyof PbContentGuidelines)[];
}) {
  const flags = getSectionFlags(sectionKeys);
  const appliedPreviewStyle = previewRootStyle({
    previewDensity,
    previewVars,
    showCopy: flags.showCopy,
    guidelines,
  });
  return (
    <div className="rounded-lg border border-dashed border-border/80 bg-muted/15 p-3">
      <p className="mb-2 font-mono text-[10px] uppercase text-muted-foreground">
        Preview · {title}
      </p>
      <PreviewIntro showFrame={flags.showFrame} />
      <WorkbenchPreviewProvider
        breakpoint={previewBreakpoint}
        className="rounded-md border border-border/60 bg-background/40 p-3"
        style={appliedPreviewStyle}
      >
        <WorkbenchElementPreviewSurface foundationTheme="dark" className="flex flex-col gap-3">
          <FramePreviewStack showFrame={flags.showFrame} guidelines={guidelines} />
          <CopyBlockPreview showCopy={flags.showCopy} showFrame={flags.showFrame} />
          <RichTextPreview showRich={flags.showRich} showFrame={flags.showFrame} />
          <ButtonPreview
            showButton={flags.showButton}
            showFrame={flags.showFrame}
            showRich={flags.showRich}
          />
        </WorkbenchElementPreviewSurface>
      </WorkbenchPreviewProvider>
    </div>
  );
}
