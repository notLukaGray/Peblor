import { describe, expect, it } from "vitest";
import { elementVideoSchema } from "./element-content-schemas";

const BASE_VIDEO = {
  type: "elementVideo" as const,
  src: "https://cdn.example.com/video.mp4",
  poster: "https://cdn.example.com/poster.jpg",
};

describe("elementVideo tracks schema", () => {
  it("accepts a video with no tracks (field is optional)", () => {
    const result = elementVideoSchema.safeParse(BASE_VIDEO);
    expect(result.success).toBe(true);
  });

  it("accepts a video with a valid subtitles track", () => {
    const result = elementVideoSchema.safeParse({
      ...BASE_VIDEO,
      tracks: [
        {
          src: "https://cdn.example.com/captions-en.vtt",
          kind: "subtitles",
          srclang: "en",
          label: "English",
          default: true,
        },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a video with multiple tracks of different kinds", () => {
    const result = elementVideoSchema.safeParse({
      ...BASE_VIDEO,
      tracks: [
        {
          src: "https://cdn.example.com/sub-en.vtt",
          kind: "subtitles",
          srclang: "en",
          label: "English",
          default: true,
        },
        {
          src: "https://cdn.example.com/sub-fr.vtt",
          kind: "subtitles",
          srclang: "fr",
          label: "French",
        },
        {
          src: "https://cdn.example.com/cap-en.vtt",
          kind: "captions",
          srclang: "en",
          label: "English (CC)",
        },
        { src: "https://cdn.example.com/chapters.vtt", kind: "chapters" },
        { src: "https://cdn.example.com/meta.vtt", kind: "metadata" },
        { src: "https://cdn.example.com/desc.vtt", kind: "descriptions" },
      ],
    });
    expect(result.success).toBe(true);
  });

  it("accepts a track with only the required src field", () => {
    const result = elementVideoSchema.safeParse({
      ...BASE_VIDEO,
      tracks: [{ src: "https://cdn.example.com/captions.vtt" }],
    });
    expect(result.success).toBe(true);
  });

  it("rejects a track missing the required src field", () => {
    const result = elementVideoSchema.safeParse({
      ...BASE_VIDEO,
      tracks: [{ kind: "captions", srclang: "en" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects an invalid kind enum value", () => {
    const result = elementVideoSchema.safeParse({
      ...BASE_VIDEO,
      tracks: [{ src: "https://cdn.example.com/sub.vtt", kind: "transcript" }],
    });
    expect(result.success).toBe(false);
  });

  it("rejects a non-array tracks value", () => {
    const result = elementVideoSchema.safeParse({
      ...BASE_VIDEO,
      tracks: "https://cdn.example.com/captions.vtt",
    });
    expect(result.success).toBe(false);
  });
});
