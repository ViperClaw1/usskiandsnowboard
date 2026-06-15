// ==============================
// Feature Flags
// Toggle these to enable/disable UI-only features.
// Backend, database, and edge function behavior remain unchanged.
// ==============================

/**
 * Controls visibility of Employer registration and the Employers nav tab
 * throughout the public UI. When false:
 *   - "Employer" is hidden from auth role selectors
 *   - "I'm a Partner / Employer" CTAs are hidden
 *   - The Employers nav link is hidden
 *   - /auth?type=employer falls back to the athlete signup
 *   - RoleSelection hides the employer option
 * Existing employer accounts and backend functionality are unaffected.
 */
export const EMPLOYER_REGISTRATION_ENABLED = false;
