import { beforeEach, describe, expect, it, vi } from "vitest";

const fsState = {
  files: new Map<string, string>(),
  directories: new Set<string>(),
};

vi.mock("./load/peblor-load-io", () => ({
  CONTENT_DIR: "/virtual/content",
}));

vi.mock("fs", () => {
  const api = {
    promises: {
      readFile(pathLike: string) {
        const raw = fsState.files.get(pathLike);
        if (raw == null) throw new Error(`ENOENT: ${pathLike}`);
        return Promise.resolve(raw);
      },
      stat(pathLike: string) {
        return Promise.resolve({
          isDirectory: () => fsState.directories.has(pathLike),
        });
      },
    },
  };
  return {
    ...api,
    default: api,
  };
});

import { loadModal } from "./modal-load";

describe("modal-load schema validation", () => {
  beforeEach(() => {
    fsState.files.clear();
    fsState.directories.clear();
    fsState.directories.add("/virtual/content/modals");
  });

  it("loads valid modal JSON", async () => {
    fsState.files.set(
      "/virtual/content/modals/signup.json",
      JSON.stringify({
        title: "Sign up",
        sectionOrder: ["hero"],
        definitions: {
          hero: {
            type: "contentBlock",
            gap: "1rem",
            elements: [],
          },
        },
      })
    );

    const modal = await loadModal("signup");
    expect(modal).not.toBeNull();
    expect(modal?.id).toBe("signup");
    expect(modal?.sectionOrder).toEqual(["hero"]);
  });

  it("returns null when modal definitions are schema-invalid", async () => {
    fsState.files.set(
      "/virtual/content/modals/bad.json",
      JSON.stringify({
        title: "Broken modal",
        sectionOrder: ["hero"],
        definitions: {
          hero: { foo: "bar" },
        },
      })
    );

    expect(await loadModal("bad")).toBeNull();
  });
});
