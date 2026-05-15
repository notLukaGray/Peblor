import type { PbImageAnimationDefaults } from "@/app/theme/pb-builder-defaults";
import type { ImageRuntimeDraft } from "@/app/dev/elements/image/types";
import type { WorkbenchElementKey } from "@/app/dev/workbench/workbench-session";

export type PersistedShape<K extends string, V> = {
  v: 1;
  defaultVariant: K;
  variants: Record<K, V>;
};

export type TypographyControllerOptions<
  K extends string,
  V extends { animation: PbImageAnimationDefaults },
  P extends PersistedShape<K, V>,
> = {
  elementKey: WorkbenchElementKey;
  defaults: { defaultVariant: K; variants: Record<K, V> };
  variantOrder: K[];
  readPersisted: () => P | null;
  normalizeVariant: (seed: V, incoming?: Partial<V>) => V;
  buildSnippet: (variantKey: K, variant: V, draft: ImageRuntimeDraft) => Record<string, unknown>;
  toExportJson: (data: P) => string;
  toPersisted: (defaultVariant: K, variants: Record<K, V>) => P;
};
