import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function BodyDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Body defaults"
      showSessionBadge
      description="Select a variant, tune level sizing, paragraph spacing, and motion, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementBody</code> blocks — paragraph text sizing, level scale, and entrance motion
          across all sections
        </>
      }
    />
  );
}
