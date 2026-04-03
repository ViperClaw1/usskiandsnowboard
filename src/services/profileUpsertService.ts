import { supabase } from "@/integrations/supabase/client";

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    if (trimmed.includes(",")) {
      return trimmed
        .split(",")
        .map((v) => v.trim())
        .filter(Boolean);
    }
    return [trimmed];
  }
  return [];
};

/**
 * Downloads an external image and re-uploads it to Supabase Storage.
 * Returns the public URL on success, or null on failure (non-blocking).
 * Path follows RLS requirement: `{userId}/{filename}`.
 */
/**
 * Returns the image URL as-is if it's already a Supabase storage URL,
 * or null if it's an external URL (those are now handled server-side in the edge function).
 */
const resolveImageUrl = (
  imageUrl: string | null | undefined,
): string | null => {
  if (!imageUrl || typeof imageUrl !== "string") return null;
  const trimmed = imageUrl.trim();
  if (!trimmed) return null;
  // If it's already a Supabase storage URL, use it directly
  if (trimmed.includes("supabase.co/storage/")) return trimmed;
  // External URLs should have been uploaded server-side; if not, skip
  return null;
};

const pickImageCandidate = (profileData: any, keys: string[]): string | null => {
  for (const key of keys) {
    const value = profileData?.[key];
    if (typeof value === "string" && value.trim()) return value.trim();
  }
  return null;
};

/**
 * Keeps a short primary industry label for employers (AI often returns "Title (long detail)").
 * Strips parenthetical and bracket suffixes; safe for display and storage after AI auto-fill.
 */
export const normalizeEmployerIndustryTitle = (value: unknown): string | null => {
  if (value == null) return null;
  if (typeof value !== "string") return null;
  let s = value.trim();
  if (!s) return null;
  s = s.split("(")[0].trim();
  s = s.split("[")[0].trim();
  return s.trim() || null;
};

/** Account email from Auth or `profiles` — used to keep role profile `email` in sync during AI upserts. */
const resolveAccountEmail = async (userId: string): Promise<string | null> => {
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (user?.id === userId && typeof user.email === "string" && user.email.trim()) {
    return user.email.trim();
  }

  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (session?.user?.id === userId && typeof session.user.email === "string" && session.user.email.trim()) {
    return session.user.email.trim();
  }

  const { data: row } = await supabase.from("profiles").select("email").eq("id", userId).maybeSingle();
  if (typeof row?.email === "string" && row.email.trim()) {
    return row.email.trim();
  }

  return null;
};

export const upsertExpertProfile = async (userId: string, profileData: any, name: string, url: string) => {
  const accountEmail = await resolveAccountEmail(userId);

  const uploadedPhotoUrl = resolveImageUrl(
    pickImageCandidate(profileData, ["photo_url", "image_url", "profile_image_url", "avatar_url", "headshot_url"]),
  );

  const { data: existing } = await supabase
    .from("expert_profiles")
    .select("id, photo_url")
    .eq("user_id", userId)
    .maybeSingle();

  const expertFields = {
    full_name: profileData.full_name || name.trim(),
    job_title: profileData.job_title || null,
    area_of_expertise: profileData.area_of_expertise || null,
    bio: profileData.bio || null,
    photo_url: uploadedPhotoUrl || existing?.photo_url || null,
    linkedin_url: profileData.linkedin_url || url.trim(),
    ...(accountEmail ? { email: accountEmail } : {}),
  };

  if (existing) {
    const { error: updateErr } = await supabase.from("expert_profiles").update(expertFields).eq("user_id", userId);
    if (updateErr) throw updateErr;
  } else {
    const { error: insertErr } = await supabase.from("expert_profiles").insert({ user_id: userId, ...expertFields });
    if (insertErr) throw insertErr;
  }
};

export const upsertEmployerProfile = async (userId: string, profileData: any, url: string) => {
  const accountEmail = await resolveAccountEmail(userId);

  const uploadedLogoUrl = resolveImageUrl(
    pickImageCandidate(profileData, ["logo_url", "image_url"]),
  );

  const { data: existing } = await supabase
    .from("employer_profiles")
    .select("id, logo_url")
    .eq("user_id", userId)
    .maybeSingle();

  const scrapedContactEmail =
    typeof profileData.contact_email === "string" && profileData.contact_email.trim()
      ? profileData.contact_email.trim()
      : null;

  const employerFields = {
    company_name: profileData.company_name,
    industry: normalizeEmployerIndustryTitle(profileData.industry) ?? null,
    company_size: profileData.company_size || null,
    hq_location: profileData.hq_location || null,
    about: profileData.about || null,
    website: profileData.website || url.trim(),
    logo_url: uploadedLogoUrl || existing?.logo_url || null,
    linkedin_url: profileData.linkedin_url || null,
    contact_person: profileData.contact_person || null,
    // Prefer the signed-in partner’s account email; fall back to AI-scraped site contact.
    contact_email: accountEmail ?? scrapedContactEmail ?? null,
    contact_title: profileData.contact_title || null,
    phone: profileData.phone || null,
    opportunities_offered: profileData.opportunities_offered || null,
    connection_to_ussa: profileData.connection_to_ussa || null,
    job_board_url: profileData.job_board_url || null,
    ...(accountEmail ? { email: accountEmail } : {}),
  };

  if (existing) {
    const { error: updateErr } = await supabase.from("employer_profiles").update(employerFields).eq("user_id", userId);
    if (updateErr) throw updateErr;
  } else {
    const { error: insertErr } = await supabase.from("employer_profiles").insert({ user_id: userId, ...employerFields });
    if (insertErr) throw insertErr;
  }
};

export const upsertAthleteProfile = async (userId: string, profileData: any) => {
  const accountEmail = await resolveAccountEmail(userId);

  const uploadedPhotoUrl = resolveImageUrl(
    pickImageCandidate(profileData, ["photo_url", "image_url", "profile_image_url", "avatar_url", "headshot_url"]),
  );

  if (profileData.first_name || profileData.last_name) {
    await supabase
      .from("profiles")
      .update({
        first_name: profileData.first_name || null,
        last_name: profileData.last_name || null,
      })
      .eq("id", userId);
  }

  const { data: existing } = await supabase
    .from("athlete_profiles")
    .select("id, photo_url")
    .eq("user_id", userId)
    .maybeSingle();

  const athleteFields = {
    sport_discipline: toStringArray(profileData.sport_discipline),
    bio: profileData.bio || null,
    career_interests: toStringArray(profileData.career_interests),
    skills: toStringArray(profileData.skills),
    availability: profileData.availability || null,
    affiliation: ["Current Team Member", "Former Team Member"].includes(profileData.affiliation)
      ? profileData.affiliation
      : "Current Team Member",
    home_mountain: profileData.home_mountain || null,
    photo_url: uploadedPhotoUrl || existing?.photo_url || null,
    instagram_url: profileData.instagram_url || null,
    sponsors: toStringArray(profileData.sponsors),
    professional_highlights: profileData.professional_highlights || null,
    is_public: true,
    ...(accountEmail ? { email: accountEmail } : {}),
  };

  const completenessFields = Object.values(athleteFields).filter((_, i) => i < 12);
  const filledCount = completenessFields.filter(
    (v) => v !== null && v !== undefined && v !== "" && !(Array.isArray(v) && v.length === 0),
  ).length;
  const completeness = Math.round((filledCount / completenessFields.length) * 100);
  (athleteFields as any).profile_completeness = completeness;

  if (existing) {
    const { error: updateErr } = await supabase.from("athlete_profiles").update(athleteFields).eq("user_id", userId);
    if (updateErr) throw updateErr;
  } else {
    const { error: insertErr } = await supabase.from("athlete_profiles").insert({ user_id: userId, ...athleteFields });
    if (insertErr) throw insertErr;
  }
};
