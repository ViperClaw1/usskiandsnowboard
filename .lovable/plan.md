

## Problem Analysis

The `scrape-news` edge function stopped working because the **cron jobs are failing authentication**.

There are 3 cron jobs calling scrape-news:

| Job | Schedule | Authorization Header |
|-----|----------|---------------------|
| Job 1 | Every 6 hours | `Bearer <anon_key>` |
| Job 2 | Daily midnight | **None** |
| Job 3 | Daily noon | **None** |

**Root cause:** The function requires a valid **user JWT** with an admin role. It calls `getClaims(token)` which expects a user access token, not the Supabase anon key. The anon key is a service-level JWT with no `sub` claim pointing to a real user, so:
- Job 1: `getClaims` may succeed but the `sub` won't match any user in `user_roles` → 403 Forbidden
- Jobs 2 & 3: No auth header → 401 Unauthorized

This likely worked before March 16 because it was being triggered manually by an admin user (via the UI), not by the cron jobs, or a library update changed `getClaims` behavior with service-level tokens.

## Fix Plan

### 1. Update the scrape-news edge function to support service-role-key authentication

Add a check at the top of the auth logic: if the Bearer token matches `SUPABASE_SERVICE_ROLE_KEY`, bypass the user/admin role check entirely. This is safe because only the cron job (server-side) has access to the service role key.

```
Auth flow:
  Token == service_role_key? → proceed (trusted server call)
  Otherwise → getClaims + admin role check (existing user auth)
```

### 2. Fix cron jobs to use the service role key

- **Delete** jobs 2 and 3 (they have no auth header and are redundant)
- **Update** job 1 to use the service role key instead of the anon key in the Authorization header

This requires running SQL via the insert tool (not migration) since it contains secrets:
```sql
SELECT cron.unschedule(2);
SELECT cron.unschedule(3);
SELECT cron.unschedule(1);
-- Re-create job 1 with service role key
SELECT cron.schedule(..., Authorization: Bearer <SERVICE_ROLE_KEY>);
```

### Files Changed

- `supabase/functions/scrape-news/index.ts` — Add service-role-key bypass in auth logic (~5 lines added before the `getClaims` call)
- Database: cron job cleanup and recreation (via SQL insert tool)

