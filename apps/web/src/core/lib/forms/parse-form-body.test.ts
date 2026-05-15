import { describe, expect, it } from "vitest";
import { parseFormBody } from "./parse-form-body";
import { NextRequest } from "next/server";

function jsonRequest(body: unknown, contentType = "application/json"): NextRequest {
  const text = JSON.stringify(body);
  return new NextRequest("http://localhost/api/test", {
    method: "POST",
    headers: { "content-type": contentType },
    body: text,
  });
}

describe("parseFormBody", () => {
  it("returns 415 when Content-Type is present but not JSON", async () => {
    const request = {
      headers: new Headers({ "content-type": "text/plain" }),
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("{}"));
          controller.close();
        },
      }),
    };

    const result = await parseFormBody(request as Parameters<typeof parseFormBody>[0]);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(415);
  });

  it("returns 413 when body exceeds limit despite lying content-length", async () => {
    const oversizedValue = "x".repeat(200 * 1024);
    const bodyText = JSON.stringify({ message: oversizedValue });
    const request = {
      headers: new Headers({ "content-length": "100" }),
      body: new ReadableStream<Uint8Array>({
        start(controller) {
          controller.enqueue(new TextEncoder().encode(bodyText));
          controller.close();
        },
      }),
    };

    const result = await parseFormBody(request as Parameters<typeof parseFormBody>[0]);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(413);
  });

  it("parses valid JSON object into payload", async () => {
    const req = jsonRequest({ name: "Ada", count: 2, active: true, tags: ["a", "b"] });
    const result = await parseFormBody(req);
    expect(result).not.toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      expect(result.payload.name).toBe("Ada");
      expect(result.payload.count).toBe("2");
      expect(result.payload.active).toBe(true);
      expect(result.payload.tags).toEqual(["a", "b"]);
    }
  });

  it("returns 400 for invalid JSON", async () => {
    const request = new NextRequest("http://localhost/api/test", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: "{not-json",
    });
    const result = await parseFormBody(request);
    expect(result).toBeInstanceOf(Response);
    expect((result as Response).status).toBe(400);
  });

  it("returns 400 when body is JSON null or array", async () => {
    expect((await parseFormBody(jsonRequest(null))) as Response).toMatchObject({ status: 400 });
    expect((await parseFormBody(jsonRequest([1, 2]))) as Response).toMatchObject({ status: 400 });
  });

  it("skips keys starting with underscore", async () => {
    const req = jsonRequest({ keep: "x", _hidden: "y" });
    const result = await parseFormBody(req);
    expect(result).not.toBeInstanceOf(Response);
    if (!(result instanceof Response)) {
      expect(result.payload.keep).toBe("x");
      expect(result.payload._hidden).toBeUndefined();
    }
  });
});
