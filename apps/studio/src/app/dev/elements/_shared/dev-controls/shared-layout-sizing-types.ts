import { resolveConstraintsForDevice } from "@/app/dev/elements/_shared/responsive-layout-value";

export type ResponsiveTextState = {
  desktop: string;
  mobile: string;
  hasMobile: boolean;
};

export type AlignX = "left" | "center" | "right";
export type AlignY = "top" | "center" | "bottom";

export type ResponsiveChoiceState<TValue extends string> = {
  desktop: TValue;
  mobile: TValue;
  hasMobile: boolean;
};

export type ConstraintsState = {
  desktop: ReturnType<typeof resolveConstraintsForDevice>;
  mobile: ReturnType<typeof resolveConstraintsForDevice>;
  hasMobile: boolean;
};
