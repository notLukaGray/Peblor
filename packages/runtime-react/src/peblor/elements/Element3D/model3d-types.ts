import type {
  TextureDef,
  MaterialDef,
  ModelDef,
  SceneDef,
  CanvasDef,
  PostProcessingEffectDef,
} from "@pb/contracts/peblor/core/peblor-schemas";

export type Block = {
  textures?: Record<string, TextureDef>;
  materials?: Record<string, MaterialDef>;
  models?: Record<string, ModelDef>;
  scene: SceneDef;
  canvas?: CanvasDef;
  postProcessing?: PostProcessingEffectDef[];
};

export type { TextureDef, MaterialDef, ModelDef, SceneDef, CanvasDef, PostProcessingEffectDef };
