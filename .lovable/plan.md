# Revised team update note — today only (Sep 18)

The earlier draft mixed in updates from previous days. This revision covers only what shipped today:

**Included (today):**
- Smart connection matching (Suggested Experts for You / Athletes to Mentor)
- Richer "Complete Profile with AI" fill
- Security hardening (signup email log lockdown, email/AI function guards, server-side invite code, article content sanitizing, software updates, logged-out page fix)
- Small UX polish (match score explanations, smoother Job Board search)

**Removed (earlier days):** Expert Company Name field, Next Gen Council rename, expert signup form changes, industry badges fix, Job Board build, Admin training article tools, admin charts (industry interest pie, mentorship gap), intro email edits, connection-accept popup, logged-out directory fixes, mobile scrolling, featured experts on profiles, etc.

## The revised draft

---

**Team — here's what shipped on the platform today:**

**Smarter Connections (new)**
- Athletes now see a "Suggested Experts for You" section on their dashboard, and Experts see "Athletes to Mentor" — personalized matches based on each person's background, interests, and goals, not just industry overlap.
- Each suggestion shows a match percentage, and hovering it explains what the score means. The connection request popup now includes a short "Why we suggested this" note.
- These suggestions appear only for logged-in users; nothing is public.

**Better "Complete Profile with AI"**
- Profile auto-fill is sharper and more accurate: it draws from more sources (competition results for athletes, news and conference appearances for experts), is stricter about not mixing up people with the same name, and now saves the expert's industry automatically.

**Security & Reliability**
- Closed several access gaps: the signup email log is locked to admins only, notification settings are private to each user, and our email-sending and AI tools now verify the caller before running.
- The invite code is now checked on the server, so it can't be bypassed from the browser.
- Article content from the admin editor is now scrubbed of anything unsafe before it's displayed.
- Updated underlying software packages with known vulnerabilities.
- Fixed an issue where logged-out visitors briefly couldn't load the public Athletes and Experts pages.

**Small polish**
- Job Board search feels smoother while typing.

---

On approval, this note is ready to copy and send — no code changes involved.
