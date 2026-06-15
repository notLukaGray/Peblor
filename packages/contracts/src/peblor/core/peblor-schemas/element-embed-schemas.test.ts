import { describe, expect, it } from "vitest";
import { elementEmbedSchema } from "./element-embed-schemas";

describe("elementEmbed schema", () => {
  it("validates a minimal embed with a required src", () => {
    const result = elementEmbedSchema.safeParse({
      type: "elementEmbed",
      src: "https://www.youtube.com/embed/dQw4w9WgXcQ",
    });
    expect(result.success).toBe(true);
  });

  it("validates an embed with all optional fields", () => {
    const result = elementEmbedSchema.safeParse({
      type: "elementEmbed",
      src: "https://player.vimeo.com/video/123456789",
      title: "Product demo video",
      allow: "autoplay; fullscreen; picture-in-picture",
      allowFullScreen: true,
      loading: "lazy",
      referrerPolicy: "strict-origin-when-cross-origin",
      sandbox: "allow-scripts allow-same-origin",
      width: "100%",
      height: "400px",
      aspectRatio: "16 / 9",
      align: "center",
    });
    expect(result.success).toBe(true);
  });

  it("validates embed with loading: eager", () => {
    const result = elementEmbedSchema.safeParse({
      type: "elementEmbed",
      src: "https://maps.google.com/maps/embed",
      loading: "eager",
    });
    expect(result.success).toBe(true);
  });

  it("rejects a missing src", () => {
    const result = elementEmbedSchema.safeParse({
      type: "elementEmbed",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid loading enum value", () => {
    const result = elementEmbedSchema.safeParse({
      type: "elementEmbed",
      src: "https://example.com/embed",
      loading: "auto",
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid referrerPolicy value", () => {
    const result = elementEmbedSchema.safeParse({
      type: "elementEmbed",
      src: "https://example.com/embed",
      referrerPolicy: "unsafe-everything",
    });
    expect(result.success).toBe(false);
  });
});
