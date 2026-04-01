

## Investigation Summary

The root cause is that **18 TypeScript errors in edge functions are blocking the build**, which means the migration (`normalize_expert_user_links_and_roles`) that backfills missing expert roles in `user_roles` never deployed. The `FullUserManagementTable` code itself is correct — it queries `profiles` joined with `user_roles`, so experts will appear once they have rows in both tables.

### Why experts are missing
- The table query logic is: fetch all `profiles`, then match each profile's `id` against `user_roles` to get roles
- Expert users created via signup DO get a `profiles` row and a `user_roles` row (via `handle_new_user` trigger), so they should appear
- However, the backfill migration for any legacy experts without `user_roles` entries never ran because the build is broken

### Build errors to fix (all in edge functions)

**1. `ai-populate-profile/index.ts` (line 219)** — `aiResp` possibly null
- Add null guard before `.text()` call

**2. `resend-confirmation/index.ts` (line 67)** — missing `password` in `generateLink({ type: "signup" })`
- Add a dummy `password` field (e.g., `crypto.randomUUID()`) to satisfy the type

**3. `scrape-news/index.ts` (lines 31-35)** — `authHeader` possibly null + `getClaims` doesn't exist
- Add null check for `authHeader`
- Replace `getClaims(token)` with `getUser(token)` (the correct Supabase Auth API)

**4. `send-admin-summary/index.ts` (line 33)** — same `getClaims` issue
- Replace with `getUser(token)`

**5. `send-connection-notification/index.ts` (lines 53-97, 304-397)** — type mismatch on `createClient` return type used in helper functions
- Change helper function parameter types from the strict generic to `any` (e.g., `supabase: any`)
- This resolves all ~10 related errors in one change

**6. `send-role-notification/index.ts` (line 36)** — same `getClaims` issue
- Replace with `getUser(token)`

### Files to modify (6 edge functions)

| File | Changes |
|------|---------|
| `supabase/functions/ai-populate-profile/index.ts` | Null-guard `aiResp` before `.text()` |
| `supabase/functions/resend-confirmation/index.ts` | Add `password` to `generateLink` call |
| `supabase/functions/scrape-news/index.ts` | Null-check `authHeader`, replace `getClaims` → `getUser` |
| `supabase/functions/send-admin-summary/index.ts` | Replace `getClaims` → `getUser` |
| `supabase/functions/send-connection-notification/index.ts` | Relax helper function parameter types to `any` |
| `supabase/functions/send-role-notification/index.ts` | Replace `getClaims` → `getUser` |

Once these build errors are fixed, the migration will deploy and backfill expert roles, making experts visible in the admin User Management table.

