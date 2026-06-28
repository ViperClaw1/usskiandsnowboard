export const EMPLOYMENT_TYPES = [
  "Full-time",
  "Part-time",
  "Contract",
  "Internship",
  "Seasonal",
  "Temporary",
] as const;

export const REMOTE_STATUSES = ["Remote", "Hybrid", "On-site"] as const;

import { INDUSTRY_OPTIONS } from "@/data/suggestions";

// Job Board uses the same industry list as Expert profiles so the two stay in sync.
export const DEFAULT_INDUSTRIES = INDUSTRY_OPTIONS;

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
