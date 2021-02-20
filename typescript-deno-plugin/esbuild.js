/* eslint-disable @typescript-eslint/no-var-requires */
async function start() {
  await require("esbuild").build({
    entryPoints: ["./src/index.ts"],
    minify: process.env.NODE_ENV === "production",
    sourcemap: process.env.NODE_ENV === "development",
    mainFields: ["module", "main"],
    platform: "node",
    outdir: "out",
  });
}

start().catch((e) => {
  console.error(e);
});
