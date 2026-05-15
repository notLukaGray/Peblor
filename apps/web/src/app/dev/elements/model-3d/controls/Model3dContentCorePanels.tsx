import type { Model3dVariantDefaults } from "../types";
import type { Model3dElementDevController } from "../useModel3dElementDevController";
import { Model3dJsonRecordEditor } from "./Model3dJsonRecordEditor";
import {
  STARTER_MATERIALS,
  STARTER_MODELS,
  STARTER_SCENE,
  STARTER_TEXTURES,
} from "./model3d-starters";

function describeKeys(keys: string[]): string {
  return keys.length > 0 ? keys.join(", ") : "none";
}

export function LockedStageCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="sm:col-span-2 rounded border border-dashed border-border/70 bg-muted/10 px-3 py-2">
      <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">{title}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">{body}</p>
    </div>
  );
}

export function Model3dBaseFields({
  active,
  activeVariant,
  setVariantPatch,
}: {
  active: Model3dElementDevController["active"];
  activeVariant: Model3dElementDevController["activeVariant"];
  setVariantPatch: Model3dElementDevController["setVariantPatch"];
}) {
  return (
    <>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Aria label
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={typeof active.ariaLabel === "string" ? active.ariaLabel : ""}
          onChange={(e) =>
            setVariantPatch(activeVariant, { ariaLabel: e.target.value || undefined })
          }
          placeholder="3D scene"
        />
      </label>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Module key
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground"
          value={typeof active.module === "string" ? active.module : ""}
          onChange={(e) => setVariantPatch(activeVariant, { module: e.target.value || undefined })}
          placeholder="optional module id"
        />
      </label>
      <label className="space-y-1.5">
        <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
          Aspect ratio
        </span>
        <input
          type="text"
          className="w-full rounded border border-border bg-background px-3 py-2 font-mono text-[11px] text-foreground placeholder:text-muted-foreground/70"
          value={typeof active.aspectRatio === "string" ? active.aspectRatio : ""}
          onChange={(e) => setVariantPatch(activeVariant, { aspectRatio: e.target.value })}
          placeholder="e.g. 16/9"
        />
      </label>
      <label className="inline-flex items-center gap-2 rounded border border-border/60 bg-background/60 px-3 py-2 text-[11px] text-foreground">
        <input
          type="checkbox"
          checked={active.initiallyLoaded === true}
          onChange={(e) => setVariantPatch(activeVariant, { initiallyLoaded: e.target.checked })}
        />
        Initially loaded
      </label>
    </>
  );
}

export function Model3dAssetEditors({
  active,
  activeVariant,
  setVariantPatch,
  scopeKey,
  textureKeys,
  materialKeys,
  modelKeys,
}: {
  active: Model3dElementDevController["active"];
  activeVariant: Model3dElementDevController["activeVariant"];
  setVariantPatch: Model3dElementDevController["setVariantPatch"];
  scopeKey: string;
  textureKeys: string[];
  materialKeys: string[];
  modelKeys: string[];
}) {
  return (
    <>
      <Model3dJsonRecordEditor
        key={`${scopeKey}-textures`}
        label="Textures JSON"
        description="Import image/video texture definitions by key."
        value={active.textures}
        starter={STARTER_TEXTURES}
        placeholder='{"albedoTex":{"type":"image","source":"/assets/.../albedo.jpg"}}'
        applyLabel="Apply textures"
        keysLabel={`Keys: ${describeKeys(textureKeys)}`}
        onApply={(value) =>
          setVariantPatch(activeVariant, { textures: value } as Partial<Model3dVariantDefaults>)
        }
      />
      <Model3dJsonRecordEditor
        key={`${scopeKey}-materials`}
        label="Materials JSON"
        description="Define material slots and map them to texture keys."
        value={active.materials}
        starter={STARTER_MATERIALS}
        placeholder='{"body":{"albedo":"albedoTex","roughness":0.65}}'
        applyLabel="Apply materials"
        keysLabel={`Keys: ${describeKeys(materialKeys)}`}
        onApply={(value) =>
          setVariantPatch(activeVariant, { materials: value } as Partial<Model3dVariantDefaults>)
        }
      />
      <Model3dJsonRecordEditor
        key={`${scopeKey}-models`}
        label="Models JSON"
        description="Map model keys to geometry URLs and material bindings."
        value={active.models}
        starter={STARTER_MODELS}
        placeholder='{"heroModel":{"geometry":"/assets/.../hero.glb","materialBindings":{"Body":"body"}}}'
        applyLabel="Apply models"
        keysLabel={`Keys: ${describeKeys(modelKeys)}`}
        onApply={(value) =>
          setVariantPatch(activeVariant, { models: value } as Partial<Model3dVariantDefaults>)
        }
      />
      <Model3dJsonRecordEditor
        key={`${scopeKey}-scene`}
        label="Scene JSON"
        description="Control camera, lights, and model instances for the scene."
        value={active.scene}
        starter={STARTER_SCENE}
        placeholder='{"camera":{"type":"perspective","position":[0,0.7,6]},"contents":{"models":[{"model":"heroModel"}]}}'
        applyLabel="Apply scene"
        requireCamera
        onApply={(value) =>
          setVariantPatch(activeVariant, { scene: value } as Partial<Model3dVariantDefaults>)
        }
      />
    </>
  );
}
