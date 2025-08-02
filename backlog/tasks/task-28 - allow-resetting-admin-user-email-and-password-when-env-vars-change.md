---
id: task-28
title: allow resetting admin user email and password when env vars change
status: Done
assignee: []
created_date: '2025-07-29'
updated_date: '2025-08-01'
labels: []
dependencies: []
---

## Description

Currently, the WTT_ADMIN_USERNAME and WTT_ADMIN_PASSWORD values are read once when the app is launched, and ignored if later changed. Add logic to check whether the variables have changed on app startup, and if so, to reset the existing admin account email or password to the new value. Ssee https://www.better-auth.com/llms.txt for documentation on what better-auth APIs to use.

## Acceptance Criteria

- [x] The admin account password is updated if WTT_ADMIN_PASSWORD has changed on app startup.
- [x] The admin account email/username is updated if WTT_ADMIN_USERNAME has changed on app startup.
- [x] The admin account is not modified if neither WTT_ADMIN_USERNAME or WTT_ADMIN_PASSWORD have changed.
- [x] Password values are not stored in plain text for comparison -- use the hashed value in the DB to compare whether the password has changed.
- [x] Use better-auth library APIs as much as possible.

## Implementation Plan

1. Analyze current authentication setup and admin user creation
2. Check better-auth documentation for password/email update APIs
3. Implement logic to detect env var changes on startup
4. Update admin password if WTT_ADMIN_PASSWORD changed (using hashed comparison)  
5. Update admin email if WTT_ADMIN_USERNAME changed
6. Test the implementation

## Implementation Notes

### Approach taken
Modified the `initializeAdminUser` function in `src/auth/init-user.ts` to not only create the admin user on first run, but also update the admin user's email and password if the environment variables have changed.

### Features implemented
- Enhanced the admin user initialization to check for existing admin users
- Added logic to compare the current admin email with the env var and update if different
- Added password hash comparison using better-auth's `verifyPassword` function to detect password changes
- Used better-auth's `hashPassword` function to hash new passwords before storing
- All password comparisons are done using hashed values, never plain text

### Technical decisions and trade-offs
- Used better-auth's crypto functions (`hashPassword` and `verifyPassword` from `better-auth/crypto`) for password operations
- Query the user by name='Admin' OR by the configured email to handle email changes properly
- Direct database updates are used for changing email and password since better-auth doesn't provide server-side update APIs for these fields
- The implementation runs on every app startup, checking and updating as needed with minimal performance impact

### Modified files
- `src/auth/init-user.ts` - Enhanced the initialization function with update logic
- `src/auth/init-user.spec.ts` - Added comprehensive tests for the new functionality
