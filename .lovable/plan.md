

# Restore Hardened Authentication Features

## What Happened

During the SSO integration, Auth.tsx was replaced with an older version of the file. The Google/Apple SSO buttons were added correctly, but all prior form validation and error handling enhancements were lost in the process.

## What Needs to Be Restored

All changes will be made to a single file: **`src/pages/Auth.tsx`**. The SSO buttons and OAuth handler will remain untouched.

### 1. State and Imports

- Add `formError` state (string) for inline error alerts
- Add `confirmPassword` state (string) for signup
- Add `resendCooldown` state (number) for the 60-second timer
- Import the `Alert`, `AlertDescription` components
- Import `CheckCircle2`, `XCircle`, `AlertCircle` icons from lucide-react

### 2. Password Policy (Signup Only)

- Define password rules: minimum 8 characters, at least one digit, at least one special character
- Show a live checklist below the password field during signup, with green check or red X for each rule
- Disable the "Create Account" button until all rules pass

### 3. Confirm Password Field (Signup Only)

- Add a "Confirm Password" input below the password field
- Validate that passwords match before allowing submission
- Show an inline error if they don't match on submit

### 4. Inline Error Alerts

- Replace `toast.error()` calls with `setFormError()` for form-level errors
- Display errors using an `Alert` component with `variant="destructive"` at the top of the form
- Clear the error when the user starts typing or switches between sign-in/sign-up

### 5. Human-Readable Error Mapping

- Add a `mapAuthError(message)` helper that converts technical backend error strings into friendly messages:
  - "Invalid login credentials" -> "Incorrect email or password. Please try again."
  - "Email not confirmed" -> handled specially (see below)
  - "User already registered" -> "An account with this email already exists."
  - Default fallback for unknown errors

### 6. Duplicate Email Detection (Signup)

- Destructure `data` from `signUp()` response
- Check `data.user?.identities?.length === 0` -- if true, set form error: "An account with this email already exists. Try signing in instead."

### 7. Unverified Email Detection (Sign-in)

- On sign-in error, detect "Email not confirmed" message
- Show an inline alert with a "Resend verification email" button
- Clicking resend calls `supabase.auth.resend()` with type `"signup"`

### 8. Resend Cooldown Timer

- After clicking "Resend", start a 60-second countdown
- Disable the resend button during cooldown, showing remaining seconds
- Use `setInterval` in a `useEffect` cleanup

## What Stays the Same

- Google and Apple SSO buttons, layout, and `handleOAuthLogin` -- no changes
- The "or" divider between SSO and email form -- no changes
- Signup flow (invite code, role selector) -- no changes
- All other files -- no changes
