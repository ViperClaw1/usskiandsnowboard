import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import { toast } from "sonner";
import { Loader2, Upload, X, Instagram, Phone, Image } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { SKILLS_OPTIONS, CAREER_INTERESTS_OPTIONS, SPONSORS_OPTIONS, SPORT_DISCIPLINE_GROUPS } from "@/data/suggestions";
import usBgMountain from "@/assets/us-background-mountain.png";

interface ProfileFormProps {
  userId: string;
  onComplete: () => void;
}

const AVAILABILITY = [
  "Available Now",
  "Off-Season Only",
  "Post-Retirement",
  "Part-Time",
  "Flexible"
];

const formatPhone = (digits: string): string => {
  const d = digits.replace(/\D/g, '').slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 1) return `+${d}`;
  if (d.length <= 4) return `+${d[0]} (${d.slice(1)}`;
  if (d.length <= 7) return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4)}`;
  if (d.length <= 9) return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  return `+${d[0]} (${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7, 9)}-${d.slice(9)}`;
};

const unformatPhone = (value: string): string => value.replace(/\D/g, '');

const validatePhone = (digits: string): string => {
  if (digits.length === 0) return 'Phone number is required';
  if (digits.length !== 11) return 'Please enter a valid US phone number';
  return '';
};

const ProfileForm = ({ userId, onComplete }: ProfileFormProps) => {
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadingBg, setUploadingBg] = useState(false);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>("");
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [phoneError, setPhoneError] = useState("");
  const [formData, setFormData] = useState({
    first_name: "",
    last_name: "",
    email: "",
    phone: "",
    sport_discipline: [] as string[],
    home_mountain: "",
    bio: "",
    career_interests: "",
    skills: "",
    geographic_preferences: "",
    availability: "",
    professional_highlights: "",
    years_of_membership: "",
    instagram_url: "",
    sponsors: "",
    is_public: true
  });

  useEffect(() => {
    loadExistingProfile();
  }, [userId]);

  const loadExistingProfile = async () => {
    try {
      const { data: athleteData, error: athleteError } = await supabase
        .from("athlete_profiles")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (athleteError) throw athleteError;

      const { data: profileData, error: profileError } = await supabase
        .from("profiles")
        .select("first_name, last_name, email")
        .eq("id", userId)
        .single();

      if (profileError) throw profileError;

      if (athleteData) {
        setFormData({
          first_name: profileData?.first_name || "",
          last_name: profileData?.last_name || "",
          email: athleteData.email || profileData?.email || "",
          phone: athleteData.phone ? formatPhone(unformatPhone(athleteData.phone)) : "",
          sport_discipline: Array.isArray(athleteData.sport_discipline)
            ? athleteData.sport_discipline
            : (athleteData.sport_discipline ? [athleteData.sport_discipline] : []) as string[],
          home_mountain: athleteData.home_mountain || "",
          bio: athleteData.bio || "",
          career_interests: athleteData.career_interests?.join(", ") || "",
          skills: athleteData.skills?.join(", ") || "",
          geographic_preferences: athleteData.geographic_preferences?.join(", ") || "",
          availability: athleteData.availability || "",
          professional_highlights: athleteData.professional_highlights || "",
          years_of_membership: athleteData.years_of_membership?.toString() || "",
          instagram_url: athleteData.instagram_url || "",
          sponsors: athleteData.sponsors?.join(", ") || "",
          is_public: athleteData.is_public ?? true
        });
        setPhotoUrl(athleteData.photo_url || "");
        const bgUrl = (athleteData as any).background_image_url || "";
        setBackgroundImageUrl(bgUrl);
        setBackgroundImagePreview(bgUrl);
      } else if (profileData) {
        setFormData(prev => ({
          ...prev,
          first_name: profileData.first_name || "",
          last_name: profileData.last_name || "",
          email: profileData.email || "",
          phone: ""
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

  const handleBackgroundChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 10 * 1024 * 1024) {
        toast.error("Background image must be less than 10MB");
        return;
      }
      setBackgroundImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setBackgroundImagePreview(reader.result as string);
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

      try {
        const { data: files } = await supabase.storage
          .from('athlete-photos')
          .list(userId);
        
        if (files && files.length > 0) {
          const profileFiles = files.filter(f => f.name.startsWith('profile-'));
          if (profileFiles.length > 0) {
            const filesToDelete = profileFiles.map(file => `${userId}/${file.name}`);
            await supabase.storage.from('athlete-photos').remove(filesToDelete);
          }
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

      return `${data.publicUrl}?v=${timestamp}`;
    } catch (error: any) {
      console.error("Error uploading photo:", error);
      toast.error("Failed to upload photo");
      return null;
    } finally {
      setUploading(false);
    }
  };

  const uploadBackgroundImage = async (): Promise<string | null> => {
    if (!backgroundImageFile) return backgroundImageUrl || null;

    setUploadingBg(true);
    try {
      const fileExt = backgroundImageFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${userId}/bg-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('athlete-photos')
        .upload(fileName, backgroundImageFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('athlete-photos')
        .getPublicUrl(fileName);

      return `${data.publicUrl}?v=${timestamp}`;
    } catch (error: any) {
      console.error("Error uploading background:", error);
      toast.error("Failed to upload background image");
      return null;
    } finally {
      setUploadingBg(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const [uploadedPhotoUrl, uploadedBgUrl] = await Promise.all([
        uploadPhoto(),
        uploadBackgroundImage(),
      ]);

      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: formData.first_name,
          last_name: formData.last_name
        })
        .eq("id", userId);

      if (profileError) throw profileError;

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
      
      const sponsors = formData.sponsors
        .split(",")
        .map(s => s.trim())
        .filter(s => s);

      let completeness = 0;
      if (formData.first_name && formData.last_name) completeness += 20;
      if (formData.sport_discipline) completeness += 20;
      if (formData.bio) completeness += 20;
      if (career_interests.length > 0) completeness += 10;
      if (skills.length > 0) completeness += 10;
      if (formData.availability) completeness += 10;
      if (uploadedPhotoUrl || photoUrl) completeness += 10;

      const profileData = {
        email: formData.email,
        phone: unformatPhone(formData.phone).length === 11 ? `+${unformatPhone(formData.phone)}` : formData.phone,
        sport_discipline: formData.sport_discipline,
        home_mountain: formData.home_mountain || null,
        bio: formData.bio,
        career_interests,
        skills,
        geographic_preferences,
        availability: formData.availability,
        professional_highlights: formData.professional_highlights || null,
        years_of_membership: formData.years_of_membership ? parseInt(formData.years_of_membership) : null,
        instagram_url: formData.instagram_url || null,
        sponsors,
        is_public: formData.is_public,
        photo_url: uploadedPhotoUrl ? uploadedPhotoUrl.split('?')[0] : (photoUrl ? photoUrl.split('?')[0] : null),
        background_image_url: uploadedBgUrl ? uploadedBgUrl.split('?')[0] : (backgroundImageUrl ? backgroundImageUrl.split('?')[0] : null),
        profile_completeness: completeness
      };

      const { data: existingProfile } = await supabase
        .from("athlete_profiles")
        .select("id")
        .eq("user_id", userId)
        .maybeSingle();

      if (existingProfile) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase
          .from("athlete_profiles")
          .update(profileData as any)
          .eq("user_id", userId);

        if (error) throw error;
      } else {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { error } = await supabase
          .from("athlete_profiles")
          .insert({
            user_id: userId,
            ...profileData
          } as any);

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
      {/* Background Image */}
      <div className="space-y-2">
        <Label>Background Image</Label>
        <div className="space-y-2">
          {backgroundImagePreview ? (
            <div className="relative w-full">
              <img
                src={backgroundImagePreview}
                alt="Background"
                className="w-full h-32 object-cover rounded-lg border"
              />
              <Button
                type="button"
                variant="destructive"
                size="icon"
                className="absolute top-2 right-2 h-7 w-7"
                onClick={() => {
                  setBackgroundImageUrl("");
                  setBackgroundImageFile(null);
                  setBackgroundImagePreview("");
                }}
              >
                <X className="h-3.5 w-3.5" />
              </Button>
              <div className="absolute bottom-2 left-2">
                <Label
                  htmlFor="bg-upload"
                  className="cursor-pointer inline-flex items-center gap-1.5 text-xs bg-background/80 hover:bg-background px-2 py-1 rounded border shadow-sm"
                >
                  <Image className="h-3 w-3" />
                  Change
                </Label>
              </div>
            </div>
          ) : (
            <Label
              htmlFor="bg-upload"
              className="cursor-pointer flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors gap-2 text-muted-foreground"
            >
              <Image className="h-6 w-6" />
              <span className="text-sm">Upload background image</span>
              <span className="text-xs">Wide photo recommended (max 10MB)</span>
            </Label>
          )}
          <Input
            id="bg-upload"
            type="file"
            accept="image/*"
            onChange={handleBackgroundChange}
            className="hidden"
          />
          {!backgroundImagePreview && (
            <p className="text-xs text-muted-foreground">
              If left empty, a default mountain image will be used.
            </p>
          )}
        </div>
      </div>

      {/* Profile Photo */}
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
        <Label htmlFor="email">Email Address *</Label>
        <Input
          id="email"
          type="email"
          placeholder="your.email@example.com"
          value={formData.email}
          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
          required
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="phone">Phone Number *</Label>
        <div className="relative">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="phone"
            type="tel"
            placeholder="+1 (___) ___-__-__"
            value={formData.phone}
            onChange={(e) => {
              const digits = unformatPhone(e.target.value);
              const formatted = formatPhone(digits);
              setFormData({ ...formData, phone: formatted });
              if (phoneTouched) {
                setPhoneError(validatePhone(digits));
              }
            }}
            onBlur={() => {
              setPhoneTouched(true);
              setPhoneError(validatePhone(unformatPhone(formData.phone)));
            }}
            className={`pl-10 ${phoneTouched && phoneError ? 'border-destructive' : ''}`}
            required
          />
        </div>
        {phoneTouched && phoneError && (
          <p className="text-sm text-destructive">{phoneError}</p>
        )}
        <p className="text-xs text-muted-foreground">
          Used for account recovery and optional SMS notifications (private, not displayed publicly)
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="sport">Sport Discipline *</Label>
        <MultiSelect
          groups={SPORT_DISCIPLINE_GROUPS}
          selected={Array.isArray(formData.sport_discipline) ? formData.sport_discipline : (formData.sport_discipline ? [formData.sport_discipline as unknown as string] : [])}
          onChange={(values) => setFormData({ ...formData, sport_discipline: values })}
          placeholder="Select sport disciplines..."
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="home_mountain">Home Mountain</Label>
        <Input
          id="home_mountain"
          placeholder="e.g., Park City, Aspen, Whistler"
          value={formData.home_mountain}
          onChange={(e) => setFormData({ ...formData, home_mountain: e.target.value })}
        />
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
        <Label htmlFor="years_of_membership">Years of Team Membership</Label>
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
        <Label htmlFor="instagram_url">Instagram</Label>
        <div className="relative">
          <Instagram className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            id="instagram_url"
            type="url"
            placeholder="https://instagram.com/yourusername"
            value={formData.instagram_url}
            onChange={(e) => setFormData({ ...formData, instagram_url: e.target.value })}
            className="pl-10"
          />
        </div>
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
        <Label htmlFor="sponsors">Sponsors</Label>
        <MultiSelect
          options={SPONSORS_OPTIONS}
          selected={formData.sponsors ? formData.sponsors.split(", ").filter(Boolean) : []}
          onChange={(values) => setFormData({ ...formData, sponsors: values.join(", ") })}
          placeholder="Select sponsors..."
        />
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
          Make my profile publicly visible
        </Label>
      </div>

      <Button type="submit" className="w-full" disabled={loading || uploading || uploadingBg}>
        {loading || uploading || uploadingBg ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            {uploading ? "Uploading photo..." : uploadingBg ? "Uploading background..." : "Saving..."}
          </>
        ) : (
          "Save Profile"
        )}
      </Button>
    </form>
  );
};

export default ProfileForm;
