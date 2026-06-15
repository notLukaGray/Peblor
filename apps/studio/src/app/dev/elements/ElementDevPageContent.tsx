import type { ReactNode } from "react";
import { StyleDevClient } from "@/app/dev/style/StyleDevClient";
import type { ElementDevEditor, ElementDevEntry } from "@/app/dev/elements/element-dev-registry";
import { ElementScaffoldEditor } from "@/app/dev/elements/_shared/ElementScaffoldEditor";
import { BodyElementDevClient } from "@/app/dev/elements/body";
import { ButtonElementDevClient } from "@/app/dev/elements/button";
import { HeadingElementDevClient } from "@/app/dev/elements/heading";
import { ImageElementDevClient } from "@/app/dev/elements/image";
import { LinkElementDevClient } from "@/app/dev/elements/link";
import { RichTextElementDevClient } from "@/app/dev/elements/rich-text";
import { SpacerElementDevClient } from "@/app/dev/elements/spacer";
import { DividerElementDevClient } from "@/app/dev/elements/divider";
import { GroupElementDevClient } from "@/app/dev/elements/group";
import { ScrollProgressBarElementDevClient } from "@/app/dev/elements/scroll-progress-bar";
import { InputElementDevClient } from "@/app/dev/elements/input";
import { RangeElementDevClient } from "@/app/dev/elements/range";
import { VideoElementDevClient } from "@/app/dev/elements/video";
import { VideoTimeElementDevClient } from "@/app/dev/elements/video-time";
import { VectorElementDevClient } from "@/app/dev/elements/vector";
import { SvgElementDevClient } from "@/app/dev/elements/svg";
import { Model3dElementDevClient } from "@/app/dev/elements/model-3d";
import { RiveElementDevClient } from "@/app/dev/elements/rive";

type Renderer = (entry: ElementDevEntry) => ReactNode;

const EDITOR_RENDERERS: Record<
  Exclude<ElementDevEditor["kind"], "placeholder" | "styleScope">,
  Renderer
> = {
  imageVariants: () => <ImageElementDevClient />,
  headingDev: () => <HeadingElementDevClient />,
  bodyDev: () => <BodyElementDevClient />,
  buttonDev: () => <ButtonElementDevClient />,
  richTextDev: () => <RichTextElementDevClient />,
  linkDev: () => <LinkElementDevClient />,
  videoDev: () => <VideoElementDevClient />,
  videoTimeDev: () => <VideoTimeElementDevClient />,
  vectorDev: () => <VectorElementDevClient />,
  svgDev: () => <SvgElementDevClient />,
  model3dDev: () => <Model3dElementDevClient />,
  riveDev: () => <RiveElementDevClient />,
  spacerDev: () => <SpacerElementDevClient />,
  dividerDev: () => <DividerElementDevClient />,
  groupDev: () => <GroupElementDevClient />,
  scrollProgressBarDev: () => <ScrollProgressBarElementDevClient />,
  inputDev: () => <InputElementDevClient />,
  rangeDev: () => <RangeElementDevClient />,
};

function renderStyleScope(entry: ElementDevEntry): ReactNode {
  if (entry.editor.kind !== "styleScope") return null;
  return <StyleDevClient scope={entry.editor.scope} />;
}

export function ElementDevPageContent({ entry }: { entry: ElementDevEntry }) {
  if (entry.editor.kind === "styleScope") {
    return renderStyleScope(entry);
  }

  const renderer = entry.editor.kind === "placeholder" ? null : EDITOR_RENDERERS[entry.editor.kind];
  return renderer ? renderer(entry) : <ElementScaffoldEditor entry={entry} />;
}
