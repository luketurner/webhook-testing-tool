/**
 * Construcs a Github release, if appropriate.
 */

import { $ } from "bun";

const tag = $`git describe --exact-match --tags HEAD 2>/dev/null`;

await $`gh release create ${tag} --verify-tag --notes-file CHANGELOG.md -- dist/*`;
