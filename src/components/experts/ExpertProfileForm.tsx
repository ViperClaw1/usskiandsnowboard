import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Sparkles, Globe, Loader2, Upload, X } from "lucide-react";
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
  job_title: string;
  area_of_expertise: string;
  headshot: string;
  bio: string;
  industry: string;
  is_alum: boolean;
  linkedin_url: string;
  email: string;
  photo_url: string;
}

const EMPTY: ExpertFormState = {
  full_name: "",
  job_title: "",
  area_of_expertise: "",
  headshot: "",
  bio: "",
  industry: "",
  is_alum: false,
  linkedin_url: "",
  email: "",
  photo_url: "",
};

export const ExpertProfileForm = ({
  initialData,
  expertId,
  adminUserId,
  userId,
  onSaved,
  onCancel,
}: ExpertProfileFormProps) => {
  const queryClient = useQueryClient();
  const [form, setForm] = useState<ExpertFormState>({ ...EMPTY, ...initialData });
  const [saving, setSaving] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const set = (field: keyof ExpertFormState, value: string | boolean) =>
    setForm((prev) => ({ ...prev, [field]: value }));

  const handleAIPopulate = async () => {
    if (!form.linkedin_url.trim() || !form.full_name.trim()) return;
    setAiLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke("ai-populate-profile", {
        body: { role: "expert", url: form.linkedin_url.trim(), name: form.full_name.trim() },
      });
      if (error || !data?.success) throw new Error(data?.error || "AI extraction failed");
      const d = data.data;
      setForm((prev) => ({
        ...prev,
        full_name: d.full_name || prev.full_name,
        job_title: d.job_title || prev.job_title,
        area_of_expertise: d.area_of_expertise || prev.area_of_expertise,
        bio: d.bio || prev.bio,
        photo_url: d.photo_url || prev.photo_url,
        linkedin_url: d.linkedin_url || prev.linkedin_url,
      }));
      toast.success("Profile auto-filled from LinkedIn!");
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : "AI import failed");
    } finally {
      setAiLoading(false);
    }
  };

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

      const { error } = await supabase.storage
        .from("expert-photos")
        .upload(path, file, { upsert: true });
      if (error) throw error;

      const { data: urlData } = supabase.storage
        .from("expert-photos")
        .getPublicUrl(path);
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
    if (!form.full_name.trim()) {
      toast.error("Full name is required.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        full_name: form.full_name.trim(),
        job_title: form.job_title.trim() || null,
        area_of_expertise: form.area_of_expertise.trim() || null,
        headshot: form.headshot.trim() || null,
        bio: form.bio.trim() || null,
        industry: form.industry || null,
        is_alum: form.is_alum,
        linkedin_url: form.linkedin_url.trim() || null,
        email: form.email.trim() || null,
        photo_url: form.photo_url.trim() || null,
      };

      if (expertId) {
        const { error } = await supabase
          .from("expert_profiles")
          .update(payload)
          .eq("id", expertId);
        if (error) throw error;
      } else {
        if (!adminUserId) throw new Error("Missing user_id for new expert profile");
        const { error } = await supabase
          .from("expert_profiles")
          .insert({ ...payload, user_id: adminUserId });
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

  const canAutoFill = form.full_name.trim().length > 0 && form.linkedin_url.trim().length > 0;

  return (
    <div className="space-y-5">
      {/* Auto-fill from LinkedIn section */}
      <div className="p-4 bg-primary/5 border border-primary/20 rounded-lg space-y-3">
        <p className="text-sm font-medium text-foreground flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-primary" />
          Auto-fill from LinkedIn
        </p>
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label>Full Name *</Label>
            <Input
              value={form.full_name}
              onChange={(e) => set("full_name", e.target.value)}
              placeholder="Jane Smith"
            />
          </div>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Globe className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="https://linkedin.com/in/username"
                value={form.linkedin_url}
                onChange={(e) => set("linkedin_url", e.target.value)}
                className="pl-9"
              />
            </div>
            <Button
              variant="outline"
              onClick={handleAIPopulate}
              disabled={aiLoading || !canAutoFill}
            >
              {aiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />}
              Auto-fill
            </Button>
          </div>
        </div>
      </div>

      <Separator />

      {/* Manual fields */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="space-y-1.5">
          <Label>Current Role / Title</Label>
          <Input value={form.job_title} onChange={(e) => set("job_title", e.target.value)} placeholder="VP of Marketing" />
        </div>
        <div className="space-y-1.5">
          <Label>Area of Expertise</Label>
          <Input value={form.area_of_expertise} onChange={(e) => set("area_of_expertise", e.target.value)} placeholder="Brand Development, Marketing" />
        </div>
        <div className="space-y-1.5">
          <Label>Email</Label>
          <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} placeholder="jane@example.com" />
        </div>
        <div className="space-y-1.5">
          <Label>Industry</Label>
          <Select value={form.industry} onValueChange={(v) => set("industry", v)}>
            <SelectTrigger>
              <SelectValue placeholder="Select industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRY_OPTIONS.map((ind) => (
                <SelectItem key={ind} value={ind}>{ind}</SelectItem>
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
            {form.photo_url ? (
              <AvatarImage src={form.photo_url} alt="Profile photo" />
            ) : null}
            <AvatarFallback className="text-lg">
              {form.full_name ? form.full_name.charAt(0).toUpperCase() : "?"}
            </AvatarFallback>
          </Avatar>
          <div className="flex gap-2">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handlePhotoUpload}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => fileInputRef.current?.click()}
              disabled={uploadingPhoto}
            >
              {uploadingPhoto ? (
                <Loader2 className="h-4 w-4 animate-spin mr-1" />
              ) : (
                <Upload className="h-4 w-4 mr-1" />
              )}
              {uploadingPhoto ? "Uploading..." : "Upload Photo"}
            </Button>
            {form.photo_url && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={handleRemovePhoto}
              >
                <X className="h-4 w-4 mr-1" />
                Remove
              </Button>
            )}
          </div>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label>Headshot</Label>
        <Textarea
          value={form.headshot}
          onChange={(e) => set("headshot", e.target.value)}
          placeholder="Add headshot details (for example: profile image notes, source links, preferred crop/style)..."
          rows={3}
        />
      </div>

      <div className="space-y-1.5">
        <Label>Bio</Label>
        <Textarea
          value={form.bio}
          onChange={(e) => set("bio", e.target.value)}
          placeholder="A brief professional bio..."
          rows={4}
        />
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id="is_alum"
          checked={form.is_alum}
          onCheckedChange={(checked) => set("is_alum", !!checked)}
        />
        <Label htmlFor="is_alum" className="cursor-pointer flex items-center gap-1.5">
          <img src={usLogo} alt="US Ski & Snowboard" className="h-4 w-4 object-contain" />
          US Ski &amp; Snowboard Alum
        </Label>
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
