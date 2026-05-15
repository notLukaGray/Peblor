import { describe, it, expect } from "vitest";
import { getModalProps } from "../resolve";
import type { ModalBuilder } from "../modal";
import { vi } from "vitest";

describe("peblor-get-props", () => {
  describe("getModalProps", () => {
    it("returns null for nonexistent modal", async () => {
      expect(await getModalProps("nonexistent_modal_xyz")).toBeNull();
    });

    it("does not call transformSections when modal does not exist", async () => {
      let called = false;
      const result = await getModalProps("nonexistent_modal_xyz", {
        transformSections: (sections) => {
          called = true;
          return sections;
        },
      });
      expect(result).toBeNull();
      expect(called).toBe(false);
    });

    it("returns modal props with resolvedSections from asset pipeline", async () => {
      vi.resetModules();
      const modal: ModalBuilder = {
        id: "unlock",
        title: "Unlock",
        sectionOrder: ["hero"],
        definitions: {
          hero: {
            type: "contentBlock",
            gap: "0",
            elements: [{ type: "elementBody", text: "Hello unlock" }],
          },
        } as ModalBuilder["definitions"],
      };
      vi.doMock("./modal-load", () => ({
        loadModal: async (id: string) => (id === "unlock" ? modal : null),
      }));

      const { getModalProps: getMockedModalProps } = await import("@pb/core/resolve");
      const props = await getMockedModalProps("unlock");
      expect(props).not.toBeNull();
      expect(props?.id).toBe("unlock");
      expect(props?.title).toBe("Unlock");
      expect(Array.isArray(props?.resolvedSections)).toBe(true);
      expect(props?.resolvedSections?.length).toBeGreaterThanOrEqual(1);
      for (const section of props?.resolvedSections ?? []) {
        expect(section).toHaveProperty("type");
        expect(typeof (section as { type: string }).type).toBe("string");
      }
    });

    it("applies transformSections when provided", async () => {
      vi.resetModules();
      const modal: ModalBuilder = {
        id: "unlock",
        title: "Unlock",
        sectionOrder: ["a", "b"],
        definitions: {
          a: { type: "contentBlock", gap: "0", elements: [] },
          b: { type: "contentBlock", gap: "0", elements: [] },
        } as ModalBuilder["definitions"],
      };
      vi.doMock("./modal-load", () => ({
        loadModal: async (id: string) => (id === "unlock" ? modal : null),
      }));
      const { getModalProps: getMockedModalProps } = await import("@pb/core/resolve");
      const props = await getMockedModalProps("unlock", {
        transformSections: (sections) => sections.slice(0, 1),
      });
      expect(props?.resolvedSections).toHaveLength(1);
    });

    it("supports isMobile option and remains deterministic in shape", async () => {
      vi.resetModules();
      const modal: ModalBuilder = {
        id: "unlock",
        title: "Unlock",
        sectionOrder: ["hero"],
        definitions: {
          hero: { type: "contentBlock", gap: "0", elements: [] },
        } as ModalBuilder["definitions"],
      };
      vi.doMock("./modal-load", () => ({
        loadModal: async (id: string) => (id === "unlock" ? modal : null),
      }));
      const { getModalProps: getMockedModalProps } = await import("@pb/core/resolve");
      const mobile = await getMockedModalProps("unlock", { isMobile: true });
      const desktop = await getMockedModalProps("unlock", { isMobile: false });
      expect(mobile?.id).toBe("unlock");
      expect(desktop?.id).toBe("unlock");
      expect(Array.isArray(mobile?.resolvedSections)).toBe(true);
      expect(Array.isArray(desktop?.resolvedSections)).toBe(true);
      expect(mobile?.resolvedSections.length).toBeGreaterThan(0);
      expect(desktop?.resolvedSections.length).toBeGreaterThan(0);
    });
  });
});
