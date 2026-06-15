import { DevWorkbenchPageHeader } from "@/app/dev/_components/DevWorkbenchPageHeader";

export function RichTextDevHeader() {
  return (
    <DevWorkbenchPageHeader
      eyebrow="Dev · Elements"
      title="Rich text defaults"
      showSessionBadge
      description="Select a variant, tune prose rendering and layout, then validate the representational preview before copying JSON."
      affects={
        <>
          <code>elementRichText</code> blocks — markdown and HTML prose output, spacing, and
          typography within content sections
        </>
      }
    />
  );
}
