import { describe, expect, it } from "vitest";
import { isRequestHttps } from "./cookie-request-secure";

describe("isRequestHttps", () => {
  it("returns true when x-forwarded-proto includes https", () => {
    const h = new Headers([["x-forwarded-proto", "https"]]);
    expect(isRequestHttps(h)).toBe(true);
  });

  it("returns false when x-forwarded-proto is http", () => {
    const h = new Headers([["x-forwarded-proto", "http"]]);
    expect(isRequestHttps(h)).toBe(false);
  });

  it("honors the first forwarded proto value", () => {
    const h = new Headers([["x-forwarded-proto", "https, http"]]);
    expect(isRequestHttps(h)).toBe(true);
  });
});
