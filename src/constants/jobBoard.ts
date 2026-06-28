export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Seasonal",
  "Temporary",
] as const;

export const REMOTE_STATUSES = ["Remote", "Hybrid", "On-site"] as const;

export const DEFAULT_INDUSTRIES = [
  "Sports & Recreation",
  "Marketing & Media",
  "Finance",
  "Technology",
  "Hospitality",
  "Healthcare",
  "Education",
  "Nonprofit",
  "Sales",
  "Operations",
  "Other",
] as const;

export type EmploymentType = (typeof EMPLOYMENT_TYPES)[number];
export type RemoteStatus = (typeof REMOTE_STATUSES)[number];

export const NEW_BADGE_WINDOW_MS = 30 * 24 * 60 * 60 * 1000;
export const ARCHIVE_AFTER_DAYS = 60;

export function isNewPost(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  return Date.now() - new Date(createdAt).getTime() <= NEW_BADGE_WINDOW_MS;
}

export function isWithinActiveWindow(createdAt: string | null | undefined): boolean {
  if (!createdAt) return false;
  const ms = ARCHIVE_AFTER_DAYS * 24 * 60 * 60 * 1000;
  return Date.now() - new Date(createdAt).getTime() <= ms;
}
