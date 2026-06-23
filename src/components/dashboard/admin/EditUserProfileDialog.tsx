import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MultiSelect } from "@/components/ui/multi-select";
import {
  INDUSTRY_OPTIONS,
  SPORT_DISCIPLINES_OPTIONS,
  CAREER_INTERESTS_OPTIONS,
  SKILLS_OPTIONS,
  SPONSORS_OPTIONS,
} from "@/data/suggestions";

type EditableRole = "athlete" | "expert";

interface EditUserProfileDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  userId: string;
  userName: string;
  role: EditableRole;
}

const tableFor = (role: EditableRole) =>
  role === "athlete" ? "athlete_profiles" : "expert_profiles";
const bucketFor = (role: EditableRole) =>
  role === "athlete" ? "athlete-photos" : "expert-photos";

const toArray = (val: unknown): string[] => {
  if (Array.isArray(val)) return val.filter(Boolean);
  if (typeof val === "string" && val.trim()) {
    return val.split(",").map((s) => s.trim()).filter(Boolean);
  }
  return [];
};

const opts = (arr: readonly (string | { label: string; value: string })[]) =>
  arr.map((v) => (typeof v === "string" ? { label: v, value: v } : v));

export const EditUserProfileDialog = ({
  open,
  onOpenChange,
  userId,
  userName,
  role,
}: EditUserProfileDialogProps) => {
  const queryClient = useQueryClient();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [profileId, setProfileId] = useState<string | null>(null);

  // Shared
  const [photoUrl, setPhotoUrl] = useState("");
  const [bio, setBio] = useState("");
  const [email, setEmail] = useState("");
  const [isPublic, setIsPublic] = useState(true);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState("");

  // Athlete
  const [sportDiscipline, setSportDiscipline] = useState<string[]>([]);
  const [careerInterests, setCareerInterests] = useState<string[]>([]);
  const [skills, setSkills] = useState<string[]>([]);
  const [geographicPreferences, setGeographicPreferences] = useState("");
  const [availability, setAvailability] = useState("");
  const [professionalHighlights, setProfessionalHighlights] = useState("");
  const [yearsOfMembership, setYearsOfMembership] = useState<string>("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [sponsors, setSponsors] = useState<string[]>([]);
  const [affiliation, setAffiliation] = useState<string>("");
  const [homeMountain, setHomeMountain] = useState("");
  const [phone, setPhone] = useState("");

  // Expert
  const [fullName, setFullName] = useState("");
  const [title, setTitle] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [industry, setIndustry] = useState<string[]>([]);
  const [areaOfExpertise, setAreaOfExpertise] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [isAlum, setIsAlum] = useState(false);
  const [ussaAffiliate, setUssaAffiliate] = useState("");
  const [headshot, setHeadshot] = useState("");

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from(tableFor(role))
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();
      if (cancelled) return;
      if (error) {
        toast.error(`Failed to load profile: ${error.message}`);
        setLoading(false);
        return;
      }
      if (!data) {
        setProfileId(null);
        toast.error("No profile exists yet for this user.");
        setLoading(false);
        return;
      }
      const d = data as any;
      setProfileId(d.id);
      setPhotoUrl(d.photo_url ?? "");
      setBio(d.bio ?? "");
      setEmail(d.email ?? "");
      setIsPublic(d.is_public ?? true);
      setBackgroundImageUrl(d.background_image_url ?? "");

      if (role === "athlete") {
        setSportDiscipline(toArray(d.sport_discipline));
        setCareerInterests(toArray(d.career_interests));
        setSkills(toArray(d.skills));
        setGeographicPreferences(toArray(d.geographic_preferences).join(", "));
        setAvailability(d.availability ?? "");
        setProfessionalHighlights(d.professional_highlights ?? "");
        setYearsOfMembership(d.years_of_membership != null ? String(d.years_of_membership) : "");
        setInstagramUrl(d.instagram_url ?? "");
        setSponsors(toArray(d.sponsors));
        setAffiliation(d.affiliation ?? "");
        setHomeMountain(d.home_mountain ?? "");
        setPhone(d.phone ?? "");
      } else {
        setFullName(d.full_name ?? "");
        setTitle(d.job_title ?? "");
        setCompanyName(d.company_name ?? "");
        setIndustry(toArray(d.industry));
        setAreaOfExpertise(d.area_of_expertise ?? "");
        setLinkedinUrl(d.linkedin_url ?? "");
        setIsAlum(!!d.is_alum);
        setUssaAffiliate(d.ussa_affiliate ?? "");
        setHeadshot(d.headshot ?? "");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId, role]);

  const handleUpload = async (file: File, setter: (v: string) => void) => {
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB");
      return;
    }
    setUploading(true);
    try {
      const ext = file.name.split(".").pop() || "jpg";
      const path = `${userId}/admin-${Date.now()}.${ext}`;
      const { error: upErr } = await supabase.storage
        .from(bucketFor(role))
        .upload(path, file, { upsert: true, contentType: file.type });
      if (upErr) throw upErr;
      const { data } = supabase.storage.from(bucketFor(role)).getPublicUrl(path);
      setter(data.publicUrl);
      toast.success("Photo uploaded");
    } catch (e) {
      toast.error(`Upload failed: ${(e as Error).message}`);
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async () => {
    if (!profileId) return;
    setSaving(true);
    const payload: Record<string, any> =
      role === "athlete"
        ? {
            photo_url: photoUrl || null,
            bio: bio || null,
            email: email || null,
            is_public: isPublic,
            background_image_url: backgroundImageUrl || null,
            sport_discipline: sportDiscipline.length ? sportDiscipline : null,
            career_interests: careerInterests.length ? careerInterests : null,
            skills: skills.length ? skills : null,
            geographic_preferences: toArray(geographicPreferences).length
              ? toArray(geographicPreferences)
              : null,
            availability: availability || null,
            professional_highlights: professionalHighlights || null,
            years_of_membership: yearsOfMembership ? parseInt(yearsOfMembership, 10) : null,
            instagram_url: instagramUrl || null,
            sponsors: sponsors.length ? sponsors : null,
            affiliation: affiliation || null,
            home_mountain: homeMountain || null,
            phone: phone || null,
          }
        : {
            photo_url: photoUrl || null,
            bio: bio || null,
            email: email || null,
            is_public: isPublic,
            background_image_url: backgroundImageUrl || null,
            full_name: fullName || userName || "",
            job_title: title || null,
            company_name: companyName || null,
            industry: industry.length ? industry.join(", ") : null,
            area_of_expertise: areaOfExpertise || null,
            linkedin_url: linkedinUrl || null,
            is_alum: isAlum,
            ussa_affiliate: ussaAffiliate || null,
            headshot: headshot || null,
          };

    const { error } = await supabase
      .from(tableFor(role))
      .update(payload)
      .eq("id", profileId);
    setSaving(false);
    if (error) {
      toast.error(`Save failed: ${error.message}`);
      return;
    }
    toast.success("Profile updated");
    queryClient.invalidateQueries({ queryKey: ["all-users-full"] });
    queryClient.invalidateQueries({ queryKey: ["all-athletes"] });
    queryClient.invalidateQueries({ queryKey: ["all-experts"] });
    onOpenChange(false);
  };

  const initials = userName
    .split(" ")
    .map((s) => s[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit {role === "athlete" ? "Athlete" : "Expert"} Profile</DialogTitle>
          <DialogDescription>
            Update all fields for {userName || "this user"}'s profile.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Photo */}
            <div className="flex items-center gap-4">
              <Avatar className="h-20 w-20">
                <AvatarImage src={photoUrl || undefined} alt={userName} />
                <AvatarFallback>{initials || "?"}</AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-2">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) handleUpload(f, setPhotoUrl);
                    e.target.value = "";
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  disabled={uploading || !profileId}
                  onClick={() => fileInputRef.current?.click()}
                >
                  {uploading ? (
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Upload className="h-4 w-4 mr-2" />
                  )}
                  Upload Photo
                </Button>
                {photoUrl && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className="text-destructive hover:text-destructive"
                    onClick={() => setPhotoUrl("")}
                  >
                    Remove
                  </Button>
                )}
              </div>
            </div>

            {role === "expert" && (
              <div className="space-y-2">
                <Label htmlFor="admin-edit-fullname">Full Name</Label>
                <Input
                  id="admin-edit-fullname"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  disabled={!profileId}
                />
              </div>
            )}

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="admin-edit-email">Email</Label>
                <Input
                  id="admin-edit-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  disabled={!profileId}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="admin-edit-bg">Background Image URL</Label>
                <Input
                  id="admin-edit-bg"
                  value={backgroundImageUrl}
                  onChange={(e) => setBackgroundImageUrl(e.target.value)}
                  placeholder="https://..."
                  disabled={!profileId}
                />
              </div>
            </div>

            <div className="flex items-center justify-between rounded-md border p-3">
              <div>
                <Label htmlFor="admin-edit-public">Public Profile</Label>
                <p className="text-xs text-muted-foreground">Visible in the directory.</p>
              </div>
              <Switch id="admin-edit-public" checked={isPublic} onCheckedChange={setIsPublic} disabled={!profileId} />
            </div>

            {role === "athlete" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="admin-edit-phone">Phone</Label>
                    <Input id="admin-edit-phone" value={phone} onChange={(e) => setPhone(e.target.value)} disabled={!profileId} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-edit-home-mtn">Home Mountain</Label>
                    <Input id="admin-edit-home-mtn" value={homeMountain} onChange={(e) => setHomeMountain(e.target.value)} disabled={!profileId} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-edit-ig">Instagram URL</Label>
                    <Input id="admin-edit-ig" value={instagramUrl} onChange={(e) => setInstagramUrl(e.target.value)} disabled={!profileId} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-edit-years">Years of Membership</Label>
                    <Input
                      id="admin-edit-years"
                      type="number"
                      min={0}
                      value={yearsOfMembership}
                      onChange={(e) => setYearsOfMembership(e.target.value)}
                      disabled={!profileId}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Availability</Label>
                    <Select value={availability || "none"} onValueChange={(v) => setAvailability(v === "none" ? "" : v)} disabled={!profileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select availability" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        <SelectItem value="Available Now">Available Now</SelectItem>
                        <SelectItem value="Off-Season Only">Off-Season Only</SelectItem>
                        <SelectItem value="Post-Retirement">Post-Retirement</SelectItem>
                        <SelectItem value="Part-Time">Part-Time</SelectItem>
                        <SelectItem value="Flexible">Flexible</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Affiliation</Label>
                    <Select value={affiliation || "none"} onValueChange={(v) => setAffiliation(v === "none" ? "" : v)} disabled={!profileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select affiliation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">No formal affiliation</SelectItem>
                        <SelectItem value="Current Team Member">Current Team Member</SelectItem>
                        <SelectItem value="Former Team Member">Former Team Member</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Sport Discipline</Label>
                  <MultiSelect
                    options={opts(SPORT_DISCIPLINES_OPTIONS)}
                    selected={sportDiscipline}
                    onChange={setSportDiscipline}
                    placeholder="Select sports..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Career Interests</Label>
                  <MultiSelect
                    options={opts(CAREER_INTERESTS_OPTIONS)}
                    selected={careerInterests}
                    onChange={setCareerInterests}
                    placeholder="Select interests..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Skills</Label>
                  <MultiSelect
                    options={opts(SKILLS_OPTIONS)}
                    selected={skills}
                    onChange={setSkills}
                    placeholder="Select skills..."
                  />
                </div>
                <div className="space-y-2">
                  <Label>Sponsors</Label>
                  <MultiSelect
                    options={opts(SPONSORS_OPTIONS)}
                    selected={sponsors}
                    onChange={setSponsors}
                    placeholder="Select sponsors..."
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-edit-geo">Geographic Preferences</Label>
                  <Input
                    id="admin-edit-geo"
                    value={geographicPreferences}
                    onChange={(e) => setGeographicPreferences(e.target.value)}
                    placeholder="Comma-separated (e.g. Denver CO, Park City UT)"
                    disabled={!profileId}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-edit-highlights">Professional Highlights</Label>
                  <Textarea
                    id="admin-edit-highlights"
                    rows={3}
                    value={professionalHighlights}
                    onChange={(e) => setProfessionalHighlights(e.target.value)}
                    disabled={!profileId}
                  />
                </div>
              </>
            )}

            {role === "expert" && (
              <>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="admin-edit-title">Job Title</Label>
                    <Input id="admin-edit-title" value={title} onChange={(e) => setTitle(e.target.value)} disabled={!profileId} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-edit-company">Company Name</Label>
                    <Input id="admin-edit-company" value={companyName} onChange={(e) => setCompanyName(e.target.value)} disabled={!profileId} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-edit-expertise">Area of Expertise</Label>
                    <Input id="admin-edit-expertise" value={areaOfExpertise} onChange={(e) => setAreaOfExpertise(e.target.value)} disabled={!profileId} />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-edit-linkedin">LinkedIn URL</Label>
                    <Input id="admin-edit-linkedin" value={linkedinUrl} onChange={(e) => setLinkedinUrl(e.target.value)} disabled={!profileId} />
                  </div>
                  <div className="space-y-2">
                    <Label>USSA Affiliation</Label>
                    <Select value={ussaAffiliate || "none"} onValueChange={(v) => setUssaAffiliate(v === "none" ? "" : v)} disabled={!profileId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select affiliation" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="none">— None —</SelectItem>
                        <SelectItem value="Athlete Alum">Athlete Alum</SelectItem>
                        <SelectItem value="Trustee">Trustee</SelectItem>
                        <SelectItem value="Ambassador">Ambassador</SelectItem>
                        <SelectItem value="Gold Pass">Gold Pass</SelectItem>
                        <SelectItem value="Next Gen Council">Next Gen Council</SelectItem>
                        <SelectItem value="No formal affiliation">No formal affiliation</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="admin-edit-headshot">Headshot URL</Label>
                    <Input id="admin-edit-headshot" value={headshot} onChange={(e) => setHeadshot(e.target.value)} disabled={!profileId} />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Industry</Label>
                  <MultiSelect
                    options={INDUSTRY_OPTIONS.map((ind) => ({ label: ind, value: ind }))}
                    selected={industry}
                    onChange={setIndustry}
                    placeholder="Select industries..."
                  />
                </div>
                <div className="flex items-center justify-between rounded-md border p-3">
                  <div>
                    <Label htmlFor="admin-edit-alum">Alum</Label>
                    <p className="text-xs text-muted-foreground">Mark as a U.S. Ski &amp; Snowboard alum.</p>
                  </div>
                  <Switch id="admin-edit-alum" checked={isAlum} onCheckedChange={setIsAlum} disabled={!profileId} />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-edit-bio">Bio</Label>
              <Textarea
                id="admin-edit-bio"
                rows={6}
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Short description for this user's profile..."
                disabled={!profileId}
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={saving || loading || !profileId}>
            {saving && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Save Changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
