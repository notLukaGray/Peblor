"use client";

import * as React from "react";
export { pageForcedThemeInlineScript } from "./page-forced-theme-inline-script";
import {
  type ForcedTheme,
  applyForcedTheme,
  resolvePreferredTheme,
} from "./theme/forced-theme-utils";

export function PageForcedTheme({ theme }: { theme?: ForcedTheme }) {
  React.useEffect(() => {
    if (theme !== "light" && theme !== "dark") return;

    const root = document.documentElement;
    root.dataset.pbForcedTheme = theme;
    applyForcedTheme(theme);

    return () => {
      delete root.dataset.pbForcedTheme;
      applyForcedTheme(resolvePreferredTheme());
    };
  }, [theme]);

  return null;
}
