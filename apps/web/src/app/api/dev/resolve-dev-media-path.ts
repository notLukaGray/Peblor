import path from "path";

const DEV_MEDIA_ROOTS = [
  path.resolve(process.cwd(), "../../media"),
  path.resolve(process.cwd(), "../../content"),
];

export function resolveDevMediaPath(inputPath: string): string | null {
  if (!path.isAbsolute(inputPath)) return null;
  const normalized = path.normalize(inputPath);
  const isAllowed = DEV_MEDIA_ROOTS.some(
    (root) => normalized === root || normalized.startsWith(`${root}${path.sep}`)
  );
  return isAllowed ? normalized : null;
}
