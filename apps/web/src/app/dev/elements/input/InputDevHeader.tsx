import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function InputDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Input defaults"
      showSessionBadge
      description="Select a variant, tune field layout, placeholder behavior, and error states, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementInput</code> blocks — form field layout, validation display, and interactive
          states within section form layouts
        </>
      }
    />
  );
}
