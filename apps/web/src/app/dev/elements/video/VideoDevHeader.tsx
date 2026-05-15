import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function VideoDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Video defaults"
      showSessionBadge
      description="Select a variant, tune player layout, poster fallback, and playback config, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementVideo</code> blocks — player container layout, autoplay/loop behavior, and
          poster fallback across all media sections
        </>
      }
    />
  );
}
