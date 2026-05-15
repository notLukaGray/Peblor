import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function HeadingDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Heading defaults"
      showSessionBadge
      description="Select a variant, tune semantic level, typography, and motion, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementHeading</code> blocks — semantic level, typography scale, and entrance motion
          across all sections
        </>
      }
    />
  );
}
