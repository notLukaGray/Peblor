import type { FontWeightMap } from "@/app/fonts/config";
import { inferWeightStyleFromFileName } from "@/app/dev/fonts/local-font-preview";
import { WEIGHT_NAMES } from "./font-dev-persistence";

export function initialLocalFromFileNames(fileNames: string[]): {
  weights: FontWeightMap;
  localRoleFiles: Partial<Record<keyof FontWeightMap, string>>;
} {
  if (fileNames.length === 0) {
    return { weights: {}, localRoleFiles: {} };
  }
  const weights: FontWeightMap = {};
  const localRoleFiles: Partial<Record<keyof FontWeightMap, string>> = {};
  for (let i = 0; i < WEIGHT_NAMES.length; i++) {
    const name = WEIGHT_NAMES[i]!;
    const fileName = fileNames[i % fileNames.length]!;
    weights[name] = inferWeightStyleFromFileName(fileName).weight;
    localRoleFiles[name] = fileName;
  }
  return { weights, localRoleFiles };
}
