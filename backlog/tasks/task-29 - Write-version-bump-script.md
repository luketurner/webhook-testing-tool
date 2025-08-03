---
id: task-29
title: Write version bump script
status: Done
assignee:
  - '@claude'
created_date: '2025-08-03 17:23'
updated_date: '2025-08-03 17:33'
labels: []
dependencies: []
---

## Description

When I want to publish a new version of my app, I need to run:

vim ./CHANGELOG.md

Then add a new heading with the new version number and date, write my release notes, and add a horizontal line below them (i.e. ---)

Then I need to run:

git add CHANGELOG.md
git commit -m "update changelog for VERSION"
bun pm version VERSION
git push origin tag VERSION
git push origin main

Write a Bun script in scripts/version.ts that accepts VERSION as an argument -- or "major", "minor" or "patch" and calculate the new version based on that -- and automates the above process. Include automatically creating the template for the new version in CHANGELOG.md, and open it in $EDITOR (or vim by default) for me to manually input the changelog details for the new version before creating the commit.

## Implementation Plan

1. Read and analyze existing CHANGELOG.md and package.json structure\n2. Create scripts/version.ts with argument parsing for VERSION or major/minor/patch\n3. Implement version calculation logic using semver principles\n4. Add functionality to insert new version template in CHANGELOG.md\n5. Open editor (hx or vim) for manual changelog input\n6. Execute git commands after user saves changelog\n7. Test with different version inputs

## Implementation Notes

Implemented a Bun script at scripts/version.ts that automates the version release process.\n\nFeatures implemented:\n- Command line argument parsing for VERSION or major/minor/patch\n- Semantic version calculation logic\n- Automatic CHANGELOG.md template insertion with current date\n- Editor integration using hx (defaults to vim)\n- Validation to ensure changelog content is added\n- Automated git commands execution after changelog update\n\nTechnical decisions:\n- Used Bun's $ template literals for shell command execution\n- Implemented proper error handling for all operations\n- Added validation for empty changelog entries\n- Made script executable with shebang\n\nModified files:\n- Created scripts/version.ts
