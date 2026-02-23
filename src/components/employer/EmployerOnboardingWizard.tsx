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
import { Building2, Upload } from "lucide-react";

interface EmployerOnboardingWizardProps {
  user: User;
  onComplete: () => void;
}

interface FormData {
  companyName: string;
  industry: string;
  companySize: string;
  hqLocation: string;
  about: string;
  opportunities: string;
  contactPerson: string;
  contactTitle: string;
  contactEmail: string;
  website: string;
  linkedin: string;
  logoUrl: string;
  connectionToUssa: string;
}

const TOTAL_STEPS = 11;

export const EmployerOnboardingWizard = ({ user, onComplete }: EmployerOnboardingWizardProps) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [logoUrl, setLogoUrl] = useState<string>("");
  const [isUploading, setIsUploading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { register, watch, setValue, handleSubmit } = useForm<FormData>({
    mode: "onChange",
    defaultValues: {
      companyName: "",
      industry: "",
      companySize: "",
      hqLocation: "",
      about: "",
      opportunities: "",
      contactPerson: "",
      contactTitle: "",
      contactEmail: user.email || "",
      website: "",
      linkedin: "",
      logoUrl: "",
      connectionToUssa: "",
    },
  });

  const formValues = watch();

  // Load draft from localStorage
  useEffect(() => {
    const draft = localStorage.getItem(`employer_onboarding_${user.id}`);
    if (draft) {
      const parsed = JSON.parse(draft);
      Object.keys(parsed.formData).forEach((key) => {
        setValue(key as keyof FormData, parsed.formData[key]);
      });
      if (parsed.logoUrl) setLogoUrl(parsed.logoUrl);
      if (parsed.currentStep) setCurrentStep(parsed.currentStep);
    }
  }, [user.id, setValue]);

  // Auto-save draft
  useEffect(() => {
    const timeoutId = setTimeout(() => {
      localStorage.setItem(
        `employer_onboarding_${user.id}`,
        JSON.stringify({
          currentStep,
          formData: formValues,
          logoUrl,
          lastSaved: Date.now(),
        })
      );
    }, 500);

    return () => clearTimeout(timeoutId);
  }, [formValues, currentStep, logoUrl, user.id]);

  const canGoNext = useMemo(() => {
    switch (currentStep) {
      case 0: return true; // Welcome
      case 1: return true; // Logo (optional)
      case 2: return formValues.companyName.trim().length > 0;
      case 3: return formValues.industry.trim().length > 0;
      case 4: return formValues.companySize.trim().length > 0;
      case 5: return formValues.hqLocation.trim().length > 0;
      case 6: return formValues.about.trim().length > 0;
      case 7: return formValues.connectionToUssa.trim().length > 0;
      case 8: return formValues.opportunities.trim().length > 0;
      case 9: return formValues.contactPerson.trim().length > 0 && formValues.contactEmail.trim().length > 0;
      case 10: return true; // Review
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

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const fileName = `${user.id}-${Date.now()}.${fileExt}`;
      const filePath = `${user.id}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      setLogoUrl(data.publicUrl);
      toast({ title: "Logo uploaded successfully!" });
    } catch (error: any) {
      toast({
        title: "Error uploading logo",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
    }
  };

  const onSubmit = async (data: FormData) => {
    setIsSubmitting(true);
    try {
      const { error } = await supabase
        .from("employer_profiles")
        .upsert({
          user_id: user.id,
          company_name: data.companyName,
          industry: data.industry,
          company_size: data.companySize,
          hq_location: data.hqLocation,
          about: data.about,
          connection_to_ussa: data.connectionToUssa,
          opportunities_offered: data.opportunities,
          contact_person: data.contactPerson,
          contact_title: data.contactTitle,
          contact_email: data.contactEmail,
          website: data.website || null,
          linkedin_url: data.linkedin || null,
          logo_url: logoUrl || null,
        });

      if (error) throw error;

      localStorage.removeItem(`employer_onboarding_${user.id}`);

      toast({
        title: "Profile completed!",
        description: "Your company profile is now live.",
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
            title="Partner with Champions"
            description="Connect with elite athletes who bring Olympic-level dedication, resilience, and performance to every opportunity. Let's set up your company profile in just a few minutes."
          >
            <div className="flex justify-center">
              <Button size="lg" onClick={nextStep} className="h-14 px-12 text-lg">
                <Building2 className="mr-2 h-5 w-5" />
                Begin
              </Button>
            </div>
          </OnboardingStep>
        );

      case 1:
        return (
          <OnboardingStep
            title="Add your company logo"
            description="Help athletes recognize your brand"
            optional
          >
            <div className="flex flex-col items-center gap-4">
              {logoUrl && (
                <img
                  src={logoUrl}
                  alt="Company logo"
                  className="w-32 h-32 object-contain rounded-lg border-2"
                />
              )}
              <Label
                htmlFor="logo-upload"
                className="cursor-pointer inline-flex items-center justify-center gap-2 h-14 px-8 rounded-md bg-primary text-primary-foreground hover:bg-primary/90 text-lg"
              >
                <Upload className="h-5 w-5" />
                {logoUrl ? "Change Logo" : "Upload Logo"}
              </Label>
              <Input
                id="logo-upload"
                type="file"
                accept="image/*"
                onChange={handleLogoUpload}
                className="hidden"
                disabled={isUploading}
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
              isLoading={isUploading}
            />
          </OnboardingStep>
        );

      case 2:
        return (
          <OnboardingStep title="What's your company name?">
            <Input
              {...register("companyName", { required: true })}
              placeholder="Acme Corporation"
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

      case 3:
        return (
          <OnboardingStep title="What industry are you in?">
            <Select value={formValues.industry} onValueChange={(value) => setValue("industry", value)}>
              <SelectTrigger className="h-14 text-lg border-2">
                <SelectValue placeholder="Select your industry" />
              </SelectTrigger>
              <SelectContent className="bg-popover z-50">
                <SelectItem value="Technology & Software">Technology & Software</SelectItem>
                <SelectItem value="Finance & Banking">Finance & Banking</SelectItem>
                <SelectItem value="Healthcare & Medical">Healthcare & Medical</SelectItem>
                <SelectItem value="Retail & E-commerce">Retail & E-commerce</SelectItem>
                <SelectItem value="Manufacturing">Manufacturing</SelectItem>
                <SelectItem value="Construction & Real Estate">Construction & Real Estate</SelectItem>
                <SelectItem value="Education & Training">Education & Training</SelectItem>
                <SelectItem value="Hospitality & Tourism">Hospitality & Tourism</SelectItem>
                <SelectItem value="Transportation & Logistics">Transportation & Logistics</SelectItem>
                <SelectItem value="Media & Entertainment">Media & Entertainment</SelectItem>
                <SelectItem value="Consulting & Professional Services">Consulting & Professional Services</SelectItem>
                <SelectItem value="Energy & Utilities">Energy & Utilities</SelectItem>
                <SelectItem value="Telecommunications">Telecommunications</SelectItem>
                <SelectItem value="Automotive">Automotive</SelectItem>
                <SelectItem value="Aerospace & Defense">Aerospace & Defense</SelectItem>
                <SelectItem value="Agriculture & Farming">Agriculture & Farming</SelectItem>
                <SelectItem value="Biotechnology & Pharmaceuticals">Biotechnology & Pharmaceuticals</SelectItem>
                <SelectItem value="Consumer Goods">Consumer Goods</SelectItem>
                <SelectItem value="Fashion & Apparel">Fashion & Apparel</SelectItem>
                <SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
                <SelectItem value="Insurance">Insurance</SelectItem>
                <SelectItem value="Legal Services">Legal Services</SelectItem>
                <SelectItem value="Marketing & Advertising">Marketing & Advertising</SelectItem>
                <SelectItem value="Mining & Metals">Mining & Metals</SelectItem>
                <SelectItem value="Non-Profit & Social Services">Non-Profit & Social Services</SelectItem>
                <SelectItem value="Publishing">Publishing</SelectItem>
                <SelectItem value="Sports & Recreation">Sports & Recreation</SelectItem>
                <SelectItem value="Government & Public Sector">Government & Public Sector</SelectItem>
                <SelectItem value="Environmental Services">Environmental Services</SelectItem>
                <SelectItem value="Other">Other</SelectItem>
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

      case 4:
        return (
          <OnboardingStep title="How large is your team?">
            <Select value={formValues.companySize} onValueChange={(value) => setValue("companySize", value)}>
              <SelectTrigger className="h-14 text-lg border-2">
                <SelectValue placeholder="Select company size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-10">1-10 employees</SelectItem>
                <SelectItem value="11-50">11-50 employees</SelectItem>
                <SelectItem value="51-200">51-200 employees</SelectItem>
                <SelectItem value="201-500">201-500 employees</SelectItem>
                <SelectItem value="501-1000">501-1000 employees</SelectItem>
                <SelectItem value="1000+">1000+ employees</SelectItem>
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

      case 5:
        return (
          <OnboardingStep title="Where is your HQ located?">
            <Input
              {...register("hqLocation", { required: true })}
              placeholder="San Francisco, CA"
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
          <OnboardingStep
            title="Tell athletes about your company"
            description="Share your mission, culture, and what makes you unique"
          >
            <Textarea
              {...register("about", { required: true })}
              placeholder="We're a leading company that..."
              className="min-h-32 text-lg px-4 py-3 border-2 resize-none"
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

      case 7:
        return (
          <OnboardingStep
            title="What's your connection to US Ski & Snowboard?"
            description="Describe your relationship with the US Ski & Snowboard community"
          >
            <Textarea
              {...register("connectionToUssa", { required: true })}
              placeholder="We've been a proud sponsor for..."
              className="min-h-32 text-lg px-4 py-3 border-2 resize-none"
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

      case 8:
        return (
          <OnboardingStep
            title="What opportunities do you offer?"
            description="Describe the roles, internships, or partnerships available"
          >
            <Textarea
              {...register("opportunities", { required: true })}
              placeholder="We offer internships, full-time positions, brand ambassadorships..."
              className="min-h-32 text-lg px-4 py-3 border-2 resize-none"
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

      case 9:
        return (
          <OnboardingStep
            title="Who should athletes contact?"
            description="Provide contact details for athlete inquiries"
          >
            <div className="space-y-4">
              <div>
                <Label htmlFor="contactPerson" className="text-base">Contact Person</Label>
                <Input
                  id="contactPerson"
                  {...register("contactPerson", { required: true })}
                  placeholder="Jane Smith"
                  className="h-12 text-base mt-1"
                  autoFocus
                />
              </div>
              <div>
                <Label htmlFor="contactTitle" className="text-base">Title</Label>
                <Input
                  id="contactTitle"
                  {...register("contactTitle")}
                  placeholder="HR Manager"
                  className="h-12 text-base mt-1"
                />
              </div>
              <div>
                <Label htmlFor="contactEmail" className="text-base">Email</Label>
                <Input
                  id="contactEmail"
                  {...register("contactEmail", { required: true })}
                  type="email"
                  placeholder="contact@company.com"
                  className="h-12 text-base mt-1"
                />
              </div>
              <div>
                <Label htmlFor="website" className="text-base">Website (optional)</Label>
                <Input
                  id="website"
                  {...register("website")}
                  placeholder="https://company.com"
                  className="h-12 text-base mt-1"
                />
              </div>
              <div>
                <Label htmlFor="linkedin" className="text-base">LinkedIn (optional)</Label>
                <Input
                  id="linkedin"
                  {...register("linkedin")}
                  placeholder="https://linkedin.com/company/..."
                  className="h-12 text-base mt-1"
                />
              </div>
            </div>
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
            title="Review & Complete"
            description="Everything looks good? Let's publish your company profile!"
          >
            <div className="space-y-4 text-left bg-muted/50 p-6 rounded-lg">
              <div>
                <p className="text-sm text-muted-foreground">Company Name</p>
                <p className="text-lg font-medium">{formValues.companyName}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Industry</p>
                <p className="text-lg font-medium">{formValues.industry}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Company Size</p>
                <p className="text-lg font-medium">{formValues.companySize}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Location</p>
                <p className="text-lg font-medium">{formValues.hqLocation}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">About</p>
                <p className="text-base">{formValues.about}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Connection to US Ski & Snowboard</p>
                <p className="text-base">{formValues.connectionToUssa}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Opportunities</p>
                <p className="text-base">{formValues.opportunities}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Contact</p>
                <p className="text-base">
                  {formValues.contactPerson}
                  {formValues.contactTitle && `, ${formValues.contactTitle}`}
                  <br />
                  {formValues.contactEmail}
                </p>
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
