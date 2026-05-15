import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function ImageDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Image defaults"
      showSessionBadge
      description="Select a variant, tune layout container, aspect ratio, and motion preset, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementImage</code> blocks — layout container, aspect ratio, entrance motion, and
          runtime metadata across all media placements
        </>
      }
      meta={
        <>
          Seeds: Hero, Inline, Full Cover, and Feature from{" "}
          <code>pbBuilderDefaultsV1.elements.image</code>.
        </>
      }
    />
  );
}
