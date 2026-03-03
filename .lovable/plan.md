
## Root Cause

`supabase.functions.invoke()` in JS v2 returns a `FunctionsHttpError` in `error` when the edge function responds with 4xx. The actual JSON body (`{"error": "This email already has an approved account..."}`) is **not** in `error.message` — it's only accessible via `await error.context.json()`. So `data` is `null`, `error.message` is just `"Edge Function returned a non-2xx status code"`, and the `errMsg.includes("approved account")` guard never matches. The error falls through to the generic `toast.error()` with no redirect.

## Fix

In `handleRequestAccess` (`src/pages/Auth.tsx`, ~line 241), parse the actual error body from `error.context`:

```typescript
const handleRequestAccess = async (additionalProfileData: Record<string, any>) => {
  setWaitlistSubmitting(true);
  const { password: _pw, ...cleanProfileData } = additionalProfileData;
  try {
    const { error, data } = await supabase.functions.invoke("submit-waitlist-application", {
      body: { ... },
    });

    // For non-2xx responses, parse the actual body from error.context
    let errMsg = "";
    if (error) {
      try {
        const body = await (error as any).context?.json?.();
        errMsg = body?.error || error.message || "";
      } catch {
        errMsg = error.message || "";
      }
    }

    if (errMsg) {
      if (errMsg.includes("already pending") || errMsg.includes("pending review")) {
        toast.info("You already have a pending application.");
        navigate("/waitlist");
        return;
      }
      if (errMsg.includes("approved account") || errMsg.includes("already has an approved")) {
        toast.info("You already have an account. Please sign in.");
        setStep("sign-in");
        return;
      }
      throw new Error(errMsg);
    }
    navigate("/waitlist");
  } catch (error: any) {
    toast.error(error.message || "Failed to submit application.");
  } finally {
    setWaitlistSubmitting(false);
  }
};
```

## Files to Change
- `src/pages/Auth.tsx` — update `handleRequestAccess` to read `error.context.json()` for the actual 409 body
