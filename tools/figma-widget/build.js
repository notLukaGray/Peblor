import esbuild from "esbuild";

const watch = process.argv.includes("--watch");

const config = {
  entryPoints: ["src/widget-main.tsx"],
  outfile: "dist/widget.js",
  bundle: true,
  minify: true,
  target: "es2017",
  logLevel: "info",
  loader: { ".ts": "tsx", ".tsx": "tsx" },
  jsxFactory: "figma.widget.h",
  jsxFragment: "figma.widget.Fragment",
};

async function build() {
  if (watch) {
    const ctx = await esbuild.context(config);
    await ctx.watch();
    process.stdout.write("Watching widget…\n");
    return;
  }

  await esbuild.build(config);
  process.stdout.write("Build complete.\n");
}

build().catch(() => process.exit(1));
