import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function SpacerDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Spacer defaults"
      showSessionBadge
      description="Select a variant, tune height tokens and responsive behavior, then validate the representational preview (dashed guides show spacer height) before copying JSON."
      affects={
        <>
          <code>elementSpacer</code> blocks — vertical rhythm spacing between content blocks across
          all section layouts
        </>
      }
    />
  );
}
