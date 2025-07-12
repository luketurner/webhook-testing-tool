---
id: task-24
title: Add sign out button
status: Done
assignee: []
created_date: '2025-07-12'
updated_date: '2025-07-12'
labels: []
dependencies: []
---

## Description

We already have an `/api/auth/sign-out` button in src/auth/controller.ts, but there is no way to call that from the frontend. Add a button in the bottom left of the first sidebar that opens a menu with one option: "Sign out". The button should use a user profile icon.

## Implementation Plan

1. Analyze authentication setup and find sign-out endpoint\n2. Locate the first sidebar component in the frontend code\n3. Add User icon import from lucide-react\n4. Import SidebarFooter component\n5. Add sign-out button to bottom of first sidebar\n6. Implement dropdown menu with sign-out option\n7. Connect to /api/auth/sign-out endpoint\n8. Handle session invalidation after sign-out

## Implementation Notes

Implemented sign-out functionality in the app sidebar:\n\n- Added User icon import from lucide-react\n- Imported SidebarFooter component from the UI library\n- Created a sign-out button in the footer of the first sidebar with a user profile icon\n- Implemented dropdown menu that opens on click with "Sign out" option\n- Connected to /api/auth/sign-out endpoint with POST request\n- Used useQueryClient to invalidate the session query after successful sign-out\n- The SessionProvider will automatically show the login form when session is invalidated\n\nModified files:\n- src/components/app-sidebar.tsx: Added sign-out button and functionality
