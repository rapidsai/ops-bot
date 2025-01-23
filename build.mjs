import esbuild from "esbuild";
import fs from "fs";

const nodeVersion = fs.readFileSync(".nvmrc", "utf-8").trim();

console.log("Building for Node.js version:", nodeVersion);
await esbuild.build({
  entryPoints: ["./src/probot.ts", "./src/authorizer.ts"],
  bundle: true,
  outdir: "dist",
  platform: "node",
  format: "esm",
  outExtension: { ".js": ".mjs" },
  target: `node${nodeVersion}`,
  minifyWhitespace: true,
  minifySyntax: true,
  // `banner` is needed due to:
  //   - https://github.com/evanw/esbuild/issues/1921#issuecomment-1575636282
  banner: {
    js: `\
import path from 'path';
import { fileURLToPath } from 'url';
import { createRequire as topLevelCreateRequire } from 'module';
const require = topLevelCreateRequire(import.meta.url);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);\
`,
  },
  sourcemap: "external",
});
