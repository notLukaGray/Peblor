import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function RiveDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Rive defaults"
      showSessionBadge
      description="Select a variant, configure playback and layout behavior, then validate the representational preview before copying JSON. Live preview requires a real .riv file reference."
      affects={
        <>
          <code>elementRive</code> blocks — Rive animation canvas layout, playback config, and state
          machine behavior
        </>
      }
    />
  );
}
