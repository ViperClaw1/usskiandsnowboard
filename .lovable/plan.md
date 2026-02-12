

# Phone Number Input: Validation, Mask, and Inline Alerts

## Overview

Enhance the Phone Number input on the Settings page with a US phone mask format `+1 (XXX) XXX-XX-XX`, inline validation errors (matching the Auth.tsx pattern), and a disabled Save button until the input is valid.

## Changes

All changes in a single file: **`src/pages/Settings.tsx`**

### 1. Phone Input Mask

- Replace freeform text input with a masked formatter
- As the user types digits, auto-format to `+1 (XXX) XXX-XX-XX`
- Strip non-digit characters internally; store raw digits
- Add a helper `formatPhone(value)` that takes raw digits and returns the masked string
- Add a helper `unformatPhone(value)` that strips formatting to raw digits
- Placeholder updated to `+1 (___) ___-__-__`

### 2. Validation

- A phone number is valid when it has exactly 11 digits (country code + 10 digits)
- Add a `phoneError` state string to track the current validation message
- Add a `phoneTouched` boolean state to track if the field has been blurred
- On blur: if empty, show "Phone number is required"; if not 11 digits, show "Please enter a valid US phone number"
- On change: clear error if user is actively typing and the field becomes valid

### 3. Inline Error Display

- Show a red `<p>` tag below the input (same style as Auth.tsx: `text-sm text-destructive`)
- Only show after the field has been touched (blurred at least once)

### 4. Save Button State

- Disable the Save button unless the phone number has exactly 11 raw digits
- Keep the existing `saving` disable condition

### 5. Database Storage

- Before saving to the database, convert the formatted value back to E.164 format (e.g., `+12345678901`)
- When loading from database, parse and apply the mask to display

## Technical Details

```
State additions:
  - phoneTouched: boolean (default false)
  - phoneError: string (default "")

formatPhone(digits: string) -> "+1 (XXX) XXX-XX-XX" 
  - Takes raw digit string, returns masked display
  
unformatPhone(display: string) -> "12345678901"
  - Strips all non-digits

Validation logic:
  - Empty -> "Phone number is required"
  - Length != 11 -> "Please enter a valid US phone number"
  - Valid -> "" (no error)

Save button disabled when:
  - saving === true
  - OR raw digits length !== 11
```

## What Stays the Same

- All notification toggle switches and radio buttons -- no changes
- SMS enable/disable switch logic -- no changes
- The rest of the Settings page layout -- no changes
