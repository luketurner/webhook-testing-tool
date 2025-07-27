/**
 * Builds production-ready, single-file executables in ./dist
 */
import { $ } from "bun";
import { rm } from "fs/promises";

const targets = [
  "bun-linux-x64",
  "bun-linux-arm64",
  "bun-linux-x64-musl",
  "bun-linux-arm64-musl",
  "bun-windows-x64",
  "bun-darwin-x64",
  "bun-darwin-arm64",
];

await $`bun run tailwind -- -m -i ./src/dashboard/index.css -o ./src/dashboard/index.compiled.css`;
await rm("dist", { recursive: true, force: true });

for (const target of targets) {
  await buildTarget(target);
}

async function buildTarget(target: string) {
  const filename = `dist/wtt-${target.replace("bun-", "")}`;
  console.log(`Building ${target} into ${filename}...`);
  await $`bun build --define RELEASE=true --compile --minify --sourcemap src/server.ts --outfile ${filename} --target ${target}`;
  if (target === "bun-windows-x64") {
    await $`chmod u+r ${filename}.exe`;
    await $`zip -9 ${filename}.zip ${filename}.exe`;
  } else {
    await $`tar -czf ${filename}.tar.gz ${filename}`;
  }
}
