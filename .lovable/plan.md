

# Fix AuthenticatedNav Flashing with a Shared Layout Route

## Problem

`AuthenticatedNav` is rendered inside each individual page component. When navigating between routes, React unmounts the entire previous page (including the nav) and mounts a fresh one, causing a visible flash/remount of the navigation bar.

## Solution

Create a layout route component that renders `AuthenticatedNav` once, above an `<Outlet />`. All routes wrap inside this layout so the nav persists across navigation without unmounting.

## Architecture

```text
BrowserRouter
  +-- Routes
       +-- Route element={<AppLayout />}       <-- NEW shared layout
       |     +-- Route path="/" ...
       |     +-- Route path="/dashboard" ...
       |     +-- Route path="/athletes" ...
       |     +-- Route path="/employers" ...
       |     +-- ... all other routes
       +-- (no routes outside the layout)
```

The layout component checks auth state:
- If user is logged in: renders `AuthenticatedNav` + `<Outlet />`
- If user is not logged in: renders only `<Outlet />` (pages handle their own public headers)

## Files to Create

**`src/components/AppLayout.tsx`** -- Layout component that renders `AuthenticatedNav` conditionally based on auth, plus `<Outlet />` for child routes.

## Files to Modify

| File | Change |
|------|--------|
| `src/App.tsx` | Wrap all routes inside a parent `<Route element={<AppLayout />}>` layout route |
| `src/pages/Home.tsx` | Remove `<AuthenticatedNav />` import and usage |
| `src/pages/Athletes.tsx` | Remove `<AuthenticatedNav />` import and usage; keep public header for unauthenticated view |
| `src/pages/Employers.tsx` | Remove `<AuthenticatedNav />` import and usage; keep public header for unauthenticated view |
| `src/pages/Schedule.tsx` | Remove `<AuthenticatedNav />` conditional; keep public header for unauthenticated view |
| `src/pages/News.tsx` | Remove `<AuthenticatedNav />` conditional; keep public header for unauthenticated view |
| `src/components/dashboard/AthleteDashboard.tsx` | Remove `<AuthenticatedNav />` import and usage |
| `src/components/dashboard/EmployerDashboard.tsx` | Remove `<AuthenticatedNav />` import and usage |
| `src/components/dashboard/AdminDashboard.tsx` | Remove `<AuthenticatedNav />` import and usage |

## Technical Details

### AppLayout Component

```tsx
import { Outlet } from "react-router-dom";
import { useAuth } from "@/components/auth/AuthContext";
import { AuthenticatedNav } from "@/components/AuthenticatedNav";

export const AppLayout = () => {
  const { user } = useAuth();
  return (
    <>
      {user && <AuthenticatedNav />}
      <Outlet />
    </>
  );
};
```

### App.tsx Route Structure

All existing routes become children of a single layout route:

```tsx
<Routes>
  <Route element={<AppLayout />}>
    <Route path="/" element={user ? <Home /> : <Index />} />
    <Route path="/auth" element={<Auth />} />
    {/* ... all other routes ... */}
  </Route>
</Routes>
```

### Page-Level Changes

For pages like **Schedule.tsx** and **News.tsx** that conditionally render either `AuthenticatedNav` or a public header:
- Remove the `AuthenticatedNav` branch entirely
- Keep only the public header branch, but wrap it in `{!user && ( ... )}` so it only shows for unauthenticated visitors (the layout handles the authenticated nav)

For purely authenticated pages like **Home.tsx**, **AthleteDashboard.tsx**, **EmployerDashboard.tsx**, **AdminDashboard.tsx**:
- Simply delete the `<AuthenticatedNav />` line and its import

For **Athletes.tsx** and **Employers.tsx**:
- Remove `<AuthenticatedNav />` from the authenticated view
- Keep the public header in the unauthenticated skeleton/view
- The `FullPageSkeleton` nav placeholder can be removed since the real nav is already rendered by the layout

### What Stays Unchanged

- Admin sub-pages (`/admin/*`) use their own simple `<header>` with a back button -- these are unaffected since they never used `AuthenticatedNav`
- Settings.tsx has no nav (just a back button) -- unaffected
- The `AuthenticatedNav` component itself is unchanged
- `MobileNav` inside `AuthenticatedNav` is unchanged

