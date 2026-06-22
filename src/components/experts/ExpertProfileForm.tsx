import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { INDUSTRY_OPTIONS } from "@/data/suggestions";
import usLogo from "@/assets/us-logo-new.png";

interface ExpertProfileFormProps {
  initialData?: Partial<ExpertFormState>;
  expertId?: string;
  adminUserId?: string;
  userId: string;
  onSaved?: () => void;
  onCancel?: () => void;
}

interface ExpertFormState {
  full_name: string;
  linkedin_url: string;
  job_title: string;
  company_name: string;
  area_of_expertise: string;
  headshot: string;
  bio: string;
  industry: string[];
  ussa_affiliate: "" | "Athlete Alum" | "Trustee" | "Ambassador" | "Gold Pass" | "Next Gen Council" | "No formal affiliation";
  is_alum: boolean;
  email: string;
  photo_url: string;
}

const EMPTY: ExpertFormState = {
  full_name: "",
  linkedin_url: "",
  job_title: "",
  company_name: "",
  area_of_expertise: "",
  headshot: "",
  bio: "",
  industry: [],
  ussa_affiliate: "",
  is_alum: false,
  email: "",
  photo_url: "",
};

const AFFILIATE_OPTIONS = ["Athlete Alum", "Trustee", "Ambassador", "Gold Pass", "Next Gen Council", "No formal affiliation"] as const;

export const ExpertProfileForm = ({
  initialData,
  expertId,
  adminUserId,
  userId,
  onSaved,
  onCancel,
}: ExpertProfileFormProps) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ExpertFormState>(() => {
    const merged = { ...EMPTY, ...initialData };
    const normalizedIndustry = Array.isArray(merged.industry)
      ? merged.industry
      : typeof (merged.industry as any) === "string"
        ? (merged.industry as any)
            .split(",")
            .map((v) => v.trim())
            .filter(Boolean)
        : [];

    return {
      ...merged,
      industry: normalizedIndustry,
      ussa_affiliate: (merged.ussa_affiliate as ExpertFormState["ussa_affiliate"]) ?? "",
    };
  });
  const [saving, setSaving] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof ExpertFormState, value: string | boolean | string[]) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast.error("Please select an image file.");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be under 5MB.");
      return;
    }
    setUploadingPhoto(true);
    try {
      const ext = file.name.split(".").pop();
      const path = `${userId}/profile/photo.${ext}`;

      // Remove old photo if exists
      if (form.photo_url) {
        const oldPath = form.photo_url.split("/expert-photos/")[1];
        if (oldPath) {
          await supabase.storage.from("expert-photos").remove([oldPath]);
        }
      }

      const { error } = await supabase.storage.from("expert-photos").upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage.from("expert-photos").getPublicUrl(path);
      set("photo_url", urlData.publicUrl);
      toast.success("Photo uploaded!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploadingPhoto(false);
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const handleRemovePhoto = async () => {
    if (form.photo_url) {
      const oldPath = form.photo_url.split("/expert-photos/")[1];
      if (oldPath) {
        await supabase.storage.from("expert-photos").remove([oldPath]);
      }
    }
    set("photo_url", "");
  };

  const handleSave = async () => {
    if (!form.photo_url.trim()) {
      toast.error("Profile photo is required.");
      return;
    }
    if (!form.full_name.trim()) {
      toast.error("Full name is required.");
      return;
    }
    if (form.linkedin_url.trim()) {
      try {
        const parsed = new URL(form.linkedin_url.trim());
        if (!["http:", "https:"].includes(parsed.protocol)) {
          throw new Error("invalid protocol");
        }
      } catch {
        toast.error("Please enter a valid LinkedIn URL.");
        return;
      }
    }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        job_title: form.job_title.trim() || null,
        company_name: form.company_name.trim() || null,
        area_of_expertise: form.area_of_expertise.trim() || null,
        headshot: form.headshot.trim() || null,
        bio: form.bio.trim() || null,
        industry: form.industry.length ? form.industry.join(", ") : null,
        ussa_affiliate: form.ussa_affiliate || null,
        is_alum: form.ussa_affiliate === "Athlete Alum",
        linkedin_url: form.linkedin_url.trim() || null,
        email: form.email.trim() || null,
        photo_url: form.photo_url.trim() || null,
      };

      if (expertId) {
        const { error } = await supabase.from("expert_profiles").update(payload).eq("id", expertId);
        if (error) throw error;
      } else {
        if (!adminUserId) throw new Error("Missing user_id for new expert profile");
        const { error } = await supabase.from("expert_profiles").insert({ ...payload, user_id: adminUserId });
        if (error) throw error;
      }

      toast.success("Expert profile saved!");
      queryClient.invalidateQueries({ queryKey: ["expert-profiles"] });
      onSaved?.();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setSaving(false);
    }
  };

  useEffect(() => {
    const loadCurrentUserDefaults = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const metadataFullName =
        (user.user_metadata?.full_name as string | undefined)?.trim() ||
        `${user.user_metadata?.first_name ?? ""} ${user.user_metadata?.last_name ?? ""}`.trim();

      setForm((prev) => ({
        ...prev,
        full_name: prev.full_name.trim() || metadataFullName || prev.full_name,
        email: prev.email.trim() || user.email || prev.email,
      }));
    };
    void loadCurrentUserDefaults();
  }, [userId]);

  return (
    <div className="space-y-5">
      {/* Manual fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Full Name *</Label>
          <Input value={form.full_name} onChange={(e) => set("full_name", e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label>LinkedIn Profile URL</Label>
          <Input
            type="url"
            value={form.linkedin_url}
            onChange={(e) => set("linkedin_url", e.target.value)}
            placeholder="https://www.linkedin.com/in/your-profile/"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Current Role / Title</Label>
          <Input
            value={form.job_title}
            onChange={(e) => set("job_title", e.target.value)}
            placeholder="VP of Marketing"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Company Name</Label>
          <Input
            value={form.company_name}
            onChange={(e) => set("company_name", e.target.value)}
            placeholder="Acme Corp"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Area of Expertise</Label>
          <Input
            value={form.area_of_expertise}
            onChange={(e) => set("area_of_expertise", e.target.value)}
            placeholder="Brand Development, Marketing"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input
            type="email"
            value={form.email}
            placeholder="jane@example.com"
            disabled
            className="bg-muted text-muted-foreground cursor-not-allowed opacity-100"
          />
        </div>
        <div className="space-y-1.5">
          <Label>Industry</Label>
          <MultiSelect
            options={INDUSTRY_OPTIONS.map((ind) => ({ label: ind, value: ind }))}
            selected={form.industry}
            onChange={(values) => set("industry", values)}
            placeholder="Select one or more industries..."
          />
        </div>
        <div className="space-y-1.5">
          <Label className="flex items-center gap-1.5">
            <img src={usLogo} alt="US Ski & Snowboard" className="h-4 w-4 object-contain" />
            US Ski &amp; Snowboard Affiliation
          </Label>
          <Select value={form.ussa_affiliate} onValueChange={(v) => set("ussa_affiliate", v)}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select affiliate type" />
            </SelectTrigger>
            <SelectContent>
              {AFFILIATE_OPTIONS.map((option) => (
                <SelectItem key={option} value={option}>
                  {option}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Photo uploader */}
      <div className="space-y-1.5">
        <Label>Profile Photo</Label>
        <div className="flex items-center gap-4">
          <Avatar className="h-16 w-16">
            {form.photo_url ? <AvatarImage src={form.photo_url} alt="Profile photo" /> : null}
            <AvatarFallback className="text-lg">
              {form.full_name ? form.full_name.charAt(0).toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : <Upload className="h-4 w-4 mr-1" />}
              {uploadingPhoto ? "Uploading..." : "Upload Photo"}
            </Button>
            {form.photo_url && (
              <Button type="button" variant="ghost" size="sm" onClick={handleRemovePhoto}>
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* <div className="space-y-1.5">
        <Label>Headshot</Label>
        <Textarea
          value={form.headshot}
          onChange={(e) => set("headshot", e.target.value)}
          placeholder="Add headshot details (for example: profile image notes, source links, preferred crop/style)..."
          rows={3}
        />
      </div> */}

      <div className="space-y-1.5">
        <Label>Bio</Label>
        <Textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="A brief professional bio..."
          rows={4}
        />
      </div>

      {/* Actions */}
      <div className="flex gap-3 pt-2">
        {onCancel && (
          <Button variant="outline" className="flex-1" onClick={onCancel} disabled={saving}>
            Cancel
          </Button>
        )}
        <Button className="flex-1" onClick={handleSave} disabled={saving}>
          {saving ? "Saving..." : expertId ? "Save Changes" : "Create Expert Profile"}
        </Button>
      </div>
    </div>
  );
};
