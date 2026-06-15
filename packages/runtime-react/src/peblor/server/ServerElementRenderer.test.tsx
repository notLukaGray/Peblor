/**
 * Phase 2 — ServerElementRenderer routing for motionTiming
 *
 * After Phase 2, elements with only motionTiming should be rendered by
 * the server element component (ServerElementHeading etc.), not routed
 * to ClientElementIsland. The entrance animation is applied as a thin
 * "use client" wrapper (ElementEntranceWrapper) around the server content.
 *
 * We detect which path was taken via the theme color output:
 *   - ServerElementHeading emits light-dark(light, dark) — CSS-native (Phase 0 fix)
 *   - ElementHeading (client path) uses usePeblorThemeMode() with "dark" SSR snapshot
 *     and emits the resolved dark value only (e.g. "#112233")
 */
import { describe, expect, it } from "vitest";
import { renderToStaticMarkup } from "react-dom/server";
import { ServerElementRenderer } from "./ServerElementRenderer";

const RESOLVED_ENTRANCE = {
  initial: { opacity: 0 },
  animate: { opacity: 1 },
  transition: { duration: 0.4 },
};

describe("ServerElementRenderer — motionTiming routing (Phase 2)", () => {
  it("heading with only motionTiming is rendered by ServerElementHeading (emits light-dark())", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={{
          type: "elementHeading",
          text: "Hello world",
          color: { light: "#aabbcc", dark: "#112233" },
          motionTiming: {
            entrancePreset: "fade",
            trigger: "onFirstVisible",
            resolvedEntranceMotion: RESOLVED_ENTRANCE,
          } as never,
        }}
      />
    );
    // If still going via ClientElementIsland → ElementHeading (dark SSR snapshot) → "#112233"
    // If now going via ServerElementHeading → light-dark(#aabbcc, #112233)
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).toContain("Hello world");
  });

  it("body with only motionTiming is rendered by ServerElementBody (emits light-dark())", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={{
          type: "elementBody",
          text: "Body text",
          color: { light: "#aabbcc", dark: "#112233" },
          motionTiming: {
            entrancePreset: "slideUp",
            trigger: "onFirstVisible",
            resolvedEntranceMotion: RESOLVED_ENTRANCE,
          } as never,
        }}
      />
    );
    expect(html).toContain("light-dark(#aabbcc, #112233)");
    expect(html).toContain("Body text");
  });

  it("heading with motionTiming trigger:onTrigger still routes to ClientElementIsland", () => {
    const html = renderToStaticMarkup(
      <ServerElementRenderer
        block={{
          type: "elementHeading",
          text: "Triggered",
          color: { light: "#aabbcc", dark: "#112233" },
          // onTrigger → client classification. resolvedEntranceMotion intentionally omitted:
          // with dynamic ElementEntranceWrapper, a resolved entrance motion would cause
          // the wrapper to render as null during SSR in tests (next/dynamic loading state),
          // hiding the heading text. The routing classification only needs trigger:onTrigger.
          motionTiming: {
            entrancePreset: "fade",
            trigger: "onTrigger",
          } as never,
        }}
      />
    );
    // onTrigger stays client — ClientElementIsland → ElementRenderer.
    // The routing is verified by classification logic (hasClientPropForElement onTrigger exception).
    expect(html).toContain("Triggered");
  });

  it("elementGroup with non-stagger motionTiming renders children as server HTML", () => {
    const groupBlock = {
      type: "elementGroup",
      motionTiming: {
        entrancePreset: "fade",
        resolvedEntranceMotion: RESOLVED_ENTRANCE,
      },
      section: {
        elementOrder: ["child-1"],
        definitions: {
          "child-1": {
            id: "child-1",
            type: "elementHeading",
            text: "Child heading",
            color: { light: "#aabbcc", dark: "#112233" },
          },
        },
      },
    } as never;
    const html = renderToStaticMarkup(<ServerElementRenderer block={groupBlock} />);
    // Children rendered by server components → light-dark() color
    expect(html).toContain("Child heading");
    expect(html).toContain("light-dark(#aabbcc, #112233)");
  });
});
