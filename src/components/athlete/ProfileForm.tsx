import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2, Upload, X } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

interface ProfileFormProps {
  userId: string;
  onComplete: () => void;
}

const SPORTS = [
  "Alpine Skiing",
  "Cross Country",
  "Freestyle Skiing",
  "Snowboarding",
  "Ski Jumping",
  "Nordic Combined",
  "Freeskiing"
];

const AVAILABILITY = [
  "Available Now",
  "Off-Season Only",
  "Post-Retirement",
  "Part-Time",
  "Flexible"
];

const ProfileForm = ({ userId, onComplete }: ProfileFormProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    sport_discipline: "",
    bio: "",
    career_interests: "",
    skills: "",
    geographic_preferences: "",
    availability: "",
    professional_highlights: "",
    years_of_membership: "",
    is_public: true
  });

  useEffect(() => {
    loadExistingProfile();
  }, [userId]);

  const loadExistingProfile = async () => {
    try {
      // Load athlete profile
      const { data: athleteData, error: athleteError } = await supabase
        .from("athlete_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (athleteError) throw athleteError;

      // Load user profile (name)
      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      if (athleteData) {
        setFormData({
          first_name: profileData?.first_name || "",
          last_name: profileData?.last_name || "",
          sport_discipline: athleteData.sport_discipline || "",
          bio: athleteData.bio || "",
          career_interests: athleteData.career_interests?.join(", ") || "",
          skills: athleteData.skills?.join(", ") || "",
          geographic_preferences: athleteData.geographic_preferences?.join(", ") || "",
          availability: athleteData.availability || "",
          professional_highlights: athleteData.professional_highlights || "",
          years_of_membership: athleteData.years_of_membership?.toString() || "",
          is_public: athleteData.is_public ?? true
        });
        setPhotoUrl(athleteData.photo_url || "");
      } else if (profileData) {
        setFormData(prev => ({
          ...prev,
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || ""
        }));
      }
    } catch (error: any) {
      console.error("Error loading profile:", error);
    }
  };

  const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error("Photo must be less than 5MB");
        return;
      }
      setPhotoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setPhotoUrl(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const uploadPhoto = async (): Promise<string | null> => {
    if (!photoFile) return photoUrl;

    setUploading(true);
    try {
      const fileExt = photoFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${userId}/profile-${timestamp}.${fileExt}`;

      // Delete old photos in user folder
      try {
        const { data: files } = await supabase.storage
          .from('athlete-photos')
          .list(userId);
        
        if (files && files.length > 0) {
          const filesToDelete = files.map(file => `${userId}/${file.name}`);
          await supabase.storage.from('athlete-photos').remove(filesToDelete);
        }
      } catch (error) {
        console.error("Error deleting old photos:", error);
      }

      const { error: uploadError } = await supabase.storage
        .from('athlete-photos')
        .upload(fileName, photoFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('athlete-photos')
        .getPublicUrl(fileName);

      // Cache-bust in UI
      return `${data.publicUrl}?v=${timestamp}`;
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      // Upload photo if there's a new one
      const uploadedPhotoUrl = await uploadPhoto();

      // Update user profile (name)
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name
        })
        .eq("id", userId);

      if (profileError) throw profileError;

      // Convert comma-separated strings to arrays
      const career_interests = formData.career_interests
        .split(",")
        .map(s => s.trim())
        .filter(s => s);
      
      const skills = formData.skills
        .split(",")
        .map(s => s.trim())
        .filter(s => s);
      
      const geographic_preferences = formData.geographic_preferences
        .split(",")
        .map(s => s.trim())
        .filter(s => s);

      // Calculate profile completeness dynamically
      let completeness = 0;
      if (formData.first_name && formData.last_name) completeness += 20;
      if (formData.sport_discipline) completeness += 20;
      if (formData.bio) completeness += 20;
      if (career_interests.length > 0) completeness += 10;
      if (skills.length > 0) completeness += 10;
      if (formData.availability) completeness += 10;
      if (uploadedPhotoUrl || photoUrl) completeness += 10;

      const profileData = {
        sport_discipline: formData.sport_discipline,
        bio: formData.bio,
        career_interests,
        skills,
        geographic_preferences,
        availability: formData.availability,
        professional_highlights: formData.professional_highlights || null,
        years_of_membership: formData.years_of_membership ? parseInt(formData.years_of_membership) : null,
        is_public: formData.is_public,
        photo_url: uploadedPhotoUrl ? uploadedPhotoUrl.split('?')[0] : (photoUrl ? photoUrl.split('?')[0] : null),
        profile_completeness: completeness
      };

      // Check if profile exists
      const { data: existingProfile } = await supabase
        .from("athlete_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingProfile) {
        // Update existing profile
        const { error } = await supabase
          .from("athlete_profiles")
          .update(profileData)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from("athlete_profiles")
          .insert({
            user_id: userId,
            ...profileData
          });

        if (error) throw error;
      }

      toast.success("Profile saved successfully!");
      onComplete();
    } catch (error: any) {
      console.error("Error saving profile:", error);
      toast.error(error.message || "Failed to save profile");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="first_name">First Name *</Label>
          <Input
            id="first_name"
            placeholder="First name"
            value={formData.first_name}
            onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="last_name">Last Name *</Label>
          <Input
            id="last_name"
            placeholder="Last name"
            value={formData.last_name}
            onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
            required
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Profile Photo</Label>
        <div className="flex items-center gap-4">
          <Avatar className="h-20 w-20">
            <AvatarImage src={photoUrl} />
            <AvatarFallback>
              <Upload className="h-8 w-8 text-muted-foreground" />
            </AvatarFallback>
          </Avatar>
          <div className="flex-1">
            <Input
              type="file"
              accept="image/*"
              onChange={handlePhotoChange}
              className="cursor-pointer"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Max size: 5MB. JPG, PNG, or WEBP
            </p>
          </div>
          {photoUrl && (
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => {
                setPhotoUrl("");
                setPhotoFile(null);
              }}
            >
              <X className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sport">Sport Discipline *</Label>
        <Select
          value={formData.sport_discipline}
          onValueChange={(value) => setFormData({ ...formData, sport_discipline: value })}
          required
        >
          <SelectTrigger id="sport">
            <SelectValue placeholder="Select your sport" />
          </SelectTrigger>
          <SelectContent>
            {SPORTS.map((sport) => (
              <SelectItem key={sport} value={sport}>
                {sport}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-2">
        <Label htmlFor="bio">Bio *</Label>
        <Textarea
          id="bio"
          placeholder="Tell us about your athletic career and achievements..."
          value={formData.bio}
          onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
          required
          rows={4}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {formData.bio.length}/500 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="professional_highlights">Professional Highlights</Label>
        <Textarea
          id="professional_highlights"
          placeholder="Notable achievements, awards, championships, or career milestones..."
          value={formData.professional_highlights}
          onChange={(e) => setFormData({ ...formData, professional_highlights: e.target.value })}
          rows={3}
          maxLength={500}
        />
        <p className="text-xs text-muted-foreground">
          {formData.professional_highlights.length}/500 characters
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="years_of_membership">Years of U.S. Ski & Snowboard Membership</Label>
        <Input
          id="years_of_membership"
          type="number"
          min="0"
          max="100"
          placeholder="e.g., 5"
          value={formData.years_of_membership}
          onChange={(e) => setFormData({ ...formData, years_of_membership: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="interests">Career Interests *</Label>
        <Input
          id="interests"
          placeholder="e.g., Marketing, Finance, Outdoor Recreation"
          value={formData.career_interests}
          onChange={(e) => setFormData({ ...formData, career_interests: e.target.value })}
          required
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple interests with commas
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="skills">Skills *</Label>
        <Input
          id="skills"
          placeholder="e.g., Public Speaking, Excel, Leadership"
          value={formData.skills}
          onChange={(e) => setFormData({ ...formData, skills: e.target.value })}
          required
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple skills with commas
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="location">Geographic Preferences</Label>
        <Input
          id="location"
          placeholder="e.g., Denver, Salt Lake City, Remote"
          value={formData.geographic_preferences}
          onChange={(e) => setFormData({ ...formData, geographic_preferences: e.target.value })}
        />
        <p className="text-xs text-muted-foreground">
          Separate multiple locations with commas
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="availability">Availability *</Label>
        <Select
          value={formData.availability}
          onValueChange={(value) => setFormData({ ...formData, availability: value })}
          required
        >
          <SelectTrigger id="availability">
            <SelectValue placeholder="Select your availability" />
          </SelectTrigger>
          <SelectContent>
            {AVAILABILITY.map((option) => (
              <SelectItem key={option} value={option}>
                {option}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="flex items-center gap-2">
        <input
          type="checkbox"
          id="public"
          checked={formData.is_public}
          onChange={(e) => setFormData({ ...formData, is_public: e.target.checked })}
          className="h-4 w-4 rounded border-input"
        />
        <Label htmlFor="public" className="cursor-pointer">
          Make my profile visible to partners
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={loading || uploading}>
        {loading || uploading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploading ? "Uploading photo..." : "Saving..."}
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </form>
  );
};

export default ProfileForm;
