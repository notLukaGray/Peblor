import type { ElementBlock } from "@pb/contracts/types";

/** Shared props type for all server element components. */
export type ServerElementComponentProps = ElementBlock & {
  serverIsMobile?: boolean;
  /** Class name derived from state styles (hover/focus/active/disabled). Applied to the element's outermost div. */
  stateStyleClass?: string;
  /** Class name derived from responsive typography+layout styles. Applied to the element's outermost div. */
  responsiveStyleClass?: string;
  /** True when the responsive style uses a @container variant; the outer wrapper must establish a container. */
  responsiveNeedsContainer?: boolean;
  /** Subset of layout keys whose raw values are responsive tier maps (covered by the responsive CSS class). */
  responsiveLayoutKeys?: string[];
};
