import { useState, useEffect, useMemo } from "react";
import { useForm } from "react-hook-form";
import { User } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { OnboardingLayout } from "@/components/onboarding/OnboardingLayout";
import { OnboardingStep } from "@/components/onboarding/OnboardingStep";
import { StepNavigation } from "@/components/onboarding/StepNavigation";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { MultiSelect } from "@/components/ui/multi-select";
import PhotoUploader from "./PhotoUploader";
import { Sparkles, Upload, X } from "lucide-react";
import { CAREER_INTERESTS_OPTIONS, SKILLS_OPTIONS, SPONSORS_OPTIONS, SPORT_DISCIPLINE_GROUPS } from "@/data/suggestions";

interface AthleteOnboardingWizardProps {
  user: User;
  onComplete: () => void;
}

interface FormData {
  firstName: string;
  lastName: string;
  email: string;
  affiliation: string;
  sport: string[];
  homeMountain: string;
  bio: string;
  careerInterests: string[];
  skills: string[];
  availability: string;
  instagram: string;
  yearsOfMembership: string;
  sponsors: string;
  photoUrl: string;
  galleryPhotos: string[];
}

const TOTAL_STEPS = 16;

export const AthleteOnboardingWizard = ({ user, onComplete }: AthleteOnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [photoUrl, setPhotoUrl] = useState<string>("");
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>("");
  const [galleryPhotos, setGalleryPhotos] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);

  const { register, watch, setValue, handleSubmit, formState: { errors } } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      firstName: "",
      lastName: "",
      email: user.email || "",
      affiliation: "",
      sport: "",
      homeMountain: "",
      bio: "",
      careerInterests: [],
      skills: [],
      availability: "",
      instagram: "",
      yearsOfMembership: "",
      sponsors: "",
      photoUrl: "",
      galleryPhotos: [],
    },
  });

  const formValues = watch();

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`athlete_onboarding_${user.id}`);
    if (draft) {
      const parsed = JSON.parse(draft);
      Object.keys(parsed.formData).forEach((key) => {
        setValue(key as keyof FormData, parsed.formData[key]);
      });
      if (parsed.photoUrl) setPhotoUrl(parsed.photoUrl);
      if (parsed.backgroundImageUrl) setBackgroundImageUrl(parsed.backgroundImageUrl);
      if (parsed.galleryPhotos) setGalleryPhotos(parsed.galleryPhotos);
      if (parsed.currentStep) setCurrentStep(parsed.currentStep);
    }
  }, [user.id, setValue]);

  // Auto-save draft
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(
        `athlete_onboarding_${user.id}`,
        JSON.stringify({
          currentStep,
          formData: formValues,
          photoUrl,
          backgroundImageUrl,
          galleryPhotos,
          lastSaved: Date.now(),
        })
      );
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formValues, currentStep, photoUrl, backgroundImageUrl, galleryPhotos, user.id]);

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 0: return true; // Welcome
      case 1: return true; // Photo (optional)
      case 2: return true; // Background image (optional)
      case 3: return formValues.firstName.trim().length > 0;
      case 4: return formValues.lastName.trim().length > 0;
      case 5: return formValues.email.trim().length > 0 && formValues.email.includes("@");
      case 6: return formValues.affiliation.trim().length > 0;
      case 7: return formValues.sport.trim().length > 0;
      case 8: return true; // Home mountain (optional)
      case 9: return formValues.bio.trim().length > 0;
      case 10: return formValues.careerInterests.length > 0;
      case 11: return formValues.skills.length > 0;
      case 12: return formValues.availability.trim().length > 0;
      case 13: return true; // Optional
      case 14: return true; // Review
      default: return false;
    }
  }, [currentStep, formValues]);

  const nextStep = () => {
    if (currentStep < TOTAL_STEPS - 1) {
      setCurrentStep(currentStep + 1);
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const skipStep = () => {
    nextStep();
  };

  const handleBackgroundUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploadingBg(true);
    try {
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const filePath = `${user.id}/bg-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("athlete-photos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("athlete-photos")
        .getPublicUrl(filePath);

      setBackgroundImageUrl(data.publicUrl);
      toast({ title: "Background image uploaded!" });
    } catch (error: any) {
      toast({
        title: "Error uploading background",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploadingBg(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      // Update profiles table
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
        })
        .eq("id", user.id);

      if (profileError) throw profileError;

      // Prepare athlete profile data
      const careerInterestsArray = data.careerInterests.filter(Boolean);
      const skillsArray = data.skills.filter(Boolean);
      const sponsorsArray = data.sponsors
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);

      const athleteData = {
        user_id: user.id,
        affiliation: data.affiliation,
        sport_discipline: Array.isArray(data.sport) ? data.sport : (data.sport ? [data.sport] : []),
        home_mountain: data.homeMountain || null,
        bio: data.bio,
        career_interests: careerInterestsArray,
        skills: skillsArray,
        availability: data.availability,
        instagram_url: data.instagram || null,
        years_of_membership: data.yearsOfMembership ? parseInt(data.yearsOfMembership) : null,
        sponsors: sponsorsArray.length > 0 ? sponsorsArray : null,
        photo_url: photoUrl || null,
        background_image_url: backgroundImageUrl || null,
        hero_image_url: galleryPhotos.length > 0 ? galleryPhotos[0] : null,
        gallery_images: galleryPhotos.length > 1 ? galleryPhotos.slice(1) : null,
        email: data.email,
        is_public: true,
      };

      // Calculate completeness
      const fields = Object.values(athleteData).filter(v => v !== null && v !== undefined && v !== "");
      const completeness = Math.round((fields.length / Object.keys(athleteData).length) * 100);

      const { error: athleteError } = await supabase
        .from("athlete_profiles")
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .upsert({ ...athleteData, profile_completeness: completeness } as any);

      if (athleteError) throw athleteError;

      localStorage.removeItem(`athlete_onboarding_${user.id}`);

      toast({
        title: "Profile completed!",
        description: "Your athlete profile is now live.",
      });

      onComplete();
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <OnboardingStep
            title="Welcome to Your Next Chapter!"
            description="You've achieved excellence on snow—now let's showcase the skills and drive that will power your career beyond competition."
          >
            <div className="flex justify-center">
              <Button size="lg" onClick={nextStep} className="h-14 px-12 text-lg">
                <Sparkles className="mr-2 h-5 w-5" />
                Get Started
              </Button>
            </div>
          </OnboardingStep>
        );

      case 1:
        return (
          <OnboardingStep
            title="Let's start with a great photo"
            description="Upload a professional photo of yourself"
            optional
          >
            <div className="flex flex-col items-center gap-4">
              {photoUrl && (
                <img
                  src={photoUrl}
                  alt="Profile"
                  className="w-32 h-32 object-cover rounded-full border-2"
                />
              )}
              <Label
                htmlFor="photo-upload"
                className="cursor-pointer inline-flex items-center justify-center gap-2 h-14 px-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-lg"
              >
                <Upload className="h-5 w-5" />
                {photoUrl ? "Change Photo" : "Upload Photo"}
              </Label>
              <Input
                id="photo-upload"
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;

                  try {
                    const fileExt = file.name.split(".").pop();
                    const fileName = `${user.id}-${Date.now()}.${fileExt}`;
                    const filePath = `${user.id}/profile/${fileName}`;

                    const { error: uploadError } = await supabase.storage
                      .from("athlete-photos")
                      .upload(filePath, file, { upsert: true });

                    if (uploadError) throw uploadError;

                    const { data } = supabase.storage
                      .from("athlete-photos")
                      .getPublicUrl(filePath);

                    setPhotoUrl(data.publicUrl);
                    toast({ title: "Photo uploaded successfully!" });
                  } catch (error: any) {
                    toast({
                      title: "Error uploading photo",
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                }}
                className="hidden"
              />
            </div>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={true}
              onBack={prevStep}
              onNext={nextStep}
              onSkip={skipStep}
            />
          </OnboardingStep>
        );

      case 2:
        return (
          <OnboardingStep
            title="Add a background image"
            description="Upload a banner image for your profile (mountains, action shots, etc.)"
            optional
          >
            <div className="flex flex-col items-center gap-4">
              {backgroundImageUrl ? (
                <div className="relative w-full">
                  <img
                    src={backgroundImageUrl}
                    alt="Background"
                    className="w-full h-32 object-cover rounded-lg border-2"
                  />
                  <button
                    type="button"
                    onClick={() => setBackgroundImageUrl("")}
                    className="absolute top-2 right-2 bg-destructive text-destructive-foreground rounded-full p-1 hover:bg-destructive/90"
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ) : null}
              <Label
                htmlFor="bg-upload"
                className="cursor-pointer inline-flex items-center justify-center gap-2 h-14 px-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-lg"
              >
                <Upload className="h-5 w-5" />
                {isUploadingBg ? "Uploading..." : backgroundImageUrl ? "Change Background" : "Upload Background"}
              </Label>
              <Input
                id="bg-upload"
                type="file"
                accept="image/*"
                onChange={handleBackgroundUpload}
                className="hidden"
                disabled={isUploadingBg}
              />
              <p className="text-sm text-muted-foreground">Recommended: wide landscape photo (16:9)</p>
            </div>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={true}
              onBack={prevStep}
              onNext={nextStep}
              onSkip={skipStep}
              isLoading={isUploadingBg}
            />
          </OnboardingStep>
        );

      case 3:
        return (
          <OnboardingStep title="What's your first name?">
            <Input
              {...register("firstName", { required: true })}
              placeholder="Enter your first name"
              className="h-14 text-lg px-4 border-2"
              autoFocus
            />
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={canGoNext}
              onBack={prevStep}
              onNext={nextStep}
            />
          </OnboardingStep>
        );

      case 4:
        return (
          <OnboardingStep title="And your last name?">
            <Input
              {...register("lastName", { required: true })}
              placeholder="Enter your last name"
              className="h-14 text-lg px-4 border-2"
              autoFocus
            />
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={canGoNext}
              onBack={prevStep}
              onNext={nextStep}
            />
          </OnboardingStep>
        );

      case 5:
        return (
          <OnboardingStep title="What's the best email to reach you?">
            <Input
              {...register("email", { required: true })}
              type="email"
              placeholder="your.email@example.com"
              className="h-14 text-lg px-4 border-2"
              autoFocus
            />
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={canGoNext}
              onBack={prevStep}
              onNext={nextStep}
            />
          </OnboardingStep>
        );

      case 6:
        return (
          <OnboardingStep title="What is your current affiliation with US Ski & Snowboard?">
            <Select value={formValues.affiliation} onValueChange={(value) => setValue("affiliation", value)}>
              <SelectTrigger className="h-14 text-lg border-2 bg-background">
                <SelectValue placeholder="Select your affiliation" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="Current Team Member">Current Team Member</SelectItem>
                <SelectItem value="Former Team Member">Former Team Member</SelectItem>
              </SelectContent>
            </Select>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={canGoNext}
              onBack={prevStep}
              onNext={nextStep}
            />
          </OnboardingStep>
        );

      case 7:
        return (
          <OnboardingStep title="What's your primary sport?">
            <Select value={formValues.sport} onValueChange={(value) => setValue("sport", value)}>
              <SelectTrigger className="h-14 text-lg border-2 bg-background">
                <SelectValue placeholder="Select your sport" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="Alpine Skiing">Alpine Skiing</SelectItem>
                <SelectItem value="Freestyle Skiing">Freestyle Skiing</SelectItem>
                <SelectItem value="Snowboarding">Snowboarding</SelectItem>
                <SelectItem value="Cross Country">Cross Country</SelectItem>
                <SelectItem value="Nordic Combined">Nordic Combined</SelectItem>
                <SelectItem value="Ski Jumping">Ski Jumping</SelectItem>
              </SelectContent>
            </Select>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={canGoNext}
              onBack={prevStep}
              onNext={nextStep}
            />
          </OnboardingStep>
        );

      case 8:
        return (
          <OnboardingStep
            title="What's your home mountain?"
            description="Where do you primarily train?"
            optional
          >
            <Input
              {...register("homeMountain")}
              placeholder="e.g., Park City, Aspen, Whistler"
              className="h-14 text-lg px-4 border-2"
              autoFocus
            />
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={true}
              onBack={prevStep}
              onNext={nextStep}
              onSkip={skipStep}
            />
          </OnboardingStep>
        );

      case 9:
        return (
          <OnboardingStep
            title="Tell us about yourself"
            description="Share your story, achievements, and what makes you unique"
          >
            <Textarea
              {...register("bio", { required: true })}
              placeholder="I'm a passionate athlete who..."
              className="min-h-32 text-lg px-4 py-3 border-2 resize-none"
              maxLength={500}
              autoFocus
            />
            <p className="text-sm text-muted-foreground mt-2">
              {formValues.bio.length}/500 characters
            </p>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={canGoNext}
              onBack={prevStep}
              onNext={nextStep}
            />
          </OnboardingStep>
        );

      case 10:
        return (
          <OnboardingStep
            title="What career areas interest you?"
            description="Start typing and select from suggestions, or add your own"
          >
            <MultiSelect
              options={CAREER_INTERESTS_OPTIONS}
              selected={formValues.careerInterests}
              onChange={(values) => setValue("careerInterests", values)}
              placeholder="Type to search career interests..."
              className="min-h-[56px]"
            />
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={canGoNext}
              onBack={prevStep}
              onNext={nextStep}
            />
          </OnboardingStep>
        );

      case 11:
        return (
          <OnboardingStep
            title="What are your top skills?"
            description="Start typing and select from suggestions, or add your own"
          >
            <MultiSelect
              options={SKILLS_OPTIONS}
              selected={formValues.skills}
              onChange={(values) => setValue("skills", values)}
              placeholder="Type to search skills..."
              className="min-h-[56px]"
            />
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={canGoNext}
              onBack={prevStep}
              onNext={nextStep}
            />
          </OnboardingStep>
        );

      case 12:
        return (
          <OnboardingStep title="When are you available?">
            <Select value={formValues.availability} onValueChange={(value) => setValue("availability", value)}>
              <SelectTrigger className="h-14 text-lg border-2 bg-background">
                <SelectValue placeholder="Select your availability" />
              </SelectTrigger>
              <SelectContent className="bg-background z-50">
                <SelectItem value="Available Now">Available Now</SelectItem>
                <SelectItem value="Off-Season">Off-Season Only</SelectItem>
                <SelectItem value="Post-Retirement">Post-Retirement</SelectItem>
                <SelectItem value="Flexible">Flexible</SelectItem>
              </SelectContent>
            </Select>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={canGoNext}
              onBack={prevStep}
              onNext={nextStep}
            />
          </OnboardingStep>
        );

      case 13:
        return (
          <OnboardingStep
            title="Add photos to your profile"
            description="Upload 5+ photos to showcase yourself (first becomes your hero image)"
            optional
          >
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                {galleryPhotos.map((url, index) => (
                  <div key={index} className="relative aspect-square rounded-lg overflow-hidden border-2">
                    <img src={url} alt={`Gallery ${index + 1}`} className="w-full h-full object-cover" />
                    {index === 0 && (
                      <div className="absolute top-2 left-2 bg-primary text-primary-foreground px-2 py-1 text-xs rounded">
                        Hero Image
                      </div>
                    )}
                    <button
                      onClick={() => setGalleryPhotos(galleryPhotos.filter((_, i) => i !== index))}
                      className="absolute top-2 right-2 bg-destructive text-destructive-foreground p-1 rounded-full hover:bg-destructive/90"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
                    </button>
                  </div>
                ))}
              </div>
              <Label
                htmlFor="gallery-upload"
                className="cursor-pointer inline-flex items-center justify-center gap-2 h-14 px-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-lg w-full"
              >
                <Upload className="h-5 w-5" />
                {galleryPhotos.length === 0 ? "Upload Photos" : `Add More Photos (${galleryPhotos.length} uploaded)`}
              </Label>
              <Input
                id="gallery-upload"
                type="file"
                accept="image/*"
                multiple
                onChange={async (e) => {
                  const files = Array.from(e.target.files || []);
                  if (files.length === 0) return;

                  try {
                    const uploadPromises = files.map(async (file) => {
                      const fileExt = file.name.split(".").pop();
                      const fileName = `${user.id}-gallery-${Date.now()}-${Math.random()}.${fileExt}`;
                      const filePath = `${user.id}/gallery/${fileName}`;

                      const { error: uploadError } = await supabase.storage
                        .from("athlete-photos")
                        .upload(filePath, file, { upsert: true });

                      if (uploadError) throw uploadError;

                      const { data } = supabase.storage
                        .from("athlete-photos")
                        .getPublicUrl(filePath);

                      return data.publicUrl;
                    });

                    const newUrls = await Promise.all(uploadPromises);
                    setGalleryPhotos([...galleryPhotos, ...newUrls]);
                    toast({ title: `${newUrls.length} photo(s) uploaded successfully!` });
                  } catch (error: any) {
                    toast({
                      title: "Error uploading photos",
                      description: error.message,
                      variant: "destructive",
                    });
                  }
                }}
                className="hidden"
              />
              {galleryPhotos.length > 0 && (
                <p className="text-sm text-muted-foreground text-center">
                  {galleryPhotos.length} photo{galleryPhotos.length !== 1 ? 's' : ''} uploaded. First photo is your hero image.
                </p>
              )}
            </div>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={true}
              onBack={prevStep}
              onNext={nextStep}
              onSkip={skipStep}
            />
          </OnboardingStep>
        );

      case 14:
        return (
          <OnboardingStep
            title="A few more details?"
            description="These are optional but help complete your profile"
            optional
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="instagram" className="text-base">Instagram URL</Label>
                <Input
                  id="instagram"
                  {...register("instagram")}
                  placeholder="https://instagram.com/yourusername"
                  className="h-12 text-base mt-1"
                />
              </div>
              <div>
                <Label htmlFor="years" className="text-base">Years of Team Membership</Label>
                <Input
                  id="years"
                  {...register("yearsOfMembership")}
                  type="number"
                  placeholder="5"
                  className="h-12 text-base mt-1"
                />
              </div>
              <div>
                <Label htmlFor="sponsors" className="text-base">Sponsors</Label>
                <MultiSelect
                  options={SPONSORS_OPTIONS}
                  selected={watch("sponsors") ? watch("sponsors").split(",").map((s: string) => s.trim()).filter(Boolean) : []}
                  onChange={(values) => setValue("sponsors", values.join(", "))}
                  placeholder="Select sponsors..."
                  className="mt-1"
                />
              </div>
            </div>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={true}
              onBack={prevStep}
              onNext={nextStep}
              onSkip={skipStep}
            />
          </OnboardingStep>
        );

      case 15:
        return (
          <OnboardingStep
            title="Review & Complete"
            description="Everything looks good? Let's complete your profile!"
          >
            <div className="space-y-4 text-left bg-muted/50 p-6 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Name</p>
                <p className="text-lg font-medium">{formValues.firstName} {formValues.lastName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Email</p>
                <p className="text-lg font-medium">{formValues.email}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Affiliation</p>
                <p className="text-lg font-medium">{formValues.affiliation}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Sport</p>
                <p className="text-lg font-medium">{formValues.sport}</p>
              </div>
              {formValues.homeMountain && (
                <div>
                  <p className="text-sm text-muted-foreground">Home Mountain</p>
                  <p className="text-lg font-medium">{formValues.homeMountain}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-muted-foreground">Bio</p>
                <p className="text-base">{formValues.bio}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Career Interests</p>
                <p className="text-base">{formValues.careerInterests.join(", ")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Skills</p>
                <p className="text-base">{formValues.skills.join(", ")}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Availability</p>
                <p className="text-base">{formValues.availability}</p>
              </div>
            </div>
            <StepNavigation
              currentStep={currentStep}
              totalSteps={TOTAL_STEPS}
              canGoBack={true}
              canGoNext={true}
              onBack={prevStep}
              onNext={handleSubmit(onSubmit)}
              isLoading={isSubmitting}
              nextLabel="Complete Profile"
            />
          </OnboardingStep>
        );

      default:
        return null;
    }
  };

  return (
    <OnboardingLayout
      currentStep={currentStep}
      totalSteps={TOTAL_STEPS}
      onNext={nextStep}
      onBack={prevStep}
      canGoNext={canGoNext}
    >
      {renderStep()}
    </OnboardingLayout>
  );
};
