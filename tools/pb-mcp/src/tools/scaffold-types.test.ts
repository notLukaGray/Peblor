import { describe, expect, it } from "vitest";
import { scaffoldElementTypeTool } from "./scaffold-element-type.js";
import { scaffoldBgTypeTool } from "./scaffold-bg-type.js";
import { scaffoldSectionTypeTool } from "./scaffold-section-type.js";
import { scaffoldActionTypeTool } from "./scaffold-action-type.js";
import { listModuleTypes } from "./list-module-types.js";
import { scaffoldModuleTypeTool } from "./scaffold-module-type.js";

describe("scaffold type tools", () => {
  it("scaffolds an element type", async () => {
    const result = (await scaffoldElementTypeTool.run({ type: "elementHeading" })) as {
      scaffold: Record<string, unknown>;
    };
    expect(result.scaffold.type).toBe("elementHeading");
  });

  it("scaffolds a background type", async () => {
    const result = (await scaffoldBgTypeTool.run({ type: "backgroundImage" })) as {
      scaffold: Record<string, unknown>;
    };
    expect(result.scaffold.type).toBe("backgroundImage");
    expect("image" in result.scaffold).toBe(true);
  });

  it("scaffolds a module type by id when available", async () => {
    const modules = (await listModuleTypes.run({})) as Array<{ id: string }>;
    if (modules.length === 0) return;
    const result = (await scaffoldModuleTypeTool.run({ id: modules[0]!.id })) as {
      scaffold: Record<string, unknown>;
    };
    expect(result.scaffold.type).toBe("module");
  });

  it("scaffolds a section type", async () => {
    const result = (await scaffoldSectionTypeTool.run({ type: "contentBlock" })) as {
      scaffold: Record<string, unknown>;
    };
    expect(result.scaffold.type).toBe("contentBlock");
  });

  it("scaffolds an action type", async () => {
    const result = (await scaffoldActionTypeTool.run({ type: "setVariable" })) as {
      scaffold: Record<string, unknown>;
    };
    expect(result.scaffold.type).toBe("setVariable");
    expect("payload" in result.scaffold).toBe(true);
  });
});
