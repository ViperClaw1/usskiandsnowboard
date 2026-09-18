# Security Hardening + UX Polish

A fresh security scan surfaced a handful of real, fixable issues. This plan fixes the meaningful ones (skipping low-value noise) and adds a set of practical UX/UI improvements.

## Part 1 — Security fixes

### A. Close open data exposures (quick, high value)
1. **Lock down the signup email/IP log.** The `email_verification_send_log` table stores every signup email and IP address. Restrict it so only the backend (and admins) can read it — right now it risks being publicly readable.
2. **Stop publishing everyone's notification settings.** A database rule currently lets *anyone* (even logged-out visitors) read every user's notification preferences. Replace it with the existing "users see only their own" rule.

### B. Guard the email-sending and AI functions
3. Several behind-the-scenes functions (connection-notification emails, admin notifications, the AI profile filler) can be triggered by anyone holding the site's public key — meaning a bad actor could spam users with emails or burn AI/scraping quota. Add a sign-in check to each so only real signed-in users (or the system itself) can trigger them.

### C. Move the invite-code check behind the scenes
4. Today the invite code is checked in the visitor's browser, where anyone can view it — and the account-creation function doesn't verify it at all. Move validation into the account-creation function so the code is never exposed and can't be bypassed.

### D. Sanitize training article content
5. Training articles are rendered as raw HTML with a homemade "sanitizer" that doesn't actually block scripts. Swap in DOMPurify (an industry-standard library) so a compromised admin account couldn't inject malicious code into pages every user sees.

### E. Hide internal error details
6. Several functions return raw internal error messages to the browser, which can leak database/system details. Return friendly generic messages to users; keep full details in server logs only.

### F. Update vulnerable packages
7. Upgrade direct dependencies with known vulnerabilities: `react-router-dom` (open-redirect / XSS advisories), `@supabase/supabase-js`, `recharts` (lodash pollution), and the stray legacy `react-query` v3 entry if unused. Re-verify the app builds and runs after each bump.

## Part 2 — UX / UI improvements

1. **Skeleton loaders on directory pages.** Athletes/Experts/Jobs currently show blank space while loading — replace with skeleton cards matching the real layout so pages feel instant.
2. **Consistent empty states.** Standardize friendly "nothing here yet" messages with an icon and a call-to-action across dashboard sections (connections, jobs, content).
3. **Mobile polish pass.** Check directory cards, dialogs, and dashboard grids at phone width; fix any cramped spacing, truncated badges, or overflowing buttons.
4. **Job Board search debounce.** Slight delay on the search box so typing doesn't re-filter on every keystroke (smoother on slower devices).
5. **Toast consistency.** Make success/error toasts uniform in wording, position, and duration across forms (profile save, job post, connection requests).
6. **% match explanation tooltip.** On the new "Suggested Experts" / "Athletes to Mentor" badges, add a small tooltip explaining the match is based on profile content, not a judgment of quality.

## Technical details
- Security fixes A–E touch: `drizzle/migrations/*` (RLS policy changes), `supabase/functions/{send-connection-notification, send-admin-notification, send-expert-connection-notification, ai-populate-profile, send-verification-email}/index.ts`, `src/pages/Auth.tsx`, `src/lib/sanitizeArticleHtml.ts` + `TrainingArticle.tsx`, and `package.json` bumps.
- Every edge function auth guard will accept either a valid user token or the internal service key (so system-triggered calls like database triggers keep working).
- UX items touch: `Athletes.tsx`, `Experts.tsx`, `JobBoard.tsx`, shared skeleton/empty-state components, and landing pages.

## Out of scope
- Ignoring accepted-risk warnings (public employer contact details — confirmed intentional).
- Major redesigns or new features.
