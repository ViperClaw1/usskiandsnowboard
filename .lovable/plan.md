

# Enhanced Welcome Popup for Invited Users

## Overview

Replace the current single-step welcome popup with a two-step flow:
1. **Step 1 - Welcome Message**: A comprehensive, role-specific welcome screen with a "Complete Your Profile" button
2. **Step 2 - Profile Method Choice**: The existing "Complete with AI" and a renamed "Complete Manually" button (previously "Skip for now")

Clicking "Complete Manually" opens the Update Profile dialog directly instead of dismissing the popup.

## Changes

### File: `src/pages/Dashboard.tsx`

**1. Add a `welcomeStep` state** to track which screen of the popup is showing (`"welcome"` or `"choose"`).

**2. Replace the welcome Dialog content** with conditional rendering based on `welcomeStep`:

- **Step "welcome"** (new): Shows role-specific header, body text with bullet points, and a "Complete Your Profile" button that advances to step "choose".
  - Athlete content: "Welcome to Athlete Connection" header with the provided body text and bullet list.
  - Partner content: "Welcome to Athlete Connection" header with the provided body text and bullet list.
  - The dialog will use `ScrollArea` or `overflow-y-auto` to handle the longer content on smaller screens.

- **Step "choose"** (existing, modified): Shows the current "Complete with AI" button. The "Skip for now" button is renamed to "Complete Manually" and clicking it:
  - Closes the welcome popup
  - Opens the profile edit dialog by calling `handleOpenProfileDialog()` -- a new callback that sets a state flag to signal the active dashboard component to show its profile dialog

**3. Add a mechanism to open the profile dialog from Dashboard level:**
  - Add a `pendingManualProfile` state. When "Complete Manually" is clicked, set it to `true` and close the welcome popup.
  - Pass this flag down to `AthleteDashboard` / `EmployerDashboard` as a new `openProfileDialog` prop.
  - In those components, watch for the prop and call `setShowProfileDialog(true)` when it becomes true, then notify the parent to reset it.

### File: `src/components/dashboard/AthleteDashboard.tsx`

- Accept optional `openProfileDialog` prop and `onProfileDialogOpened` callback
- Add a `useEffect` that opens the profile dialog when `openProfileDialog` becomes `true`, then calls `onProfileDialogOpened()` to reset

### File: `src/components/dashboard/EmployerDashboard.tsx`

- Same pattern: accept `openProfileDialog` and `onProfileDialogOpened` props
- Open the profile dialog when the flag is set

## Technical Details

The welcome popup step content for athletes (abbreviated):
```
Header: "Welcome to Athlete Connection"
Body: Long-form text with bullet list using ** markers rendered as bold text
Button: "Complete Your Profile" -> advances to step "choose"
```

The "choose" step:
```
"Complete with AI" button -> opens AIProfilePopulator (existing behavior)
"Complete Manually" button -> closes dialog, opens profile edit dialog
```

State flow:
```text
welcomeStep="welcome"
  |-- Click "Complete Your Profile"
  |-- welcomeStep="choose"
       |-- "Complete with AI" -> existing AI flow
       |-- "Complete Manually" -> close dialog, set pendingManualProfile=true
            |-- AthleteDashboard/EmployerDashboard sees prop, opens profile dialog
```

