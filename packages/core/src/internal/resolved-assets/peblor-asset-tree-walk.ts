import type { bgBlock, ElementBlock, SectionBlock } from "@pb/contracts";
import { ASSET_URL_KEYS, MODEL3D_ASSET_KEYS, NESTED_SECTION_ELEMENT_TYPES } from "@pb/contracts";

export type AssetTreeNodeKind = "standard" | "model3d" | "bg" | "element" | "section";

/** Check whether any asset URL key exists in the object, avoiding a Set→array spread. */
function hasAssetUrlKey(obj: Readonly<Record<string, unknown>>): boolean {
  for (const key of ASSET_URL_KEYS) {
    if (key in obj) return true;
  }
  return false;
}

/** Element types that have nested asset structures requiring deep traversal. */
const DEEP_TRAVERSAL_ELEMENT_TYPES = new Set([
  "elementModel3D",
  "elementVideo",
  "elementAudio",
  ...NESTED_SECTION_ELEMENT_TYPES,
  "elementModule",
]);

export type AssetKeyVisitor = (
  assetKey: string,
  value: string,
  node: Record<string, unknown>,
  kind: AssetTreeNodeKind
) => void;

function visitStandardAssetKeys(
  obj: Record<string, unknown>,
  kind: AssetTreeNodeKind,
  visitor: AssetKeyVisitor
): void {
  for (const key of ASSET_URL_KEYS) {
    const v = obj[key];
    if (typeof v === "string") {
      visitor(key, v, obj, kind);
    }
  }
}

function walkModel3DNode(
  obj: Readonly<Record<string, unknown>>,
  visitor: AssetKeyVisitor
): Record<string, unknown> {
  const next: Record<string, unknown> = { ...obj };
  for (const key of MODEL3D_ASSET_KEYS) {
    const v = next[key];
    if (typeof v === "string") {
      visitor(key, v, next, "model3d");
    }
  }

  const textures = next.textures as Record<string, Record<string, unknown>> | undefined;
  if (textures && typeof textures === "object") {
    const nextTextures: Record<string, Record<string, unknown>> = {};
    for (const [key, def] of Object.entries(textures)) {
      if (def && typeof def === "object") {
        nextTextures[key] = walkModel3DNode(def, visitor);
      } else {
        nextTextures[key] = def;
      }
    }
    next.textures = nextTextures;
  }

  const materials = next.materials as Record<string, unknown> | undefined;
  if (materials && typeof materials === "object") {
    const nextMaterials: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(materials)) {
      if (def && typeof def === "object") {
        nextMaterials[key] = walkModel3DNode(def as Record<string, unknown>, visitor);
      } else {
        nextMaterials[key] = def;
      }
    }
    next.materials = nextMaterials;
  }

  const models = next.models as Record<string, Record<string, unknown>> | undefined;
  if (models && typeof models === "object") {
    const nextModels: Record<string, Record<string, unknown>> = {};
    for (const [key, def] of Object.entries(models)) {
      if (def && typeof def === "object") {
        nextModels[key] = walkModel3DNode(def, visitor);
      } else {
        nextModels[key] = def;
      }
    }
    next.models = nextModels;
  }

  const scene = next.scene as Record<string, unknown> | undefined;
  if (scene && typeof scene === "object") {
    const nextScene = walkModel3DNode(scene, visitor);
    next.scene = nextScene;

    const env = nextScene.environment as Record<string, unknown> | undefined;
    if (env && typeof env === "object") {
      nextScene.environment = walkModel3DNode(env, visitor);
    }

    const contents = nextScene.contents as Record<string, unknown> | undefined;
    if (contents && typeof contents === "object") {
      const nextContents = { ...contents };
      nextScene.contents = nextContents;
      const modelInstances = nextContents.models as Record<string, unknown>[] | undefined;
      if (Array.isArray(modelInstances)) {
        nextContents.models = modelInstances.map((inst) =>
          inst && typeof inst === "object"
            ? walkModel3DNode(inst as Record<string, unknown>, visitor)
            : inst
        );
      }
    }
  }

  return next;
}

function walkBgBlockInternal(
  obj: Readonly<Record<string, unknown>>,
  visitor: AssetKeyVisitor
): Record<string, unknown> {
  // Skip copy when no asset keys present and block is not a backgroundTransition.
  if (!hasAssetUrlKey(obj) && obj.type !== "backgroundTransition") {
    return obj;
  }

  const next: Record<string, unknown> = { ...obj };
  visitStandardAssetKeys(next, "bg", visitor);

  if (next.type !== "backgroundTransition") return next;

  const from = next.from as bgBlock | undefined;
  const to = next.to as bgBlock | undefined;

  if (from && typeof from === "object" && "type" in from) {
    next.from = walkBgBlockInternal(from as Record<string, unknown>, visitor) as bgBlock;
  }
  if (to && typeof to === "object" && "type" in to) {
    next.to = walkBgBlockInternal(to as Record<string, unknown>, visitor) as bgBlock;
  }
  return next;
}

export function walkBgBlock(block: Readonly<bgBlock>, visitor: AssetKeyVisitor): bgBlock {
  if (!block || typeof block !== "object") return block;
  return walkBgBlockInternal(block as Record<string, unknown>, visitor) as bgBlock;
}

export function walkElement(
  element: Readonly<ElementBlock>,
  visitor: AssetKeyVisitor
): ElementBlock {
  if (!element || typeof element !== "object") return element;

  const elRecord = element as Record<string, unknown>;
  // Skip spread copy for elements without asset URL keys (text-only elements).
  // Exceptions: elements with nested asset structures (model3D, video, audio,
  // elementGroup, elementInfiniteScroll, elementModule) need deep traversal.
  if (!hasAssetUrlKey(elRecord) && !DEEP_TRAVERSAL_ELEMENT_TYPES.has(elRecord.type as string)) {
    return element;
  }

  let el = { ...elRecord };

  // Standard asset keys on the element itself (including elementModel3D).
  visitStandardAssetKeys(el, "element", visitor);

  if ((el.type === "elementVideo" || el.type === "elementAudio") && Array.isArray(el.sources)) {
    el.sources = (el.sources as unknown[]).map((source) => {
      if (!source || typeof source !== "object") return source;
      const nextSource = { ...(source as Record<string, unknown>) };
      visitStandardAssetKeys(nextSource, "element", visitor);
      return nextSource;
    });
  }

  // 3D subtree for elementModel3D.
  if (el.type === "elementModel3D") {
    el = walkModel3DNode(el, visitor);
  }

  // Element group / infinite scroll: recurse into section.definitions[*].
  const groupSection = (
    el as {
      section?: { definitions?: Record<string, unknown> };
    }
  ).section;
  if (
    NESTED_SECTION_ELEMENT_TYPES.includes(
      el.type as (typeof NESTED_SECTION_ELEMENT_TYPES)[number]
    ) &&
    groupSection?.definitions &&
    typeof groupSection.definitions === "object"
  ) {
    const nextGroupSection = { ...groupSection };
    const nextDefinitions: Record<string, unknown> = {};
    for (const [key, def] of Object.entries(groupSection.definitions)) {
      if (def && typeof def === "object") {
        nextDefinitions[key] = walkElement(def as ElementBlock, visitor);
      } else {
        nextDefinitions[key] = def;
      }
    }
    nextGroupSection.definitions = nextDefinitions;
    (el as { section?: { definitions?: Record<string, unknown> } }).section = nextGroupSection;
  }

  // Element module: recurse into moduleConfig.slots[*].section.definitions[*].
  const moduleConfigSource = el.moduleConfig as Record<string, unknown> | undefined;
  const moduleConfig = moduleConfigSource ? { ...moduleConfigSource } : undefined;
  if (moduleConfig && typeof moduleConfig === "object" && moduleConfig.slots) {
    const slots = moduleConfig.slots as Record<
      string,
      { section?: { definitions?: Record<string, unknown> } }
    >;
    const nextSlots: Record<string, { section?: { definitions?: Record<string, unknown> } }> = {};
    for (const [slotKey, slot] of Object.entries(slots)) {
      const section = slot?.section;
      if (!section?.definitions || typeof section.definitions !== "object") {
        nextSlots[slotKey] = slot;
        continue;
      }
      const nextSection = { ...section };
      const nextDefinitions: Record<string, unknown> = {};
      for (const [defKey, def] of Object.entries(section.definitions)) {
        if (def && typeof def === "object") {
          nextDefinitions[defKey] = walkElement(def as ElementBlock, visitor);
        } else {
          nextDefinitions[defKey] = def;
        }
      }
      nextSection.definitions = nextDefinitions;
      nextSlots[slotKey] = { ...slot, section: nextSection };
    }
    moduleConfig.slots = nextSlots;
    el.moduleConfig = moduleConfig;
  }

  return el as ElementBlock;
}

export function walkSectionKeys(
  section: Readonly<SectionBlock>,
  visitor: AssetKeyVisitor
): SectionBlock {
  if (!section || typeof section !== "object") return section;
  const sectionRecord = section as Record<string, unknown>;
  if (!hasAssetUrlKey(sectionRecord)) {
    return section;
  }
  const next = { ...sectionRecord };
  visitStandardAssetKeys(next, "section", visitor);
  return next as SectionBlock;
}

export function walkSection(
  section: Readonly<SectionBlock>,
  visitor: AssetKeyVisitor
): SectionBlock {
  if (!section || typeof section !== "object") return section;

  const s = walkSectionKeys(section, visitor) as SectionBlock & Record<string, unknown>;

  const hasElements =
    (s.type === "contentBlock" || s.type === "scrollContainer" || s.type === "sectionColumn") &&
    Array.isArray(s.elements);
  if (hasElements) {
    s.elements = (s.elements as ElementBlock[]).map((el) =>
      el && typeof el === "object" ? walkElement(el, visitor) : el
    );
  }

  if (s.type === "revealSection") {
    const collapsed = (s as { collapsedElements?: ElementBlock[] }).collapsedElements;
    const revealed = (s as { revealedElements?: ElementBlock[] }).revealedElements;
    if (Array.isArray(collapsed)) {
      (s as { collapsedElements?: ElementBlock[] }).collapsedElements = collapsed.map((el) =>
        el && typeof el === "object" ? walkElement(el, visitor) : el
      );
    }
    if (Array.isArray(revealed)) {
      (s as { revealedElements?: ElementBlock[] }).revealedElements = revealed.map((el) =>
        el && typeof el === "object" ? walkElement(el, visitor) : el
      );
    }
  }

  return s as SectionBlock;
}

export function walkPeblorAssetTree(
  bg: bgBlock | null,
  sections: SectionBlock[],
  visitor: AssetKeyVisitor
): void {
  if (bg) {
    walkBgBlock(bg, visitor);
  }

  for (let i = 0; i < sections.length; i += 1) {
    const section = sections[i];
    if (section && typeof section === "object") {
      walkSection(section, visitor);
    }
  }
}
