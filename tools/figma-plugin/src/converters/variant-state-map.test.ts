import { describe, expect, it } from "vitest";
import { extractVariantGroup } from "./variant-state-map";

describe("variant-state-map selector normalization", () => {
  it("accepts boolean selector values without crashing and matches the family", () => {
    const componentSet = {
      type: "COMPONENT_SET",
      name: "Ghosted Button",
      children: [
        {
          type: "COMPONENT",
          name: "State=Default, Icon=True",
          variantProperties: { State: "Default", Icon: "True" },
          width: 100,
          height: 40,
        },
        {
          type: "COMPONENT",
          name: "State=Hover, Icon=True",
          variantProperties: { State: "Hover", Icon: "True" },
          width: 100,
          height: 40,
        },
        {
          type: "COMPONENT",
          name: "State=Default, Icon=False",
          variantProperties: { State: "Default", Icon: "False" },
          width: 100,
          height: 40,
        },
        {
          type: "COMPONENT",
          name: "State=Hover, Icon=False",
          variantProperties: { State: "Hover", Icon: "False" },
          width: 100,
          height: 40,
        },
      ],
    } as unknown as ComponentSetNode;

    const group = extractVariantGroup(componentSet, { Icon: true });

    expect(group).not.toBeNull();
    expect(group?.matchedFamily).toBe(true);
    expect(group?.defaultVariant.name).toBe("State=Default, Icon=True");
    expect(group?.states.has("hover")).toBe(true);
  });

  it("returns null when no state-like property exists", () => {
    const componentSet = {
      type: "COMPONENT_SET",
      name: "Icon Set",
      children: [
        {
          type: "COMPONENT",
          name: "Size=Sm, Tone=Light",
          variantProperties: { Size: "Sm", Tone: "Light" },
        },
      ],
    } as unknown as ComponentSetNode;
    expect(extractVariantGroup(componentSet)).toBeNull();
  });

  it("marks unmatched selector families as not matched", () => {
    const componentSet = {
      type: "COMPONENT_SET",
      name: "Button",
      children: [
        {
          type: "COMPONENT",
          name: "State=Default, Tone=Light",
          variantProperties: { State: "Default", Tone: "Light" },
        },
        {
          type: "COMPONENT",
          name: "State=Hover, Tone=Light",
          variantProperties: { State: "Hover", Tone: "Light" },
        },
      ],
    } as unknown as ComponentSetNode;
    const group = extractVariantGroup(componentSet, { Tone: "Dark" });
    expect(group).not.toBeNull();
    expect(group?.matchedFamily).toBe(false);
    expect(group?.states.has("hover")).toBe(true);
  });
});
