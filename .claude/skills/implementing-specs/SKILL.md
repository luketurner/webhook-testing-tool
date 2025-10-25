---
name: implementing-specs
description: Implement a spec without requiring additional user input.
---

# Implementing Specs

## Instructions

Use this skill when the user asks to "implement this spec" and they are on a spec feature branch (e.g. `001-feature-name`).

Plan and implement the currently open feature by running the following commands in order:

1. Run the /speckit.plan command.
2. Run the /speckit.tasks command.
3. Run the /speckit.implement command.
4. Continue until all phases of the implementation are complete.

During this process, avoid prompting the user unless completely stuck. Skip any manual testing phases -- assume all manual testing and code review will be done once the whole implementation is complete.