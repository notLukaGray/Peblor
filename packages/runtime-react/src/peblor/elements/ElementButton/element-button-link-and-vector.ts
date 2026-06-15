import type { CSSProperties } from "react";
import type { ElementBlock } from "@pb/contracts/types";
import { lowerThemeStringToCss } from "@/peblor/theme/theme-string";

type ElementButtonProps = Extract<ElementBlock, { type: "elementButton" }>;

function toTransitionValue(value: string | number | undefined): string | undefined {
  if (value == null) return undefined;
  return typeof value === "number" ? `${value}ms` : value;
}

export function buildElementButtonLinkState(
  pathname: string | null,
  props: Pick<
    ElementButtonProps,
    | "href"
    | "external"
    | "linkDefault"
    | "linkHover"
    | "linkActive"
    | "linkDisabled"
    | "linkTransition"
    | "disabled"
  >,
  typographyClass: string
) {
  const {
    href,
    external = false,
    linkDefault,
    linkHover,
    linkActive,
    linkDisabled,
    linkTransition,
    disabled = false,
  } = props;
  const hasLink = href != null && href !== "";
  const isInternal = hasLink && !external && href.startsWith("/");
  const isActive =
    hasLink &&
    isInternal &&
    !!pathname &&
    (pathname === href || (href !== "/" && pathname.startsWith(href)));

  const linkStyle: CSSProperties = {};
  const resolvedLinkDefault = lowerThemeStringToCss(linkDefault);
  const resolvedLinkHover = lowerThemeStringToCss(linkHover);
  const resolvedLinkActive = lowerThemeStringToCss(linkActive);
  const resolvedLinkDisabled = lowerThemeStringToCss(linkDisabled);
  if (resolvedLinkDefault != null)
    (linkStyle as Record<string, string>)["--element-link-color"] = resolvedLinkDefault;
  if (resolvedLinkHover != null)
    (linkStyle as Record<string, string>)["--element-link-hover"] = resolvedLinkHover;
  if (resolvedLinkActive != null)
    (linkStyle as Record<string, string>)["--element-link-active"] = resolvedLinkActive;
  if (resolvedLinkDisabled != null)
    (linkStyle as Record<string, string>)["--element-link-disabled"] = resolvedLinkDisabled;
  const transition = toTransitionValue(linkTransition);
  if (transition != null)
    (linkStyle as Record<string, string>)["--element-link-transition"] = transition;

  const linkClassName = [
    "element-link m-0 block",
    typographyClass,
    isActive ? "element-link--active" : "",
    disabled ? "element-link--disabled" : "",
  ]
    .filter(Boolean)
    .join(" ");

  return { hasLink, isInternal, linkStyle, linkClassName };
}

export function resolveElementButtonVectorBlock(
  definitions: Record<string, unknown> | null | undefined,
  vectorRef: string | undefined
): ElementBlock | null {
  const vectorDef = vectorRef && definitions ? definitions[vectorRef] : null;
  const isElement =
    vectorDef != null &&
    typeof vectorDef === "object" &&
    "type" in vectorDef &&
    (vectorDef as { type: string }).type !== "cssGradient";
  if (!isElement || !vectorDef) return null;
  return {
    ...vectorDef,
    id: "id" in vectorDef && vectorDef.id ? vectorDef.id : vectorRef,
  } as ElementBlock;
}
