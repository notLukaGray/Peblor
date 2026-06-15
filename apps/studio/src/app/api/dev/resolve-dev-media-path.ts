import path from "path";

// Resolve relative to the project root (apps/studio is two levels deep).
// __dirname is apps/studio/src/app/api/dev at build time.
const PROJECT_ROOT = path.resolve(__dirname, "../../../../../..");

const DEV_MEDIA_ROOTS = [
  path.resolve(PROJECT_ROOT, "media"),
  path.resolve(PROJECT_ROOT, "content"),
];

export function resolveDevMediaPath(inputPath: string): string | null {
  if (!path.isAbsolute(inputPath)) return null;
  const normalized = path.normalize(inputPath);
  const isAllowed = DEV_MEDIA_ROOTS.some(
    (root) => normalized === root || normalized.startsWith(`${root}${path.sep}`)
  );
  return isAllowed ? normalized : null;
}
