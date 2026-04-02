import { supabase } from "@/integrations/supabase/client";

const toStringArray = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((v) => String(v).trim()).filter(Boolean);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return [];
    // Allow both single values and comma-separated values from AI responses.
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

export const upsertExpertProfile = async (userId: string, profileData: any, name: string, url: string) => {
  const { data: existing } = await supabase
    .from("expert_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const expertFields = {
    full_name: profileData.full_name || name.trim(),
    job_title: profileData.job_title || null,
    area_of_expertise: profileData.area_of_expertise || null,
    bio: profileData.bio || null,
    photo_url: profileData.photo_url || null,
    linkedin_url: profileData.linkedin_url || url.trim(),
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
  const { data: existing } = await supabase
    .from("employer_profiles")
    .select("id")
    .eq("user_id", userId)
    .maybeSingle();

  const employerFields = {
    company_name: profileData.company_name,
    industry: profileData.industry || null,
    company_size: profileData.company_size || null,
    hq_location: profileData.hq_location || null,
    about: profileData.about || null,
    website: profileData.website || url.trim(),
    logo_url: profileData.logo_url || null,
    linkedin_url: profileData.linkedin_url || null,
    contact_person: profileData.contact_person || null,
    contact_email: profileData.contact_email || null,
    contact_title: profileData.contact_title || null,
    phone: profileData.phone || null,
    opportunities_offered: profileData.opportunities_offered || null,
    connection_to_ussa: profileData.connection_to_ussa || null,
    job_board_url: profileData.job_board_url || null,
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
  if (profileData.first_name || profileData.last_name) {
    await supabase
      .from("profiles")
      .update({
        first_name: profileData.first_name || null,
        last_name: profileData.last_name || null,
      })
      .eq("id", userId);
  }

  const { data: existing } = await supabase.from("athlete_profiles").select("id").eq("user_id", userId).maybeSingle();

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
    photo_url: profileData.photo_url || null,
    instagram_url: profileData.instagram_url || null,
    sponsors: toStringArray(profileData.sponsors),
    professional_highlights: profileData.professional_highlights || null,
    is_public: true,
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
