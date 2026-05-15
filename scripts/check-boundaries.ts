#!/usr/bin/env npx tsx

import fs from "fs";
import path from "path";

type FileRule = {
  id: string;
  description: string;
  files: string[];
  pattern: RegExp;
};

type DirRule = {
  id: string;
  description: string;
  rootDir: string;
  extensions: Set<string>;
  pattern: RegExp;
};

type Violation = {
  ruleId: string;
  file: string;
  line: number;
  text: string;
};

const cwd = process.cwd();

const dirRules: DirRule[] = [
  {
    id: "core-to-app",
    description: "packages/core/src/internal/** cannot import from src/app/**",
    rootDir: "packages/core/src/internal",
    extensions: new Set([".ts", ".tsx"]),
    pattern: /from\s+["']@\/app\//,
  },
  {
    id: "core-ui-to-peblor",
    description: "apps/web/src/core/** cannot import from src/peblor/**",
    rootDir: "apps/web/src/core",
    extensions: new Set([".ts", ".tsx"]),
    pattern: /from\s+["']@\/peblor\//,
  },
  {
    id: "elements-to-app-theme",
    description:
      "packages/runtime-react/src/peblor/elements/** cannot import from src/app/theme/**",
    rootDir: "packages/runtime-react/src/peblor/elements",
    extensions: new Set([".ts", ".tsx"]),
    pattern: /from\s+["']@\/app\/theme\//,
  },
];

const fileRules: FileRule[] = [
  {
    id: "root-layout-dev-import",
    description: "Root layout must not import dev-only peblor modules",
    files: ["apps/web/src/app/layout.tsx", "apps/web/src/core/ui/app-layout.tsx"],
    pattern: /from\s+["']@\/peblor\/dev\//,
  },
];

function walk(dir: string, out: string[]): void {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      walk(fullPath, out);
    } else if (entry.isFile()) {
      out.push(fullPath);
    }
  }
}

function toPosix(relPath: string): string {
  return relPath.split(path.sep).join("/");
}

function collectViolationsInFile(
  relPath: string,
  content: string,
  ruleId: string,
  pattern: RegExp
): Violation[] {
  const lines = content.split(/\r?\n/);
  const violations: Violation[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i] ?? "";
    if (pattern.test(line)) {
      violations.push({
        ruleId,
        file: relPath,
        line: i + 1,
        text: line.trim(),
      });
    }
  }
  return violations;
}

function run(): number {
  const violations: Violation[] = [];

  for (const rule of dirRules) {
    const absoluteRoot = path.join(cwd, rule.rootDir);
    if (!fs.existsSync(absoluteRoot)) continue;
    const files: string[] = [];
    walk(absoluteRoot, files);
    for (const file of files) {
      const ext = path.extname(file);
      if (!rule.extensions.has(ext)) continue;
      const relPath = toPosix(path.relative(cwd, file));
      const content = fs.readFileSync(file, "utf8");
      violations.push(...collectViolationsInFile(relPath, content, rule.id, rule.pattern));
    }
  }

  for (const rule of fileRules) {
    for (const relPath of rule.files) {
      const absolutePath = path.join(cwd, relPath);
      if (!fs.existsSync(absolutePath)) continue;
      const content = fs.readFileSync(absolutePath, "utf8");
      violations.push(...collectViolationsInFile(relPath, content, rule.id, rule.pattern));
    }
  }

  if (violations.length === 0) {
    console.log(
      JSON.stringify(
        {
          status: "pass",
          checkedRules: [...dirRules.map((r) => r.id), ...fileRules.map((r) => r.id)],
          violationCount: 0,
        },
        null,
        2
      )
    );
    return 0;
  }

  const grouped = new Map<string, Violation[]>();
  for (const v of violations) {
    const existing = grouped.get(v.ruleId) ?? [];
    existing.push(v);
    grouped.set(v.ruleId, existing);
  }

  const rulesById = new Map<string, string>();
  for (const rule of dirRules) rulesById.set(rule.id, rule.description);
  for (const rule of fileRules) rulesById.set(rule.id, rule.description);

  const out = {
    status: "fail",
    violationCount: violations.length,
    violationsByRule: Array.from(grouped.entries()).map(([ruleId, items]) => ({
      ruleId,
      description: rulesById.get(ruleId) ?? ruleId,
      count: items.length,
      items,
    })),
  };

  console.error(JSON.stringify(out, null, 2));
  return 1;
}

process.exit(run());
