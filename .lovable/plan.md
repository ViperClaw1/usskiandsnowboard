
## Plan: Activity Board redesign + real-time hot-reload

### Overview
Two distinct changes:
1. **Activity Board UI**: Remove the 3 filter tabs, render a single chronological list where "new" items (≤7 days) always float to the top with visual highlighting. Inbound pending requests show Accept/Decline inline via the same Dialog. After accepting, the row moves to the non-new section (stays in list). After declining, the row is removed immediately.
2. **Real-time hot-reload**: Wire Supabase Realtime subscriptions everywhere data can change so that every affected component updates without a page refresh.

---

### Part 1: Activity Board Redesign (`ConnectionActivityBoard.tsx`)

**Current**: filter tabs (All/New/Existing), date-grouped table.

**New layout**:
```
--- New (3) ---
[highlighted row] Company A | message | ●New | Accept | Decline | 2:30 PM
[highlighted row] Company B | ...    | ●New | Accept | Decline | yesterday

--- Earlier ---
[normal row] Company C | ...  | ✓ Connected | Mar 3
```

**Sorting logic**:
- Items within `isNew=true` group → sorted `createdAt` desc
- Items within `isNew=false` (existing) group → sorted `createdAt` desc
- New group always renders first

**"New" row highlighting**:
- `bg-primary/5 border-l-2 border-l-primary` on the `<TableRow>`
- Stays highlighted until the opposite-side user acts on it (Accept/Decline)
- "New" badge on the row

**Inline Accept/Decline**:
- Only shown when `row.direction === "inbound"` AND `row.status === "pending"`
- Clicking the row (or an "Open" button) opens the existing accept/decline Dialog (reuse logic from `ConnectionRequestsManager`)
- Accept → calls supabase update to `accepted`, then `queryClient.invalidateQueries` → row moves to "Earlier" section, status shows "✓ Connected"
- Decline → calls supabase delete, then invalidate → row disappears immediately

**Props change**: Add `onActionComplete?: () => void` callback so parent can chain invalidations if needed (optional, realtime handles it).

**Remove**: The `<Tabs>` filter UI entirely. Remove the `filter` state and the `useMemo` filtered list.

---

### Part 2: Real-time Hot-Reload

The goal is: any DB change to `connection_requests` instantly updates all visible UI.

#### Current realtime gaps

| Component | Current realtime | Gap |
|---|---|---|
| `AthleteLandingPage` (stats card) | ✅ has subscription on `athlete_id` | Already works for own-profile changes |
| `PartnerLandingPage` (stats card) | ✅ has subscription on `employer_id` | Already works for own-profile changes |
| `ConnectionActivityBoard` | ❌ only `useQuery` with 2min stale | No realtime at all |
| `EmployerDirectory` (button state) | ❌ only manual `invalidateQueries` on send | No realtime for accept/decline by other side |
| Athlete `ConnectionRequestsManager` | Uses imperative `loadRequests()` after action | Fine for own actions, but no cross-user signal |
| Employer `ConnectionRequestsManager` | Same | Same |

#### Fixes

**A. `ConnectionActivityBoard.tsx`** — add a `useEffect` Realtime subscription:
```typescript
useEffect(() => {
  const channel = supabase
    .channel(`activity-board-${profileId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "connection_requests",
      filter: profileType === "athlete"
        ? `athlete_id=eq.${profileId}`
        : `employer_id=eq.${profileId}`,
    }, () => queryClient.invalidateQueries({ queryKey }))
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [profileId, profileType, queryClient]);
```
This covers the activity board for all changes (inserts, updates, deletes).

**B. `EmployerDirectory.tsx` — button state after remote accept/decline**

The `existingRequests` Map is currently only invalidated when the athlete *sends* a request. If the employer accepts or declines on their side, the athlete's directory button never updates.

Fix: Add a realtime subscription scoped to `athlete_id=eq.${athleteProfileId}` that invalidates `["existing-employer-requests", athleteProfileId]`:
```typescript
useEffect(() => {
  if (!athleteProfileId) return;
  const channel = supabase
    .channel(`employer-dir-requests-${athleteProfileId}`)
    .on("postgres_changes", {
      event: "*",
      schema: "public",
      table: "connection_requests",
      filter: `athlete_id=eq.${athleteProfileId}`,
    }, () => queryClient.invalidateQueries({
      queryKey: ["existing-employer-requests", athleteProfileId]
    }))
    .subscribe();
  return () => supabase.removeChannel(channel);
}, [athleteProfileId, queryClient]);
```
- Accept by employer → `status` updates to `accepted` → realtime fires → `fetchExistingRequests` re-runs → Map updates → button shows "✓ Connected" (disabled)
- Decline by employer → record deleted → realtime fires → Map updates → button shows "Request Connection" (enabled)

**C. `AthleteLandingPage` + `PartnerLandingPage` stats cards**

Both already have realtime subscriptions that call `invalidateQueries` on connection_requests changes. However, the subscription is only set up **after** `profile?.id` is known, and the filter uses that id. This is fine as-is — the stats update immediately when changes happen. No changes needed here.

**D. `ConnectionActivityBoard` inline actions** — after Accept/Decline inside the board:
- The realtime subscription (added in fix A) automatically catches the mutation and re-fetches, so explicit `invalidateQueries` in the action handlers is a belt-and-suspenders extra. Both realtime + manual invalidation will be used.

---

### Files to change

1. **`src/components/connections/ConnectionActivityBoard.tsx`** — major rewrite:
   - Remove `filter` state + tabs
   - Split rows into `newRows` / `existingRows` by `isNew`, render new group first with highlighted rows
   - Add inline Accept/Decline actions for inbound pending rows (own Dialog inside the component)
   - Add `useQueryClient` + realtime subscription
   - Accept → `supabase.update({ status: "accepted" })` + invalidate + notify edge function
   - Decline → `supabase.delete()` + invalidate

2. **`src/components/athlete/EmployerDirectory.tsx`** — add realtime subscription for `["existing-employer-requests", athleteProfileId]` to hot-reload button states.

3. **No changes needed** to `AthleteLandingPage`, `PartnerLandingPage`, `AthleteDashboard`, `EmployerDashboard`, or the `ConnectionRequestsManagers` for the realtime objective — they already call `loadRequests()` / invalidate after their own mutations, and the landing page stat cards already have working realtime subscriptions.

---

### Accept/Decline Dialog inside ActivityBoard

Since the board now needs to handle accept/decline for inbound requests, the component will include:
- A `useState<ActivityRow | null>` for `actionRow`
- A small `Dialog` that shows:
  - For athletes accepting an employer request: same accept button + `send-connection-notification`
  - For employers accepting an athlete request: same accept dialog with message field
- On confirm: mutate → invalidate (realtime also fires for belt-and-suspenders)

This avoids duplicating the full `ConnectionRequestsManager` but reuses the same Supabase mutation pattern.

### Visual spec for new/existing sections
```
New (2)          ← collapsible label with count
────────────────────────────────────────────────
[bg-primary/5 row] Nike Corp | "Hi, interested..." | ●New | Accept | Decline | 2:30 PM
[bg-primary/5 row] Patagonia | "We'd love..."      | ●New | Accept | Decline | yesterday

Earlier
────────────────────────────────────────────────
March 5, 2026  
[normal row] Red Bull | "Great profile" | ✓ Connected | 11:00 AM
March 3, 2026
[normal row] GoPro    | "Interested..." | ✓ Connected | 9:15 AM
```
