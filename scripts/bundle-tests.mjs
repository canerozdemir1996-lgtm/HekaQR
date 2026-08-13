import { rm, mkdir } from "node:fs/promises";
import path from "node:path";
import { build } from "esbuild";

const root = process.cwd();
const outputDirectory = path.join(root, ".test-bundles");

await rm(outputDirectory, { recursive: true, force: true });
await mkdir(outputDirectory, { recursive: true });

await build({
  entryPoints: [path.join(root, "tests", "*.test.ts")],
  outdir: outputDirectory,
  bundle: true,
  platform: "node",
  format: "cjs",
  target: "node22",
  sourcemap: false,
  logLevel: "warning",
});

console.log("Unit test bundles generated.");
