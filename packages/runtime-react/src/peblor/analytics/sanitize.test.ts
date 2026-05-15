import { describe, expect, it } from "vitest";
import { sanitizeProps } from "./sanitize";

describe("sanitizeProps", () => {
  it("returns undefined for undefined input", () => {
    expect(sanitizeProps(undefined)).toBeUndefined();
  });

  it("passes through safe values", () => {
    const input = { name: "John", age: 30, active: true };
    expect(sanitizeProps(input)).toEqual(input);
  });

  it("redacts email addresses in string values", () => {
    const input = { email: "john@example.com", name: "John" };
    const result = sanitizeProps(input);
    expect(result?.email).toBe("[redacted]");
    expect(result?.name).toBe("John");
  });

  it("redacts phone numbers in string values", () => {
    const input = { phone: "555-123-4567", name: "John" };
    const result = sanitizeProps(input);
    expect(result?.phone).toBe("[redacted]");
    expect(result?.name).toBe("John");
  });

  it("redacts emails and phones in nested objects", () => {
    const input = { user: { email: "test@example.com", phone: "+1 555-123-4567" } };
    const result = sanitizeProps(input);
    expect((result?.user as Record<string, unknown>)?.email).toBe("[redacted]");
    expect((result?.user as Record<string, unknown>)?.phone).toBe("[redacted]");
  });

  it("redacts emails and phones in arrays", () => {
    const input = { contacts: ["alice@example.com", "555-123-4567", "bob@test.org"] };
    const result = sanitizeProps(input);
    expect(result?.contacts).toEqual(["[redacted]", "[redacted]", "[redacted]"]);
  });

  it("handles null values", () => {
    const input = { email: null, name: "John" };
    const result = sanitizeProps(input);
    expect(result?.email).toBeNull();
    expect(result?.name).toBe("John");
  });

  it("handles numbers without redaction", () => {
    const input = { count: 42, price: 9.99 };
    const result = sanitizeProps(input);
    expect(result?.count).toBe(42);
    expect(result?.price).toBe(9.99);
  });
});
