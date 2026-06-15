import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function VectorDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Vector defaults"
      showSessionBadge
      description="Select a variant, configure viewBox and shape paths, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementVector</code> blocks — inline SVG shape rendering and fill/stroke styling
          across all icon and illustration placements
        </>
      }
    />
  );
}
