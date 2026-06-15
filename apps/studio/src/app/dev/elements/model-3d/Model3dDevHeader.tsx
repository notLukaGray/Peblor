import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function Model3dDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Model 3D defaults"
      showSessionBadge
      description="Select a variant, configure scene/animation behavior, then validate the representational preview before copying JSON. Deep scene config is best handled via the Custom JSON panel."
      affects={
        <>
          <code>elementModel3D</code> blocks — Three.js/R3F scene container layout, camera,
          lighting, and model animation behavior
        </>
      }
    />
  );
}
