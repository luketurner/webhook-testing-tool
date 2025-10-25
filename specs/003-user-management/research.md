# Research: User Management & Password Reset

**Date**: 2025-10-25
**Feature**: User Management & Password Reset
**Purpose**: Resolve technical questions about better-auth integration, user update patterns, and session management

## Research Areas

### 1. Better-Auth User Update Patterns

**Question**: How does better-auth handle user email and password updates?

**Findings**:

- Better-auth provides server-side APIs accessed via `auth.api.*` methods
- Current implementation uses `auth.api.signUpEmail()` for user creation
- Existing code in `src/auth/init-user.ts` demonstrates direct database updates for email/password:
  - Email: `UPDATE user SET email = ? WHERE id = ?`
  - Password: Uses `hashPassword()` from `better-auth/crypto` then `UPDATE account SET password = ? WHERE userId = ? AND providerId = 'credential'`
- Password verification uses `verifyPassword()` from `better-auth/crypto`

**Decision**: Use better-auth's crypto utilities (`hashPassword`, `verifyPassword`) combined with direct database updates for user management, following the pattern established in `init-user.ts`.

**Rationale**:
- Consistent with existing codebase patterns
- Better-auth may not expose high-level update APIs for all operations
- Direct database access gives full control while using better-auth's cryptographic functions
- Safer than custom password hashing

**Alternatives Considered**:
- Custom password hashing: Rejected - security risk, better-auth provides vetted implementations
- Search for higher-level better-auth update APIs: Not documented in current usage, would require dependency on undocumented features

### 2. Database Schema Understanding

**Question**: What tables and columns does better-auth use for user data?

**Findings** (from `init-user.ts` code analysis):

Tables:
- `user`: Contains user profile data (id, email, name)
- `account`: Contains authentication credentials (userId, providerId, password)
- Relationship: `account.userId` → `user.id`
- Provider: `'credential'` for email/password auth

**Decision**: Updates will target both tables:
- Email updates: `user` table
- Password updates: `account` table with `providerId = 'credential'`

**Rationale**: Follows better-auth's schema design where user profile is separate from authentication credentials.

### 3. Session Management After Credential Updates

**Question**: How should sessions be handled when email/password changes?

**Findings**:
- Current session configuration (from `src/auth/index.ts`):
  - `expiresIn`: 7 days
  - `updateAge`: 1 day (sessions refresh after 1 day of activity)
  - `requireEmailVerification`: false (aligns with FR-022, FR-023)
- Better-auth manages session cookies automatically
- Session is tied to user ID, not email

**Decision**:
- **Email updates**: No session invalidation needed - email change doesn't affect authentication, user ID remains same
- **Password updates**: Keep current session active but log the security event (as per SR-004)
- Session will naturally continue using existing cookies

**Rationale**:
- Better UX: User doesn't need to re-login after credential updates
- Secure: Current password verification (SR-001) prevents unauthorized changes
- Session tied to user ID means email changes don't break authentication
- Password changes don't require re-authentication because we've already verified the current password

**Alternatives Considered**:
- Force logout after password change: Rejected - poor UX, user just proved they know current password
- Invalidate all other sessions: Rejected - single-user system, no concurrent sessions from different devices to worry about

### 4. Form Validation Timing

**Question**: How to implement hybrid validation (format on blur, security on submit)?

**Findings**:
- React Hook Form (7.56) supports both `onChange` and `onBlur` validation modes
- Shadcn/ui Form components integrate with React Hook Form
- Can combine client-side Zod validation with server-side verification

**Decision**: Use React Hook Form with `onBlur` mode for format validation, server-side verification for security checks.

**Implementation Approach**:
```typescript
// Zod schemas for client-side validation
const emailSchema = z.string().email().max(254).trim();
const passwordSchema = z.string().min(8); // Allows all unicode per FR-007a

// React Hook Form configuration
const form = useForm({
  mode: "onBlur", // Validates when field loses focus
  resolver: zodResolver(formSchema),
});

// Server action verifies current password on submission
```

**Rationale**:
- `onBlur` mode triggers validation when user tabs away (per clarification)
- Server must verify current password (can't trust client-side checks)
- Zod schemas provide TypeScript types and runtime validation

### 5. Concurrent Submit Protection

**Question**: How to disable submit button during form processing?

**Findings**:
- React Hook Form provides `formState.isSubmitting` flag
- Shadcn/ui Button component accepts `disabled` prop
- Standard React pattern for form submission states

**Decision**: Use `formState.isSubmitting` to disable button and show loading state.

**Implementation Approach**:
```typescript
const { formState: { isSubmitting } } = useForm();

<Button type="submit" disabled={isSubmitting}>
  {isSubmitting ? "Updating..." : "Update Email"}
</Button>
```

**Rationale**: Built-in React Hook Form feature, no custom state management needed.

### 6. Error Handling and User Feedback

**Question**: How to provide clear feedback per FR-011, FR-012?

**Findings**:
- Shadcn/ui provides Toast component (sonner library)
- React Hook Form provides field-level error display
- Can combine both for comprehensive feedback

**Decision**: Use React Hook Form errors for validation feedback, Toast for operation results.

**Implementation Approach**:
```typescript
// Field validation errors (shown immediately on blur)
<FormField errors={form.formState.errors.email} />

// Operation feedback (shown after submission)
import { toast } from "sonner";
toast.success("Email updated successfully");
toast.error("Current password is incorrect");
```

**Rationale**:
- Validation errors appear inline near fields (clear, actionable)
- Operation success/failure shown as toast (non-blocking, visible)
- Follows existing WTT patterns for user feedback

## Summary of Technical Decisions

| Area | Decision | Key Technology |
|------|----------|----------------|
| Password Hashing | Use better-auth/crypto utilities | `hashPassword`, `verifyPassword` |
| Database Updates | Direct SQL with better-auth schema | `user` and `account` tables |
| Session Handling | No invalidation after updates | Better-auth session cookies |
| Form Validation | Hybrid: blur for format, submit for security | React Hook Form + Zod |
| Submit Protection | Disable button during submission | `formState.isSubmitting` |
| User Feedback | Inline errors + toast notifications | Shadcn/ui Form + Toast (sonner) |

## Dependencies Confirmed

All required dependencies are already in package.json:
- ✅ better-auth: 1.2.10
- ✅ react-hook-form: 7.56.4
- ✅ zod: 3.25.31
- ✅ sonner: 2.0.5 (toast notifications)
- ✅ @hookform/resolvers: 5.0.1 (Zod integration)
- ✅ All shadcn/ui components (Form, Button, Input, Label)

No new dependencies required.

## Next Steps

Proceed to Phase 1:
1. Create data-model.md with User and Account entity details
2. Generate API contracts for update-email and update-password endpoints
3. Create quickstart.md for testing workflows
