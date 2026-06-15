"use client";

import { useMemo } from "react";
import { TypographyLiveMotionPreview } from "@/app/dev/elements/_shared/TypographyLiveMotionPreview";
import { buildResolvedTypographyWorkbenchBlock } from "@/app/dev/elements/_shared/typography-workbench-preview";
import { PreviewProvenanceBadge } from "@/app/dev/workbench/PreviewProvenanceBadge";
import { VARIANT_LABELS } from "./constants";
import type { RiveElementDevController } from "./useRiveElementDevController";

export function RivePreviewPanel({ controller }: { controller: RiveElementDevController }) {
  const variantLabel = controller.isCustomVariant
    ? "Create Custom"
    : VARIANT_LABELS[controller.activeVariant];
  const hasAsset =
    typeof controller.active.src === "string" && controller.active.src.trim().length > 0;
  const hiddenByVisibleWhen =
    controller.runtimeDraft.visibleWhenEnabled && !controller.runtimePreview.visibleWhenMatches;
  const previewBlock = useMemo(
    () =>
      buildResolvedTypographyWorkbenchBlock(
        controller.runtimeDraft,
        {
          type: "elementRive",
          ...controller.active,
        },
        { mode: "raw" }
      ),
    [controller.active, controller.runtimeDraft]
  );

  if (hasAsset) {
    return (
      <TypographyLiveMotionPreview
        previewVisible={controller.previewVisible}
        previewKey={controller.previewKey}
        autoLoop={controller.autoLoop}
        setAutoLoop={controller.setAutoLoop}
        animateInPreview={controller.animateInPreview}
        animateOutPreview={controller.animateOutPreview}
        showPreview={controller.showPreview}
        variantLabel={variantLabel}
        hiddenByVisibleWhen={hiddenByVisibleWhen}
        runtimeDraft={controller.runtimeDraft}
        previewBlock={previewBlock}
        onPreviewExitComplete={controller.onPreviewExitComplete}
        animationSource={controller.active.animation}
        showFidelityModeToggle={false}
      />
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          Preview
        </p>
        <div className="flex items-center gap-2">
          <PreviewProvenanceBadge mode="placeholder" />
          <span className="font-mono text-[10px] text-muted-foreground">{variantLabel}</span>
        </div>
      </div>
      <div className="min-h-[10rem] rounded-md border border-dashed border-border/80 bg-muted/10 p-6 flex flex-col items-center justify-center gap-3">
        <p className="font-mono text-[11px] text-muted-foreground text-center">
          Live preview requires an asset reference.
        </p>
        <p className="text-[10px] text-muted-foreground/70 text-center max-w-[22rem]">
          elementRive renders from page JSON with a real{" "}
          <code className="font-mono text-[10px]">.riv</code> file key. Use Custom JSON to paste
          your element block, or copy the handoff snippet for engineering.
        </p>
        <div className="mt-2 rounded border border-border/50 bg-background/60 px-3 py-2 font-mono text-[10px] text-muted-foreground">
          type: &quot;elementRive&quot;
        </div>
      </div>
    </div>
  );
}
