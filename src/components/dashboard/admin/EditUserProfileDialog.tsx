import { useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, Upload } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import { MultiSelect } from "@/components/ui/multi-select";
import { INDUSTRY_OPTIONS } from "@/data/suggestions";

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
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [bio, setBio] = useState<string>("");
  const [title, setTitle] = useState<string>("");
  const [companyName, setCompanyName] = useState<string>("");
  const [industry, setIndustry] = useState<string[]>([]);
  const [profileId, setProfileId] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    (async () => {
      setLoading(true);
      setTitle("");
      setCompanyName("");
      setIndustry([]);
      let data: any = null;
      let error: any = null;
      if (role === "expert") {
        const result = await supabase
          .from("expert_profiles")
          .select("id, photo_url, bio, job_title, company_name, industry")
          .eq("user_id", userId)
          .maybeSingle();
        data = result.data;
        error = result.error;
      } else {
        const result = await supabase
          .from("athlete_profiles")
          .select("id, photo_url, bio")
          .eq("user_id", userId)
          .maybeSingle();
        data = result.data;
        error = result.error;
      }
      if (cancelled) return;
      if (error) {
        toast.error(`Failed to load profile: ${error.message}`);
      } else if (data) {
        setProfileId(data.id);
        setPhotoUrl(data.photo_url ?? "");
        setBio(data.bio ?? "");
        if (role === "expert") {
          setTitle(data.job_title ?? "");
          setCompanyName(data.company_name ?? "");
          const ind = data.industry;
          setIndustry(
            Array.isArray(ind)
              ? ind
              : typeof ind === "string" && ind.trim()
                ? ind.split(",").map((s: string) => s.trim()).filter(Boolean)
                : []
          );
        }
      } else {
        setProfileId(null);
        setPhotoUrl("");
        setBio("");
        toast.error("No profile exists yet for this user.");
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, [open, userId, role]);

  const handleUpload = async (file: File) => {
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
      setPhotoUrl(data.publicUrl);
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
    const payload: Record<string, any> = {
      photo_url: photoUrl || null,
      bio: bio || null,
    };
    if (role === "expert") {
      payload.job_title = title || null;
      payload.company_name = companyName || null;
    }
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
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Edit {role === "athlete" ? "Athlete" : "Expert"} Profile</DialogTitle>
          <DialogDescription>
            Update {userName || "this user"}'s profile picture{role === "expert" ? ", title, and description" : " and description"}.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
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
                    if (f) handleUpload(f);
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
              <>
                <div className="space-y-2">
                  <Label htmlFor="admin-edit-title">Title</Label>
                  <Input
                    id="admin-edit-title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Marketing Specialist"
                    disabled={!profileId}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="admin-edit-company">Company Name</Label>
                  <Input
                    id="admin-edit-company"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    placeholder="e.g. Acme Corp"
                    disabled={!profileId}
                  />
                </div>
              </>
            )}

            <div className="space-y-2">
              <Label htmlFor="admin-edit-bio">Description / Bio</Label>
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
