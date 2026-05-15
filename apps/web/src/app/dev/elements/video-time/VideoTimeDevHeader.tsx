import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function VideoTimeDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Video time defaults"
      showSessionBadge
      description="Select a variant, tune scrubber layout and timestamp display, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementVideoTime</code> blocks — video scrubber and timestamp display within
          video-linked section layouts
        </>
      }
    />
  );
}
