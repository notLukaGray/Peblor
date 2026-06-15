import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function ScrollProgressBarDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Scroll progress bar defaults"
      showSessionBadge
      description="Select a variant, tune height, fill color, and track background, then validate the representational preview before copying JSON. Preview shows static fill at 60%."
      affects={
        <>
          <code>elementScrollProgressBar</code> blocks — page scroll progress indicator styling and
          placement across all scroll-linked sections
        </>
      }
    />
  );
}
