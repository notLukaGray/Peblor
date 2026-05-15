import { describe, expect, it } from "vitest";
import { isPageProtected } from "./page-protection";

describe("isPageProtected", () => {
  it("treats passwordProtected=true as protected", () => {
    expect(isPageProtected({ passwordProtected: true })).toBe(true);
  });

  it("treats visibility=protected as protected", () => {
    expect(isPageProtected({ visibility: "protected" })).toBe(true);
  });

  it("treats both flags together as protected", () => {
    expect(isPageProtected({ passwordProtected: true, visibility: "protected" })).toBe(true);
  });

  it("does not mark normal published page as protected", () => {
    expect(isPageProtected({ visibility: "published", passwordProtected: false })).toBe(false);
  });
});
