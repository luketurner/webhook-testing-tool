#!/usr/bin/env bun

import { $ } from "bun";
import { existsSync, readFileSync, writeFileSync } from "fs";
import { join } from "path";
import packageJson from "../package.json";

const CHANGELOG_PATH = join(import.meta.dir, "..", "CHANGELOG.md");

function printUsage() {
  console.log("Usage: bun scripts/version.ts <VERSION|major|minor|patch>");
  console.log("  VERSION: A specific version number (e.g., 2.3.0)");
  console.log("  major: Increment major version (e.g., 2.2.1 -> 3.0.0)");
  console.log("  minor: Increment minor version (e.g., 2.2.1 -> 2.3.0)");
  console.log("  patch: Increment patch version (e.g., 2.2.1 -> 2.2.2)");
}

function parseVersion(version: string): {
  major: number;
  minor: number;
  patch: number;
} {
  const parts = version.split(".");
  if (parts.length !== 3) {
    throw new Error(`Invalid version format: ${version}`);
  }

  const [major, minor, patch] = parts.map((p) => {
    const num = parseInt(p, 10);
    if (isNaN(num) || num < 0) {
      throw new Error(`Invalid version number: ${p}`);
    }
    return num;
  });

  return { major, minor, patch };
}

function calculateNewVersion(
  currentVersion: string,
  versionInput: string,
): string {
  if (
    versionInput === "major" ||
    versionInput === "minor" ||
    versionInput === "patch"
  ) {
    const { major, minor, patch } = parseVersion(currentVersion);

    switch (versionInput) {
      case "major":
        return `${major + 1}.0.0`;
      case "minor":
        return `${major}.${minor + 1}.0`;
      case "patch":
        return `${major}.${minor}.${patch + 1}`;
    }
  }

  // Validate the provided version
  parseVersion(versionInput);
  return versionInput;
}

function getCurrentVersion(): string {
  return packageJson.version;
}

function insertChangelogEntry(newVersion: string) {
  if (!existsSync(CHANGELOG_PATH)) {
    throw new Error("CHANGELOG.md not found");
  }

  const changelog = readFileSync(CHANGELOG_PATH, "utf-8");
  const lines = changelog.split("\n");

  // Find where to insert the new entry (after the first # Changelog line)
  let insertIndex = -1;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith("# Changelog")) {
      insertIndex = i + 1;
      break;
    }
  }

  if (insertIndex === -1) {
    throw new Error("Could not find '# Changelog' header in CHANGELOG.md");
  }

  // Get today's date in YYYY-MM-DD format
  const today = new Date().toISOString().split("T")[0];

  // Prepare the new entry
  const newEntry = ["", `## ${newVersion} (${today})`, "", "- ", "", "---"];

  // Insert the new entry
  lines.splice(insertIndex, 0, ...newEntry);

  // Write back to the file
  writeFileSync(CHANGELOG_PATH, lines.join("\n"));
}

async function openEditor() {
  const editor = process.env.EDITOR || "vim";

  console.log(`Opening ${CHANGELOG_PATH} in ${editor}...`);

  // Open the editor and wait for it to close
  await $`${editor} ${CHANGELOG_PATH}`;
}

async function executeGitCommands(newVersion: string) {
  console.log("Adding CHANGELOG.md to git...");
  await $`git add ${CHANGELOG_PATH}`.quiet();

  console.log(`Creating commit for version ${newVersion}...`);
  await $`git commit -m "update changelog for ${newVersion}"`.quiet();

  console.log(`Updating package version to ${newVersion}...`);
  await $`bun pm version ${newVersion}`.quiet();

  console.log(`Creating and pushing tag ${newVersion}...`);
  await $`git push origin tag ${newVersion}`.quiet();

  console.log("Pushing to main branch...");
  await $`git push origin main`.quiet();
}

async function main() {
  try {
    const args = process.argv.slice(2);

    if (args.length !== 1) {
      printUsage();
      process.exit(1);
    }

    const versionInput = args[0];
    const currentVersion = getCurrentVersion();
    const newVersion = calculateNewVersion(currentVersion, versionInput);

    console.log(`Current version: ${currentVersion}`);
    console.log(`New version: ${newVersion}`);

    // Insert the changelog template
    insertChangelogEntry(newVersion);
    console.log("Added changelog template");

    // Open editor for user to edit changelog
    await openEditor();

    // Check if the user actually added content to the changelog
    const changelog = readFileSync(CHANGELOG_PATH, "utf-8");
    if (changelog.includes(`## ${newVersion}`) && changelog.includes("- \n")) {
      console.error(
        "Error: Changelog entry appears to be empty. Please add release notes.",
      );
      process.exit(1);
    }

    // Execute git commands
    await executeGitCommands(newVersion);

    console.log(`✅ Successfully released version ${newVersion}`);
  } catch (error) {
    console.error("Error:", error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

await main();
