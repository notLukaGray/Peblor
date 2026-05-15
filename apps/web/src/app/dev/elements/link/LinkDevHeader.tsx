import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function LinkDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Link defaults"
      showSessionBadge
      description="Select a variant, tune text decoration, weight, and interaction behavior, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementLink</code> blocks — inline text link decoration, color, and hover
          interaction across all prose contexts
        </>
      }
    />
  );
}
