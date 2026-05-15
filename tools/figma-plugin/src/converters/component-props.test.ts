import { describe, expect, it } from "vitest";
import { extractComponentProps } from "./component-props";

describe("extractComponentProps", () => {
  it("maps suffixed component property names and preserves raw/base override keys", () => {
    const instance = {
      componentProperties: {
        "Button Text#0:1": { type: "TEXT", value: "Buy now" },
        "Link URL#0:2": { type: "TEXT", value: "https://example.com" },
        "Visible#0:3": { type: "BOOLEAN", value: false },
        "Autoplay#0:4": { type: "BOOLEAN", value: true },
      },
    } as unknown as InstanceNode;

    const extracted = extractComponentProps(instance);
    expect(extracted.label).toBe("Buy now");
    expect(extracted.href).toBe("https://example.com");
    expect(extracted.hidden).toBe(true);
    expect(extracted.autoplay).toBe(true);
    expect(extracted["Button Text"]).toBe("Buy now");
    expect(extracted["Button Text#0:1"]).toBe("Buy now");
  });

  it("inverts visible boolean into hidden", () => {
    const instance = {
      componentProperties: {
        "Visible#0:1": { type: "BOOLEAN", value: false },
      },
    } as unknown as InstanceNode;
    const extracted = extractComponentProps(instance);
    expect(extracted.hidden).toBe(true);
  });

  it("returns empty object when component properties are missing", () => {
    const extracted = extractComponentProps({ type: "INSTANCE" } as InstanceNode);
    expect(extracted).toEqual({});
  });
});
