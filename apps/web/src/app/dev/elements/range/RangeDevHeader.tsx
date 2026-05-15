import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function RangeDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Range defaults"
      showSessionBadge
      description="Select a variant, tune slider layout, label composition, and hint text, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementRange</code> blocks — slider controls, label/hint layout, and value display
          within section form layouts
        </>
      }
    />
  );
}
