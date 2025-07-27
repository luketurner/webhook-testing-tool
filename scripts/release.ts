/**
 * Construcs a Github release, if appropriate.
 */

import { $ } from "bun";
import packageJson from "../package.json";

const tag = `v${packageJson.version}`;

// check if the release already exists
const releaseCheck = await $`gh release view ${tag}`.nothrow();
if (!releaseCheck.text().includes("release not found")) {
  if (releaseCheck.exitCode === 1) {
    // Unknown error
    console.error(releaseCheck.text());
    process.exit(1);
  }
  // Release already exists
  process.exit(0);
}

// release doesn't exist
await $`gh release create ${tag} --verify-tag --notes-file CHANGELOG.md -- dist/wtt-*`;
