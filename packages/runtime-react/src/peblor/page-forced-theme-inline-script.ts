type ForcedTheme = "light" | "dark";

export function pageForcedThemeInlineScript(theme: ForcedTheme): string {
  return `document.documentElement.dataset.pbForcedTheme=${JSON.stringify(theme)};document.documentElement.classList.remove("light","dark");document.documentElement.classList.add(${JSON.stringify(theme)});`;
}
