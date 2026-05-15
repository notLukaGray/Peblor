import Link from "next/link";
import type { StyleDevScope } from "./style-dev-config";

export function renderStyleScopeDescription(scope: StyleDevScope) {
  switch (scope) {
    case "foundations":
      return (
        <>
          Set the global style primitives first: alignment, spacing rhythm, radius baseline, and
          density feel. These foundations quietly inform layout and element defaults so designers
          can build quickly without feeling boxed in.
        </>
      );
    case "layout-frames":
      return (
        <>
          Frame defaults apply when a frame does not explicitly set its own layout value.
          Foundations still come from{" "}
          <Link href="/dev/style" className="font-mono text-[0.9em] underline underline-offset-2">
            /dev/style
          </Link>
          .
        </>
      );
    case "elements-rich-text":
      return (
        <>
          Rich text defaults set rhythm and readability for content blocks. These values only apply
          when an element does not specify its own spacing.
        </>
      );
    case "elements-button":
      return (
        <>
          Button defaults define baseline spacing and radius for wrapper-less button chrome.
          Typography styles are still chosen in{" "}
          <Link href="/dev/fonts" className="font-mono text-[0.9em] underline underline-offset-2">
            /dev/fonts
          </Link>
          .
        </>
      );
    case "all":
    default:
      return (
        <>
          <strong className="font-semibold text-foreground/90">Global seeds</strong> set the
          baseline (e.g. center alignment, one spacing rhythm).{" "}
          <strong className="font-semibold text-foreground/90">Unlocked</strong> rows track seeds;
          <strong className="font-semibold text-foreground/90"> Lock</strong> a row to freeze it
          while you keep tuning the rest.
        </>
      );
  }
}
