import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";
import prettierConfig from "eslint-config-prettier";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  prettierConfig,
  {
    rules: {
      "no-console": ["error", { allow: ["warn", "error"] }],
      "no-debugger": "error",
      "no-unused-vars": "off",
      "@typescript-eslint/no-unused-vars": [
        "error",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
      "prefer-const": "error",
      "no-var": "error",
      "object-shorthand": "error",
      "prefer-arrow-callback": "error",
      "@next/next/no-html-link-for-pages": "off",
    },
  },

  {
    files: ["packages/runtime-react/src/peblor/server/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: [
                "framer-motion",
                "zustand",
                "three",
                "@rive-app/*",
                "hls.js",
                "next/navigation",
                "@/peblor/elements",
                "@/peblor/elements/index",
                "@/peblor/elements/Shared/ElementRenderer",
                "../elements",
                "../elements/index",
                "../elements/Shared/ElementRenderer",
                "../../elements",
                "../../elements/index",
                "../../elements/Shared/ElementRenderer",
              ],
              message:
                "peblor/server/** must stay server-safe and cannot import client runtimes or registries.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["scripts/*.ts", "scripts/**/*.ts", "tools/dev-hls-server/**/*.ts"],
    rules: {
      "no-console": "off",
    },
  },

  {
    ignores: ["scripts/**/*.mjs"],
  },

  {
    files: [
      "src/peblor/elements/ElementImage.tsx",
      "apps/web/src/peblor/elements/ElementImage.tsx",
      "packages/runtime-react/src/peblor/elements/ElementImage.tsx",
      "packages/runtime-react/src/peblor/server/elements/ServerElementImage.tsx",
    ],
    rules: {
      // Intrinsic/hug sizing branch intentionally uses a native <img>.
      "@next/next/no-img-element": "off",
    },
  },

  {
    files: ["packages/core/src/internal/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/**"],
              message:
                "packages/core/internal cannot import from src/app. Use the host config adapter instead.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["apps/web/src/core/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/peblor/**", "@/app/**"],
              message:
                "src/core/** cannot import from src/peblor/** or src/app/**. Use @/core/lib/ for shared utilities.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["packages/runtime-react/src/peblor/elements/**/*.{ts,tsx}"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@/app/theme/**"],
              message:
                "src/peblor/elements/** cannot import app theme modules directly. Use the host config adapter.",
            },
          ],
        },
      ],
    },
  },

  {
    files: ["**/3d-scene/**"],
    rules: {
      "react-hooks/rules-of-hooks": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/refs": "warn",
      "react-hooks/purity": "warn",
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          argsIgnorePattern: "^_",
          varsIgnorePattern: "^_|^HeroModel$|^BobblingCamera$",
          caughtErrorsIgnorePattern: "^_",
        },
      ],
    },
  },

  {
    files: [
      "packages/runtime-react/src/**/*.{ts,tsx}",
      "apps/web/src/**/*.{ts,tsx}",
      "packages/sdk/src/**/*.{ts,tsx}",
      "tools/**/*.{ts,tsx}",
    ],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: [
            {
              group: ["@pb/core/internal/*"],
              message:
                "Import from @pb/core/internal/* is not allowed outside packages/core. Use @pb/core/<subpath> instead (e.g., @pb/core/layout, @pb/core/keys).",
            },
          ],
        },
      ],
    },
  },

  {
    files: [
      "src/app/dev/**/*.{ts,tsx}",
      "src/devtools/app-dev/**/*.{ts,tsx}",
      "apps/web/src/app/dev/**/*.{ts,tsx}",
      "apps/web/src/devtools/app-dev/**/*.{ts,tsx}",
    ],
    rules: {
      complexity: ["error", 8],
      "max-lines": [
        "error",
        {
          max: 250,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
    },
  },

  globalIgnores([
    "**/.next/**",
    ".next/**",
    "apps/web/.next/**",
    "out/**",
    "apps/web/out/**",
    "build/**",
    "next-env.d.ts",
    "apps/web/next-env.d.ts",

    ".claude/**",

    ".dead/**",

    // Figma plugin compiled output — esbuild target ES2017 emits var declarations
    "tools/figma-plugin/dist/**",
    // Vendor copies of third-party libraries
    "tools/figma-plugin/vendor/**",
    // Figma widget compiled output
    "tools/figma-widget/dist/**",
    // Vendor copy of liquidGL runtime
    "public/scripts/**",
    // Browser-injected extraction scripts loaded as raw text via fs.readFileSync and
    // evaluated in-page — top-level arrow function expression is the intended shape.
    "tools/pb-cli/src/commands/steal/extraction-scripts/**",
  ]),
]);

export default eslintConfig;
