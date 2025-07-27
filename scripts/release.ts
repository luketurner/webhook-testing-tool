/**
 * Construcs a Github release, if appropriate.
 */

import { $ } from "bun";
import packageJson from "../package.json";

await $`gh release create v${packageJson.version} --verify-tag --notes-file CHANGELOG.md -- dist/*`;
