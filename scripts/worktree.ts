#!/usr/bin/env bun

import { $, spawn } from "bun";
import { existsSync } from "fs";

// AIDEV-NOTE: CLI script for creating git worktrees and opening Claude Code in them

const SCRIPT_NAME = "worktree";

function showUsage() {
  console.log(`Usage: ${SCRIPT_NAME} <label>`);
  console.log("");
  console.log("Creates a new git worktree in /worktree-<label> directory");
  console.log("and automatically opens Claude Code in that worktree.");
  console.log("");
  console.log("Example:");
  console.log(`  ${SCRIPT_NAME} feature-auth`);
  console.log("  # Creates /worktree-feature-auth and opens Claude Code");
}

function showError(message: string) {
  console.error(`Error: ${message}`);
  process.exit(1);
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showUsage();
    process.exit(1);
  }

  if (args[0] === "--help" || args[0] === "-h") {
    showUsage();
    process.exit(0);
  }

  const label = args[0];

  if (!label || label.trim() === "") {
    showError("Label cannot be empty");
  }

  // Validate label (basic git branch name rules)
  if (!/^[a-zA-Z0-9_-]+$/.test(label)) {
    showError(
      "Label must contain only letters, numbers, underscores, and hyphens",
    );
  }

  const worktreePath = `/workspaces/worktree-${label}`;

  // Check if worktree already exists
  if (existsSync(worktreePath)) {
    console.log(`Worktree already exists at ${worktreePath}`);
    console.log("Opening Claude Code in existing worktree...");
  } else {
    console.log(`Creating worktree: ${worktreePath}`);

    // Create the worktree (this will create a new branch if it doesn't exist)
    try {
      await $`git worktree add ${worktreePath} -b ${label}`;
      console.log(`✓ Worktree created at ${worktreePath}`);
    } catch (error) {
      showError(`Failed to create worktree: ${error}`);
    }
  }

  // Open Claude Code in the worktree directory
  console.log("Opening Claude Code...");
  try {
    const proc = spawn(["claude", "--dangerously-skip-permissions"], {
      cwd: worktreePath,
      stdio: ["inherit", "inherit", "inherit"],
    });

    const exitCode = await proc.exited;
    if (exitCode === 0) {
      console.log("✓ Claude Code session completed");
    } else {
      console.log(`Claude Code exited with code ${exitCode}`);
    }
  } catch (error) {
    showError(`Failed to open Claude Code: ${error}`);
  }
}

// Run the script
main().catch((error) => {
  console.error("Unexpected error:", error);
  process.exit(1);
});
