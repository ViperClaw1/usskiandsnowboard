import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

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
  const [formData, setFormData] = useState({
    sport_discipline: "",
    bio: "",
    career_interests: "",
    skills: "",
    geographic_preferences: "",
    availability: "",
    is_public: true
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
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
          .update({
            sport_discipline: formData.sport_discipline,
            bio: formData.bio,
            career_interests,
            skills,
            geographic_preferences,
            availability: formData.availability,
            is_public: formData.is_public,
            profile_completeness: 60 // Basic completion
          })
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // Create new profile
        const { error } = await supabase
          .from("athlete_profiles")
          .insert({
            user_id: userId,
            sport_discipline: formData.sport_discipline,
            bio: formData.bio,
            career_interests,
            skills,
            geographic_preferences,
            availability: formData.availability,
            is_public: formData.is_public,
            profile_completeness: 60
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
          Make my profile visible to employers
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={loading}>
        {loading ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </form>
  );
};

export default ProfileForm;
