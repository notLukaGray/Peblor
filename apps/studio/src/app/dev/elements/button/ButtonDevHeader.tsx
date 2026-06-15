import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function ButtonDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Button defaults"
      showSessionBadge
      description="Select a variant, tune chrome spacing, icon/label layout, and interactive states, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementButton</code> blocks — padding, icon relationship, and interactive visual
          states across all CTA placements
        </>
      }
    />
  );
}
