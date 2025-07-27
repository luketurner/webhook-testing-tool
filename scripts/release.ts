import { $ } from "bun";

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

for (const target of targets) {
  buildTarget(target);
}

async function buildTarget(target: string) {
  console.log(`Building ${target}...`);
  await $`bun build --define RELEASE=true --compile --minify --sourcemap src/server.ts --outfile dist/wtt-${target.replace("bun-", "")} --target ${target}`;
}
