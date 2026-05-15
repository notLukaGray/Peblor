import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function SvgDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="SVG defaults"
      showSessionBadge
      description="Select a variant, configure raw SVG markup and layout, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementSVG</code> blocks — raw SVG markup injection, sizing, and layout within
          content and media sections
        </>
      }
    />
  );
}
