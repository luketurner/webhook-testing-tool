---
name: implementing-specs
description: Implement a spec without requiring additional user input.
---

# Implementing Specs

## Instructions

Use this skill when the user asks to "implement this spec" and they are on a spec feature branch (e.g. `001-feature-name`).

Plan and implement the currently open feature by running the following commands in order, each in its own subagent. NOTE: Subagents should use the same model as the main agent.

1. Run the /speckit.plan command in a subagent.
2. Run the /speckit.tasks command in a subagent.
3. Run the /speckit.implement command in a subagent.
4. Continue until all phases of the implementation are complete in a subagent.

During this process, avoid prompting the user unless completely stuck. Skip any manual testing phases -- assume all manual testing and code review will be done once the whole implementation is complete.