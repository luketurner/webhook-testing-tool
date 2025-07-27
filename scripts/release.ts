/**
 * Construcs a Github release, if appropriate.
 */

import { $ } from "bun";
import packageJson from "../package.json";

const tag = `v${packageJson.version}`;

console.log(`Creating release for ${tag}...`);

// check if the release already exists
const releaseCheck = await $`gh release view ${tag}`.quiet().nothrow();
const stderr = releaseCheck.stderr.toString();
if (!stderr.includes("release not found")) {
  if (releaseCheck.exitCode === 1) {
    console.error("unknown error:");
    console.error(stderr);
    process.exit(1);
  }
  console.log("Release already exists!");
  process.exit(0);
}

// release doesn't exist -- create it!
await $`gh release create ${tag} --verify-tag --notes-file CHANGELOG.md -- dist/*.tar.gz dist/*.zip`;
