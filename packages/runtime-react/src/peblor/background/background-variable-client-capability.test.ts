import { describe, expect, it } from "vitest";
import type { bgBlock } from "@pb/contracts/types";
import { bgVariableNeedsClient } from "./background-variable-client-capability";

type BgVariable = Extract<bgBlock, { type: "backgroundVariable" }>;

function variableBg(layers: BgVariable["layers"]): BgVariable {
  return { type: "backgroundVariable", layers };
}

describe("bgVariableNeedsClient", () => {
  it("keeps static theme fills on the server path", () => {
    expect(
      bgVariableNeedsClient(variableBg([{ fill: { light: "#fff", dark: "#000" } } as never]))
    ).toBe(false);
  });

  it("still promotes animated backgrounds to the client", () => {
    expect(
      bgVariableNeedsClient(
        variableBg([
          {
            fill: { light: "#fff", dark: "#000" },
            motion: [{ type: "loop", animate: { opacity: [0.4, 1] } }],
          } as never,
        ])
      )
    ).toBe(true);
  });
});
