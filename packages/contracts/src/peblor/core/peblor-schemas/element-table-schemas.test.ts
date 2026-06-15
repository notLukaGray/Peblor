import { describe, expect, it } from "vitest";
import { elementTableSchema } from "./element-table-schemas";

describe("elementTable schema", () => {
  it("validates a minimal table with required rows", () => {
    const result = elementTableSchema.safeParse({
      type: "elementTable",
      rows: [
        ["Cell A", "Cell B"],
        ["Cell C", "Cell D"],
      ],
    });
    expect(result.success).toBe(true);
  });

  it("validates a table with optional headers", () => {
    const result = elementTableSchema.safeParse({
      type: "elementTable",
      headers: ["Name", "Value"],
      rows: [
        ["alpha", "1"],
        ["beta", "2"],
      ],
    });
    expect(result.success).toBe(true);
  });

  it("validates a table with caption", () => {
    const result = elementTableSchema.safeParse({
      type: "elementTable",
      caption: "Quarterly results",
      headers: ["Q", "Revenue"],
      rows: [["Q1", "$1M"]],
    });
    expect(result.success).toBe(true);
  });

  it("validates columnAlign values", () => {
    const result = elementTableSchema.safeParse({
      type: "elementTable",
      headers: ["Label", "Amount", "Status"],
      rows: [["Foo", "100", "OK"]],
      columnAlign: ["left", "right", "center"],
    });
    expect(result.success).toBe(true);
  });

  it("rejects an invalid columnAlign value", () => {
    const result = elementTableSchema.safeParse({
      type: "elementTable",
      rows: [["a"]],
      columnAlign: ["justify"],
    });
    expect(result.success).toBe(false);
  });

  it("validates a table with layout and typography overrides", () => {
    const result = elementTableSchema.safeParse({
      type: "elementTable",
      rows: [["X"]],
      fontSize: "0.875rem",
      lineHeight: 1.5,
      width: "100%",
    });
    expect(result.success).toBe(true);
  });

  it("rejects when rows is missing", () => {
    const result = elementTableSchema.safeParse({
      type: "elementTable",
      headers: ["Name"],
    });
    expect(result.success).toBe(false);
  });

  it("validates an empty rows array", () => {
    const result = elementTableSchema.safeParse({
      type: "elementTable",
      rows: [],
    });
    expect(result.success).toBe(true);
  });
});
