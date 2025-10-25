# Quickstart: User Management & Password Reset

**Date**: 2025-10-25
**Feature**: User Management & Password Reset
**Purpose**: Testing guide for validating the user management feature

## Prerequisites

- WTT development environment running (`bun run dev`)
- Admin user initialized with default credentials:
  - Email: Value from `WTT_ADMIN_USERNAME` env var (default: `admin@example.com`)
  - Password: Value from `WTT_ADMIN_PASSWORD` env var (default: `admin123`)
- Admin dashboard accessible at http://localhost:3001

## Quick Test Scenarios

### Scenario 1: View User Profile (P1 - MVP)

**Goal**: Verify user can see their current email and account creation date

**Steps**:
1. Open browser to http://localhost:3001
2. Log in with admin credentials
3. Navigate to User Management page (click user menu → "Account Settings" or direct URL: http://localhost:3001/user-management)
4. Observe displayed information

**Expected Results**:
- ✅ Current email address displayed (matches `WTT_ADMIN_USERNAME`)
- ✅ Account creation timestamp shown
- ✅ Page loads within 2 seconds (SC-001)
- ✅ No errors in browser console
- ✅ Session remains valid (no redirect to login)

**Failure Modes**:
- ❌ Page redirects to login → Session authentication broken
- ❌ Email not displayed → Database query failed or component rendering issue
- ❌ Timestamp shows as "Invalid Date" → Date parsing issue

---

### Scenario 2: Update Email Address (P2)

**Goal**: Verify user can change their email and immediately use it for login

**Steps**:
1. Log in to admin dashboard
2. Navigate to User Management page
3. In the email update form:
   - Enter new email: `newadmin@example.com`
   - Tab to next field (triggers blur validation)
4. Click "Update Email" button
5. Observe success message
6. Log out
7. Log in with new email and original password

**Expected Results**:
- ✅ Email validated on blur (format, length checked immediately)
- ✅ Submit button disabled during submission with loading indicator
- ✅ Success toast appears: "Email updated successfully"
- ✅ Email field shows new value
- ✅ Update completes within 30 seconds (SC-002)
- ✅ Logout successful
- ✅ Login with new email succeeds
- ✅ Login with old email fails

**Edge Cases to Test**:
- Invalid email format: Enter `not-an-email` → Error shown on blur
- Empty email: Clear field → Error shown on blur
- Too long email (>254 chars): Enter long email → Error shown
- Duplicate submission: Click submit twice quickly → Button disabled, only one request sent
- Whitespace: Enter `  test@example.com  ` → Trimmed to `test@example.com`

**Failure Modes**:
- ❌ Validation doesn't trigger on blur → React Hook Form mode incorrect
- ❌ Submit button not disabled → `isSubmitting` state not used
- ❌ Old email still works → Database not updated or session using cached email
- ❌ New email doesn't work → Update failed or session invalidated incorrectly

---

### Scenario 3: Reset Password (P3)

**Goal**: Verify user can change their password with proper verification

**Steps**:
1. Log in to admin dashboard
2. Navigate to User Management page
3. In the password reset form:
   - Current password: Enter current password
   - New password: Enter `newpassword123`
   - Confirm password: Enter `newpassword123`
   - Tab between fields (triggers blur validation)
4. Click "Update Password" button
5. Observe success message
6. Log out
7. Attempt login with old password (should fail)
8. Log in with new password (should succeed)

**Expected Results**:
- ✅ Password length validated on blur (min 8 characters)
- ✅ Confirmation match validated on blur
- ✅ Current password verified only on submit (not on blur)
- ✅ Submit button disabled during submission
- ✅ Success toast appears: "Password updated successfully"
- ✅ Update completes within 45 seconds (SC-003)
- ✅ Session remains valid (no forced logout)
- ✅ Old password rejected on next login
- ✅ New password accepted on next login

**Edge Cases to Test**:
- Wrong current password: Enter incorrect current → "Invalid credentials" error (SR-003)
- Password too short: Enter `short` → Error on blur
- Confirmation mismatch: New=`password123`, Confirm=`password456` → Error on blur
- Unicode password: Enter `🔒secure你好` → Accepted (FR-007a)
- Password with spaces: Enter `my secure password` → Accepted (FR-007a)

**Failure Modes**:
- ❌ Current password not verified → Security violation (SR-001)
- ❌ Error reveals which check failed → Information leak (SR-003)
- ❌ Unicode password rejected → FR-007a violated
- ❌ Session invalidated → Poor UX, should stay logged in
- ❌ Old password still works → Database not updated

---

### Scenario 4: Session Expiration Handling

**Goal**: Verify session expiration redirects to login

**Steps**:
1. Log in to admin dashboard
2. Navigate to User Management page
3. Open browser DevTools → Application → Cookies
4. Delete the `better-auth.session_token` cookie (simulates session expiration)
5. Try to interact with the page (e.g., click a form field)

**Expected Results**:
- ✅ Page redirects to login page (FR-020)
- ✅ No return URL preserved (FR-021)
- ✅ After re-login, lands on home page (not user management page)

**Alternative Test** (real expiration):
1. Log in and navigate to user management page
2. Wait 7 days (or temporarily reduce session expiration in config for testing)
3. Try to interact with page

---

### Scenario 5: Validation Error Display

**Goal**: Verify clear, actionable error messages

**Steps**:
1. Navigate to User Management page
2. Test each validation rule systematically

**Email Validation**:
- Enter `invalid` → Error: "Invalid email format"
- Enter email >254 chars → Error: "Email must be 254 characters or less"
- Enter `` (empty) → Error: "Email is required"

**Password Validation**:
- Enter password <8 chars → Error: "Password must be at least 8 characters"
- New=`abc`, Confirm=`xyz` → Error: "Passwords do not match"
- Leave current password empty → Error: "Current password is required"

**Expected Results**:
- ✅ All errors clear and actionable (SC-008)
- ✅ Errors appear immediately on blur (format validation)
- ✅ Errors appear on submit (security validation)
- ✅ Error messages help user fix the issue

---

## Integration Testing

### Test 1: Email Update Integration

**File**: `tests/integration/user-management-email-update.spec.ts`

**Test Flow**:
```typescript
test("admin can update email and login with new credentials", async () => {
  // 1. Setup: Create test user and authenticate
  const originalEmail = "test@example.com";
  const newEmail = "updated@example.com";
  const password = "testpassword123";

  // 2. Update email via API
  const response = await fetch("http://localhost:3001/api/user/update-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: newEmail }),
    credentials: "include", // Include session cookie
  });

  expect(response.ok).toBe(true);

  // 3. Verify database updated
  const user = db.query("SELECT email FROM user WHERE id = ?").get(testUserId);
  expect(user.email).toBe(newEmail);

  // 4. Logout and login with new email
  await authHelper.signOut();
  const loginResult = await authHelper.signIn(newEmail, password);
  expect(loginResult.success).toBe(true);

  // 5. Verify old email rejected
  const oldLoginResult = await authHelper.signIn(originalEmail, password);
  expect(oldLoginResult.success).toBe(false);
});
```

---

### Test 2: Password Reset Integration

**File**: `tests/integration/user-management-password-reset.spec.ts`

**Test Flow**:
```typescript
test("admin can reset password with current password verification", async () => {
  // 1. Setup
  const email = "test@example.com";
  const oldPassword = "oldpassword123";
  const newPassword = "newpassword456";

  // 2. Authenticate with old password
  await authHelper.signIn(email, oldPassword);

  // 3. Update password via API
  const response = await fetch("http://localhost:3001/api/user/update-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentPassword: oldPassword,
      newPassword: newPassword,
      confirmPassword: newPassword,
    }),
    credentials: "include",
  });

  expect(response.ok).toBe(true);

  // 4. Verify session still valid (no forced logout)
  const sessionCheck = await fetch("http://localhost:3001/api/auth/session", {
    credentials: "include",
  });
  expect(sessionCheck.ok).toBe(true);

  // 5. Logout and verify new password works
  await authHelper.signOut();
  const newLoginResult = await authHelper.signIn(email, newPassword);
  expect(newLoginResult.success).toBe(true);

  // 6. Verify old password rejected
  await authHelper.signOut();
  const oldLoginResult = await authHelper.signIn(email, oldPassword);
  expect(oldLoginResult.success).toBe(false);
});
```

---

### Test 3: Security - Wrong Current Password

**File**: `tests/integration/user-management-security.spec.ts`

**Test Flow**:
```typescript
test("password update rejects incorrect current password", async () => {
  // 1. Setup and authenticate
  const email = "test@example.com";
  const correctPassword = "correctpassword";
  const wrongPassword = "wrongpassword";
  const newPassword = "newpassword456";

  await authHelper.signIn(email, correctPassword);

  // 2. Attempt update with wrong current password
  const response = await fetch("http://localhost:3001/api/user/update-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentPassword: wrongPassword, // WRONG
      newPassword: newPassword,
      confirmPassword: newPassword,
    }),
    credentials: "include",
  });

  // 3. Verify rejection
  expect(response.status).toBe(401);
  const data = await response.json();

  // 4. Verify generic error message (SR-003: don't reveal which check failed)
  expect(data.error).toBe("Invalid credentials");
  expect(data.error).not.toContain("current password");
  expect(data.error).not.toContain("incorrect");

  // 5. Verify password unchanged (can still login with original)
  await authHelper.signOut();
  const loginResult = await authHelper.signIn(email, correctPassword);
  expect(loginResult.success).toBe(true);
});
```

---

## Performance Validation

### Page Load Performance (SC-001)

**Metric**: User management page loads within 2 seconds

**Measurement**:
```typescript
test("user management page loads within 2 seconds", async () => {
  const startTime = Date.now();

  await page.goto("http://localhost:3001/user-management");
  await page.waitForSelector('[data-testid="user-email"]');

  const loadTime = Date.now() - startTime;
  expect(loadTime).toBeLessThan(2000);
});
```

---

### Email Update Performance (SC-002)

**Metric**: Email update completes within 30 seconds

**Measurement**:
```typescript
test("email update completes within 30 seconds", async () => {
  const startTime = Date.now();

  const response = await fetch("http://localhost:3001/api/user/update-email", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: "new@example.com" }),
    credentials: "include",
  });

  const updateTime = Date.now() - startTime;
  expect(updateTime).toBeLessThan(30000);
  expect(response.ok).toBe(true);
});
```

---

### Password Reset Performance (SC-003)

**Metric**: Password reset completes within 45 seconds

**Measurement**:
```typescript
test("password reset completes within 45 seconds", async () => {
  const startTime = Date.now();

  const response = await fetch("http://localhost:3001/api/user/update-password", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      currentPassword: "oldpassword",
      newPassword: "newpassword",
      confirmPassword: "newpassword",
    }),
    credentials: "include",
  });

  const updateTime = Date.now() - startTime;
  expect(updateTime).toBeLessThan(45000);
  expect(response.ok).toBe(true);
});
```

---

## Manual Testing Checklist

Before marking feature complete, verify:

- [ ] **P1: View Profile**
  - [ ] Email displayed correctly
  - [ ] Creation date displayed
  - [ ] Page loads <2s
  - [ ] Session auth required

- [ ] **P2: Update Email**
  - [ ] Format validation on blur
  - [ ] Submit button disabled during processing
  - [ ] Success feedback clear
  - [ ] New email works immediately
  - [ ] Old email rejected
  - [ ] Update completes <30s

- [ ] **P3: Reset Password**
  - [ ] Current password verified
  - [ ] Length validation on blur
  - [ ] Confirmation match validated
  - [ ] Unicode/emoji passwords accepted
  - [ ] Success feedback clear
  - [ ] Old password rejected
  - [ ] New password works
  - [ ] Update completes <45s
  - [ ] Session stays active

- [ ] **Security** (per SR-001 through SR-005)
  - [ ] Current password required for password change
  - [ ] Passwords never visible in network tab
  - [ ] Error messages don't reveal which check failed
  - [ ] Password changes logged
  - [ ] better-auth hashing used

- [ ] **Edge Cases**
  - [ ] Session expiration redirects to login
  - [ ] Concurrent submits prevented
  - [ ] All validation rules enforced
  - [ ] Clear error messages

- [ ] **Browser Compatibility**
  - [ ] Chrome/Edge (latest)
  - [ ] Firefox (latest)
  - [ ] Safari (latest)

---

## Troubleshooting

### Issue: "Authentication required" error on page load

**Cause**: Session cookie missing or expired
**Fix**: Log in again through main login page

---

### Issue: Email update succeeds but old email still works

**Cause**: Database not properly updated or caching issue
**Fix**:
1. Check database: `SELECT email FROM user`
2. Verify better-auth not caching user data
3. Check for typos in SQL update statement

---

### Issue: Password update fails with "Invalid credentials"

**Causes**:
1. Current password incorrect (expected behavior)
2. Password verification logic broken
3. Database query failing

**Debug**:
1. Verify current password manually
2. Check server logs for errors
3. Test `verifyPassword()` function directly

---

### Issue: Validation not showing on blur

**Cause**: React Hook Form mode not set to "onBlur"
**Fix**: Check form configuration: `useForm({ mode: "onBlur" })`

---

### Issue: Session invalidated after credential update

**Cause**: Session management incorrectly invalidating on updates
**Fix**: Verify no `signOut()` calls in update handlers

---

## Cleanup After Testing

After manual testing, restore original credentials:

```bash
# Reset admin email and password to defaults
export WTT_ADMIN_USERNAME="admin@example.com"
export WTT_ADMIN_PASSWORD="admin123"

# Restart server to reinitialize admin user
bun run dev
```

Or directly update database:
```sql
-- Reset email
UPDATE user SET email = 'admin@example.com' WHERE name = 'Admin';

-- Reset password (requires hashing)
-- Easier to restart server with env vars
```
