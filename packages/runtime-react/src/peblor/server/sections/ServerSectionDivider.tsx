import type { SectionBlock } from "@pb/contracts/types";
import { resolveResponsiveValue } from "@pb/core/lib/responsive-value";
import { buildServerSectionBaseStyle } from "./server-section-style";

type Props = Extract<SectionBlock, { type: "divider" }> & { serverIsMobile?: boolean };

export function ServerSectionDivider({ id, ariaLabel, serverIsMobile, ...section }: Props) {
  const isMobile = serverIsMobile ?? false;
  const resolvedAriaLabel = resolveResponsiveValue(ariaLabel, isMobile) ?? id;
  const { style } = buildServerSectionBaseStyle(section, serverIsMobile);

  return (
    <section
      id={id}
      className="relative z-[var(--pb-z-raised)] shrink-0 min-h-0"
      style={{ ...style, pointerEvents: "none" }}
      aria-hidden={resolvedAriaLabel ? undefined : true}
      aria-label={resolvedAriaLabel}
      data-section-type="divider"
    />
  );
}
