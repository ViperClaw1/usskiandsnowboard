
## Summary

Both directory components need to hide the "Request Connection" button when the viewer is the same role as the profile being viewed:

- **`AthleteDirectory`** (used on `/employers` page by employers viewing athletes): hide the button for **athletes** viewing this page (athletes shouldn't request athletes)
- **`EmployerDirectory`** (used on `/athletes` page by athletes viewing employers): hide the button for **employers** viewing this page (employers shouldn't request employers)

### Button locations to hide

**`src/components/employer/AthleteDirectory.tsx`** — 2 places:
1. Line ~892: Button inside the athlete detail Dialog (Profile tab)
2. Line ~895: `disabled` check references `existingRequests.has(selectedAthlete.id)`

**`src/components/athlete/EmployerDirectory.tsx`** — 3 places:
1. Line ~592: Button on the Employer card grid
2. Line ~710: Button inside the employer detail Dialog (Profile tab)
3. Line ~765: Button inside the employer detail Dialog (Positions tab)

### Changes per file

#### `src/components/employer/AthleteDirectory.tsx`
- Import `useAuth` and `useUserRole`
- Derive `canSendRequest = userRole === "employer"` (only employers can request athletes)
- Wrap all "Request Connection" buttons with `{canSendRequest && <Button ...>}`

#### `src/components/athlete/EmployerDirectory.tsx`
- Import `useAuth` and `useUserRole`
- Derive `canSendRequest = userRole === "athlete"` (only athletes can request employers)
- Wrap all "Request Connection" buttons with `{canSendRequest && <Button ...>}`

### No DB/RLS changes needed
This is purely a frontend visibility restriction. The existing RLS policies already correctly enforce that only athletes can insert into `connection_requests` for athlete→employer flows, and vice versa, so this is defence-in-depth at the UI layer.

### Files changed
```
src/components/employer/AthleteDirectory.tsx   add useAuth+useUserRole, wrap 1 button
src/components/athlete/EmployerDirectory.tsx   add useAuth+useUserRole, wrap 3 buttons (card + 2 dialog tabs)
```
