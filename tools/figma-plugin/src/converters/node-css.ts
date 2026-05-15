/**
 * Optional CSS inspect helpers (getCSSAsync).
 * Used as a fallback for complex multi-layer backgrounds where manual paint
 * conversion may differ from Figma's inspect output.
 */

export async function getInspectableCssAsync(
  node: SceneNode
): Promise<Record<string, string> | undefined> {
  const getCSS = (node as SceneNode & { getCSSAsync?: () => Promise<Record<string, string>> })
    .getCSSAsync;
  if (typeof getCSS !== "function") return undefined;
  try {
    return await getCSS.call(node);
  } catch {
    return undefined;
  }
}

export async function getInspectableBackgroundAsync(
  node: SceneNode,
  precomputedCss?: Record<string, string>
): Promise<string | undefined> {
  const css = precomputedCss ?? (await getInspectableCssAsync(node));
  if (!css) return undefined;
  const background = css["background"] ?? css["background-image"];
  if (!background) return undefined;
  const normalized = background.trim();
  if (!normalized || normalized.toLowerCase() === "none") return undefined;

  // Only use inspect fallback for complex backgrounds to avoid overriding
  // known-good simple solid color extraction paths.
  if (
    normalized.includes("gradient(") ||
    normalized.includes("url(") ||
    normalized.includes("),")
  ) {
    return normalized;
  }
  return undefined;
}
