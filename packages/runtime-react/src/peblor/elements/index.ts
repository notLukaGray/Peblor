import { memo, type ComponentType } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { ElementHeading } from "./ElementHeading";
import { ElementBody } from "./ElementBody";
import { ElementLink } from "./ElementLink";
import { ElementImage } from "./ElementImage";
import dynamic from "next/dynamic";

// ── Heavy / rarely-used element components: dynamic imports ──────────────────
// Each is code-split into its own chunk — only loaded when the page actually
// uses that element type. SSR renders full HTML (ssr:true is the default).
// No loading override — the SSR output is the fallback, so layout never collapses.
//
// TypeScript note: next/dynamic returns DynamicComponentType<T> which is
// functionally a ComponentType<T> but its generic parameter is the resolved
// dynamic props, not ElementBlock directly. Casting through `unknown` is
// required because DynamicComponentType and ComponentType have structurally
// incompatible generics (Next.js internal wrapper) — the `as unknown as`
// double-cast is the standard workaround (microsoft/TypeScript#35858).

const ElementVector = dynamic(() =>
  import("./ElementVector").then((mod) => mod.ElementVector)
) as unknown as ComponentType<ElementBlock>;

const ElementSVG = dynamic(() =>
  import("./ElementSVG").then((mod) => mod.ElementSVG)
) as unknown as ComponentType<ElementBlock>;

const ElementRange = dynamic(() =>
  import("./ElementRange").then((mod) => mod.ElementRange)
) as unknown as ComponentType<ElementBlock>;

const ElementInput = dynamic(() =>
  import("./ElementInput").then((mod) => mod.ElementInput)
) as unknown as ComponentType<ElementBlock>;

const ElementVideoTime = dynamic(() =>
  import("./ElementVideoTime").then((mod) => mod.ElementVideoTime)
) as unknown as ComponentType<ElementBlock>;

const ElementVideoQualitySelect = dynamic(() =>
  import("./ElementVideo/ElementVideoQualitySelect").then((mod) => mod.ElementVideoQualitySelect)
) as unknown as ComponentType<ElementBlock>;

const ElementSpacer = dynamic(() =>
  import("./ElementSpacer").then((mod) => mod.ElementSpacer)
) as unknown as ComponentType<ElementBlock>;

const ElementDivider = dynamic(() =>
  import("./ElementDivider").then((mod) => mod.ElementDivider)
) as unknown as ComponentType<ElementBlock>;

const ElementButton = dynamic(() =>
  import("./ElementButton").then((mod) => mod.ElementButton)
) as unknown as ComponentType<ElementBlock>;

const ElementScrollProgressBar = dynamic(() =>
  import("./ElementScrollProgressBar").then((mod) => mod.ElementScrollProgressBar)
) as unknown as ComponentType<ElementBlock>;

const ElementModuleGroup = dynamic(() =>
  import("./ElementModule").then((mod) => mod.ElementModuleGroup)
) as unknown as ComponentType<ElementBlock>;

const ElementInfiniteScroll = dynamic(() =>
  import("./ElementInfiniteScroll").then((mod) => mod.ElementInfiniteScroll)
) as unknown as ComponentType<ElementBlock>;

const ElementModel3D = dynamic(() =>
  import("./Element3D").then((mod) => mod.ElementModel3D)
) as unknown as ComponentType<ElementBlock>;

const ElementRive = dynamic(() =>
  import("./ElementRive").then((mod) => mod.ElementRive)
) as unknown as ComponentType<ElementBlock>;

const ElementFormField = dynamic(() =>
  import("./ElementFormField").then((mod) => mod.ElementFormField)
) as unknown as ComponentType<ElementBlock>;

const ElementAudio = dynamic(() =>
  import("./ElementAudio").then((mod) => mod.ElementAudio)
) as unknown as ComponentType<ElementBlock>;

const ElementCounter = dynamic(() =>
  import("./ElementCounter").then((mod) => mod.ElementCounter)
) as unknown as ComponentType<ElementBlock>;

const ElementMarquee = dynamic(() =>
  import("./ElementMarquee").then((mod) => mod.ElementMarquee)
) as unknown as ComponentType<ElementBlock>;

const ElementImageCompare = dynamic(() =>
  import("./ElementImageCompare").then((mod) => mod.ElementImageCompare)
) as unknown as ComponentType<ElementBlock>;

const ElementTabs = dynamic(() =>
  import("./ElementTabs").then((mod) => mod.ElementTabs)
) as unknown as ComponentType<ElementBlock>;

const ElementTooltip = dynamic(() =>
  import("./ElementTooltip").then((mod) => mod.ElementTooltip)
) as unknown as ComponentType<ElementBlock>;

const ElementLottie = dynamic(() =>
  import("./ElementLottie").then((mod) => mod.ElementLottie)
) as unknown as ComponentType<ElementBlock>;

const ElementDrag = dynamic(() =>
  import("./ElementDrag").then((mod) => mod.ElementDrag)
) as unknown as ComponentType<ElementBlock>;

const ElementRichText = dynamic(() =>
  import("./ElementRichText").then((mod) => mod.ElementRichText)
) as unknown as ComponentType<ElementBlock>;

const ElementEmbed = dynamic(() =>
  import("./ElementEmbed").then((mod) => mod.ElementEmbed)
) as unknown as ComponentType<ElementBlock>;

const ElementList = dynamic(() =>
  import("./ElementList").then((mod) => mod.ElementList)
) as unknown as ComponentType<ElementBlock>;

const ElementBlockquote = dynamic(() =>
  import("./ElementBlockquote").then((mod) => mod.ElementBlockquote)
) as unknown as ComponentType<ElementBlock>;

const ElementTable = dynamic(() =>
  import("./ElementTable").then((mod) => mod.ElementTable)
) as unknown as ComponentType<ElementBlock>;

const ElementCode = dynamic(() =>
  import("./ElementCode").then((mod) => mod.ElementCode)
) as unknown as ComponentType<ElementBlock>;

const ElementVideo = dynamic(() =>
  import("./ElementVideo").then((mod) => mod.ElementVideo)
) as unknown as ComponentType<ElementBlock>;

export { ElementHeading, ElementBody, ElementLink, ElementImage };

export const ELEMENT_COMPONENTS: Record<string, ComponentType<ElementBlock>> = {
  elementHeading: memo(ElementHeading) as ComponentType<ElementBlock>,
  elementBody: memo(ElementBody) as ComponentType<ElementBlock>,
  elementLink: memo(ElementLink) as ComponentType<ElementBlock>,
  elementImage: memo(ElementImage) as ComponentType<ElementBlock>,
  elementVideo: memo(ElementVideo) as ComponentType<ElementBlock>,
  elementVector: memo(ElementVector) as ComponentType<ElementBlock>,
  elementSVG: memo(ElementSVG) as ComponentType<ElementBlock>,
  elementRichText: memo(ElementRichText) as ComponentType<ElementBlock>,
  elementRange: memo(ElementRange) as ComponentType<ElementBlock>,
  elementInput: memo(ElementInput) as ComponentType<ElementBlock>,
  elementVideoTime: memo(ElementVideoTime) as ComponentType<ElementBlock>,
  elementVideoQualitySelect: memo(ElementVideoQualitySelect) as ComponentType<ElementBlock>,
  elementSpacer: memo(ElementSpacer) as ComponentType<ElementBlock>,
  elementDivider: memo(ElementDivider) as ComponentType<ElementBlock>,
  elementScrollProgressBar: memo(ElementScrollProgressBar) as ComponentType<ElementBlock>,
  elementButton: memo(ElementButton) as ComponentType<ElementBlock>,
  elementModel3D: memo(ElementModel3D) as ComponentType<ElementBlock>,
  elementRive: memo(ElementRive) as ComponentType<ElementBlock>,
  elementGroup: memo(ElementModuleGroup) as ComponentType<ElementBlock>,
  elementInfiniteScroll: memo(ElementInfiniteScroll) as ComponentType<ElementBlock>,
  elementFormField: memo(ElementFormField) as ComponentType<ElementBlock>,
  elementAudio: memo(ElementAudio) as ComponentType<ElementBlock>,
  elementCounter: memo(ElementCounter) as ComponentType<ElementBlock>,
  elementMarquee: memo(ElementMarquee) as ComponentType<ElementBlock>,
  elementImageCompare: memo(ElementImageCompare) as ComponentType<ElementBlock>,
  elementTabs: memo(ElementTabs) as ComponentType<ElementBlock>,
  elementTooltip: memo(ElementTooltip) as ComponentType<ElementBlock>,
  elementLottie: memo(ElementLottie) as ComponentType<ElementBlock>,
  elementDrag: memo(ElementDrag) as ComponentType<ElementBlock>,
  elementEmbed: memo(ElementEmbed) as ComponentType<ElementBlock>,
  elementList: memo(ElementList) as ComponentType<ElementBlock>,
  elementBlockquote: memo(ElementBlockquote) as ComponentType<ElementBlock>,
  elementTable: memo(ElementTable) as ComponentType<ElementBlock>,
  elementCode: memo(ElementCode) as ComponentType<ElementBlock>,
};
