import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Label } from "@/components/ui/label";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Building2, X, Image } from "lucide-react";

// ── Phone helpers (US mask: X-XXX-XXX-XXXX, 11 digits) ──────────────────────
const formatPhone = (digits: string): string => {
  const d = digits.replace(/\D/g, "").slice(0, 11);
  if (d.length === 0) return "";
  if (d.length <= 1) return d;
  if (d.length <= 4) return `${d[0]}-${d.slice(1)}`;
  if (d.length <= 7) return `${d[0]}-${d.slice(1, 4)}-${d.slice(4)}`;
  if (d.length <= 10) return `${d[0]}-${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7)}`;
  return `${d[0]}-${d.slice(1, 4)}-${d.slice(4, 7)}-${d.slice(7, 11)}`;
};

const unformatPhone = (value: string): string => value.replace(/\D/g, "");

const formSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  phone: z
    .string()
    .refine((v) => unformatPhone(v).length === 0 || unformatPhone(v).length === 11, {
      message: "Please enter a valid 11-digit US phone number",
    }),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  hq_location: z.string().optional(),
  contact_person: z.string().optional(),
  contact_title: z.string().optional(),
  contact_email: z.string().email("Invalid email address").optional().or(z.literal("")),
  connection_to_ussa: z.string().optional(),
  about: z.string().optional(),
  website: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  linkedin_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
});

type FormValues = z.infer<typeof formSchema>;

interface CompanyProfileFormProps {
  userId: string;
  existingProfile?: any;
  onSuccess?: () => void;
}

const CompanyProfileForm = ({ userId, existingProfile, onSuccess }: CompanyProfileFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(existingProfile?.logo_url || null);
  const [uploading, setUploading] = useState(false);
  const [backgroundImageUrl, setBackgroundImageUrl] = useState<string>(existingProfile?.background_image_url || "");
  const [backgroundImageFile, setBackgroundImageFile] = useState<File | null>(null);
  const [backgroundImagePreview, setBackgroundImagePreview] = useState<string>(existingProfile?.background_image_url || "");
  const [uploadingBg, setUploadingBg] = useState(false);

  const industryOptions = [
    "Technology & Software",
    "Finance & Banking",
    "Healthcare & Medical",
    "Retail & E-commerce",
    "Manufacturing",
    "Construction & Real Estate",
    "Education & Training",
    "Hospitality & Tourism",
    "Transportation & Logistics",
    "Media & Entertainment",
    "Consulting & Professional Services",
    "Energy & Utilities",
    "Telecommunications",
    "Automotive",
    "Aerospace & Defense",
    "Agriculture & Farming",
    "Biotechnology & Pharmaceuticals",
    "Consumer Goods",
    "Fashion & Apparel",
    "Food & Beverage",
    "Insurance",
    "Legal Services",
    "Marketing & Advertising",
    "Mining & Metals",
    "Non-Profit & Social Services",
    "Publishing",
    "Sports & Recreation",
    "Government & Public Sector",
    "Environmental Services",
    "Other"
  ];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: existingProfile?.company_name || "",
      phone: formatPhone(unformatPhone(existingProfile?.phone || "")),
      industry: existingProfile?.industry || "",
      company_size: existingProfile?.company_size || "",
      hq_location: existingProfile?.hq_location || "",
      contact_person: existingProfile?.contact_person || "",
      contact_title: existingProfile?.contact_title || "",
      contact_email: existingProfile?.contact_email || "",
      connection_to_ussa: existingProfile?.connection_to_ussa || "",
      about: existingProfile?.about || "",
      website: existingProfile?.website || "",
      linkedin_url: existingProfile?.linkedin_url || "",
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const filePath = `${userId}/logo-${timestamp}.${fileExt}`;

      if (logoUrl) {
        try {
          const { data: files } = await supabase.storage
            .from("company-logos")
            .list(userId);
          
          if (files && files.length > 0) {
            const logoFiles = files.filter(f => f.name.startsWith('logo-'));
            if (logoFiles.length > 0) {
              const filesToDelete = logoFiles.map(file => `${userId}/${file.name}`);
              await supabase.storage.from("company-logos").remove(filesToDelete);
            }
          }
        } catch (error) {
          console.error("Error deleting old logo:", error);
        }
      }

      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      setLogoUrl(`${publicUrl}?v=${timestamp}`);
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
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

  const uploadBackgroundImage = async (): Promise<string | null> => {
    if (!backgroundImageFile) return backgroundImageUrl || null;

    setUploadingBg(true);
    try {
      const fileExt = backgroundImageFile.name.split('.').pop();
      const timestamp = Date.now();
      const fileName = `${userId}/bg-${timestamp}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from('company-logos')
        .upload(fileName, backgroundImageFile, { upsert: true });

      if (uploadError) throw uploadError;

      const { data } = supabase.storage
        .from('company-logos')
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

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const uploadedBgUrl = await uploadBackgroundImage();

      const profileData = {
        user_id: userId,
        company_name: values.company_name,
        phone: values.phone ? unformatPhone(values.phone) || null : null,
        industry: values.industry || null,
        company_size: values.company_size || null,
        hq_location: values.hq_location || null,
        contact_person: values.contact_person || null,
        contact_title: values.contact_title || null,
        contact_email: values.contact_email || null,
        connection_to_ussa: values.connection_to_ussa || null,
        about: values.about || null,
        website: values.website || null,
        linkedin_url: values.linkedin_url || null,
        logo_url: logoUrl ? logoUrl.split('?')[0] : null,
        background_image_url: uploadedBgUrl ? uploadedBgUrl.split('?')[0] : (backgroundImageUrl ? backgroundImageUrl.split('?')[0] : null),
      };

      let error;
      if (existingProfile) {
        const { error: updateError } = await supabase
          .from("employer_profiles")
          .update(profileData)
          .eq("user_id", userId);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from("employer_profiles")
          .insert([profileData]);
        error = insertError;
      }

      if (error) throw error;

      toast.success("Company profile saved successfully!");
      onSuccess?.();
    } catch (error) {
      console.error("Error saving profile:", error);
      toast.error("Failed to save company profile");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">

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
                    htmlFor="company-bg-upload"
                    className="cursor-pointer inline-flex items-center gap-1.5 text-xs bg-background/80 hover:bg-background px-2 py-1 rounded border shadow-sm"
                  >
                    <Image className="h-3 w-3" />
                    Change
                  </Label>
                </div>
              </div>
            ) : (
              <Label
                htmlFor="company-bg-upload"
                className="cursor-pointer flex flex-col items-center justify-center w-full h-24 border-2 border-dashed rounded-lg hover:bg-muted/50 transition-colors gap-2 text-muted-foreground"
              >
                <Image className="h-6 w-6" />
                <span className="text-sm">Upload background image</span>
                <span className="text-xs">Wide photo recommended (max 10MB)</span>
              </Label>
            )}
            <input
              id="company-bg-upload"
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

        {/* Company Logo */}
        <div className="flex flex-col items-center gap-4">
          <Avatar className="h-32 w-32">
            {logoUrl ? (
              <AvatarImage src={logoUrl} alt="Company logo" className="object-cover" />
            ) : (
              <AvatarFallback>
                <Building2 className="h-16 w-16 text-muted-foreground" />
              </AvatarFallback>
            )}
          </Avatar>
          <div className="flex flex-col items-center gap-2">
            <input
              type="file"
              id="logo-upload"
              accept="image/*"
              onChange={handleLogoUpload}
              className="hidden"
              disabled={uploading}
            />
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => document.getElementById("logo-upload")?.click()}
              disabled={uploading}
            >
              {uploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload Logo
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground">Max 5MB, JPG/PNG</p>
          </div>
        </div>

        <FormField
          control={form.control}
          name="company_name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Name *</FormLabel>
              <FormControl>
                <Input placeholder="Enter company name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="phone"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Phone Number *</FormLabel>
              <FormControl>
                <Input
                  type="tel"
                  placeholder="1-XXX-XXX-XXXX"
                  {...field}
                  value={field.value}
                  onChange={(e) => {
                    const digits = unformatPhone(e.target.value);
                    field.onChange(formatPhone(digits));
                  }}
                />
              </FormControl>
              <p className="text-xs text-muted-foreground">
                Used for account recovery and optional SMS notifications (private, not displayed publicly)
              </p>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="industry"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Industry</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select industry" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover z-50">
                  {industryOptions.map(industry => (
                    <SelectItem key={industry} value={industry}>{industry}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="company_size"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Company Size</FormLabel>
              <Select onValueChange={field.onChange} defaultValue={field.value}>
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Select company size" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent className="bg-popover z-50">
                  <SelectItem value="1-10">1-10 employees</SelectItem>
                  <SelectItem value="11-50">11-50 employees</SelectItem>
                  <SelectItem value="51-200">51-200 employees</SelectItem>
                  <SelectItem value="201-500">201-500 employees</SelectItem>
                  <SelectItem value="501-1000">501-1000 employees</SelectItem>
                  <SelectItem value="1000+">1000+ employees</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="hq_location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>HQ Location</FormLabel>
              <FormControl>
                <Input placeholder="e.g., San Francisco, CA" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_person"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Person</FormLabel>
              <FormControl>
                <Input placeholder="Enter contact person name" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_title"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Title</FormLabel>
              <FormControl>
                <Input placeholder="e.g., HR Manager, Talent Acquisition" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="contact_email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Contact Email</FormLabel>
              <FormControl>
                <Input type="email" placeholder="contact@company.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="about"
          render={({ field }) => (
            <FormItem>
              <FormLabel>About</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Tell athletes about your company and culture..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="connection_to_ussa"
          render={({ field }) => (
            <FormItem>
              <FormLabel>What's your connection to US Ski & Snowboard?</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe your relationship with US Ski & Snowboard..."
                  className="min-h-[100px]"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="website"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Website</FormLabel>
              <FormControl>
                <Input placeholder="https://yourcompany.com" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="linkedin_url"
          render={({ field }) => (
            <FormItem>
              <FormLabel>LinkedIn URL</FormLabel>
              <FormControl>
                <Input placeholder="https://linkedin.com/company/yourcompany" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <Button type="submit" disabled={isSubmitting || uploadingBg} className="w-full">
          {(isSubmitting || uploadingBg) && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingProfile ? "Update Profile" : "Create Profile"}
        </Button>
      </form>
    </Form>
  );
};

export default CompanyProfileForm;
