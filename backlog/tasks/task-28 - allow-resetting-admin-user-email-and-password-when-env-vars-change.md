---
id: task-28
title: allow resetting admin user email and password when env vars change
status: In Progress
assignee: []
created_date: '2025-07-29'
updated_date: '2025-08-01'
labels: []
dependencies: []
---

## Description

Currently, the WTT_ADMIN_USERNAME and WTT_ADMIN_PASSWORD values are read once when the app is launched, and ignored if later changed. Add logic to check whether the variables have changed on app startup, and if so, to reset the existing admin account email or password to the new value. Ssee https://www.better-auth.com/llms.txt for documentation on what better-auth APIs to use.

## Acceptance Criteria

- [ ] The admin account password is updated if WTT_ADMIN_PASSWORD has changed on app startup.
- [ ] The admin account email/username is updated if WTT_ADMIN_USERNAME has changed on app startup.
- [ ] The admin account is not modified if neither WTT_ADMIN_USERNAME or WTT_ADMIN_PASSWORD have changed.
- [ ] Password values are not stored in plain text for comparison -- use the hashed value in the DB to compare whether the password has changed.
- [ ] Use better-auth library APIs as much as possible.

## Implementation Plan

1. Analyze current authentication setup and admin user creation\n2. Check better-auth documentation for password/email update APIs\n3. Implement logic to detect env var changes on startup\n4. Update admin password if WTT_ADMIN_PASSWORD changed (using hashed comparison)\n5. Update admin email if WTT_ADMIN_USERNAME changed\n6. Test the implementation
