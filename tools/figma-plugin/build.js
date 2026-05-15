import esbuild from "esbuild";
import fs from "fs";

const watch = process.argv.includes("--watch");

const baseConfig = {
  bundle: true,
  minify: true,
  target: "es2017",
  logLevel: "info",
};

async function build() {
  if (watch) {
    const mainCtx = await esbuild.context({
      ...baseConfig,
      entryPoints: ["src/main.ts"],
      outfile: "dist/main.js",
    });
    await mainCtx.watch();
    process.stdout.write("Watching main thread…\n");
    return;
  }

  // Main thread
  await esbuild.build({
    ...baseConfig,
    entryPoints: ["src/main.ts"],
    outfile: "dist/main.js",
  });

  // UI thread — inline ui.ts into ui.html
  const uiResult = await esbuild.build({
    ...baseConfig,
    entryPoints: ["src/ui.ts"],
    write: false,
  });

  const uiScript = uiResult.outputFiles[0].text;
  const uiHtml = fs.readFileSync("src/ui.html", "utf8").replace("/*__UI_SCRIPT__*/", uiScript);
  fs.mkdirSync("dist", { recursive: true });
  fs.writeFileSync("dist/ui.html", uiHtml);

  process.stdout.write("Build complete.\n");
}

build().catch(() => process.exit(1));
