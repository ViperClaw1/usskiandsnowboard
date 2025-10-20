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
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2, Upload, Building2 } from "lucide-react";

const roleSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  type: z.string().min(1, "Link type is required"),
  url: z.string().url("Please enter a valid URL"),
  location: z.string().min(1, "Location is required"),
});

const formSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  company_size: z.string().optional(),
  hq_location: z.string().optional(),
  contact_person: z.string().optional(),
  contact_title: z.string().optional(),
  contact_email: z.string().email("Invalid email address").optional().or(z.literal("")),
  about: z.string().optional(),
  job_board_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  individual_roles: z.array(roleSchema).max(3, "Maximum 3 roles allowed").optional(),
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
  const [roles, setRoles] = useState<Array<{ title: string; type: string; url: string; location: string }>>(
    existingProfile?.individual_roles || []
  );

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


  const linkTypes = [
    "Full-Time Position",
    "Part-Time Position",
    "Internship",
    "Contract Role",
    "Volunteer Opportunity",
    "Training Program"
  ];

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: existingProfile?.company_name || "",
      industry: existingProfile?.industry || "",
      company_size: existingProfile?.company_size || "",
      hq_location: existingProfile?.hq_location || "",
      contact_person: existingProfile?.contact_person || "",
      contact_title: existingProfile?.contact_title || "",
      contact_email: existingProfile?.contact_email || "",
      about: existingProfile?.about || "",
      job_board_url: existingProfile?.job_board_url || "",
      individual_roles: existingProfile?.individual_roles || [],
      website: existingProfile?.website || "",
      linkedin_url: existingProfile?.linkedin_url || "",
    },
  });

  const handleLogoUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith("image/")) {
      toast.error("Please upload an image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      toast.error("Image must be less than 5MB");
      return;
    }

    setUploading(true);
    try {
      const fileExt = file.name.split(".").pop();
      const timestamp = Date.now();
      const filePath = `${userId}/logo-${timestamp}.${fileExt}`;

      // Delete old logo if exists - list all files in user folder and delete them
      if (logoUrl) {
        try {
          const { data: files } = await supabase.storage
            .from("company-logos")
            .list(userId);
          
          if (files && files.length > 0) {
            const filesToDelete = files.map(file => `${userId}/${file.name}`);
            await supabase.storage.from("company-logos").remove(filesToDelete);
          }
        } catch (error) {
          console.error("Error deleting old logo:", error);
        }
      }

      // Upload new logo with upsert
      const { error: uploadError } = await supabase.storage
        .from("company-logos")
        .upload(filePath, file, { upsert: true });

      if (uploadError) throw uploadError;

      // Get public URL
      const { data: { publicUrl } } = supabase.storage
        .from("company-logos")
        .getPublicUrl(filePath);

      // Cache-bust in UI to avoid stale image
      setLogoUrl(`${publicUrl}?v=${timestamp}`);
      toast.success("Logo uploaded successfully!");
    } catch (error) {
      console.error("Error uploading logo:", error);
      toast.error("Failed to upload logo");
    } finally {
      setUploading(false);
    }
  };


  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const profileData = {
        user_id: userId,
        company_name: values.company_name,
        industry: values.industry || null,
        company_size: values.company_size || null,
        hq_location: values.hq_location || null,
        contact_person: values.contact_person || null,
        contact_title: values.contact_title || null,
        contact_email: values.contact_email || null,
        about: values.about || null,
        job_board_url: values.job_board_url || null,
        individual_roles: roles.length > 0 ? roles : null,
        website: values.website || null,
        linkedin_url: values.linkedin_url || null,
        logo_url: logoUrl ? logoUrl.split('?')[0] : null,
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

        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <FormLabel>Job Opportunities</FormLabel>
          </div>

          <FormField
            control={form.control}
            name="job_board_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Company Job Board / Careers Page</FormLabel>
                <FormControl>
                  <Input placeholder="https://yourcompany.com/careers" {...field} />
                </FormControl>
                <p className="text-xs text-muted-foreground">
                  Link to your main careers page or job board
                </p>
                <FormMessage />
              </FormItem>
            )}
          />

          <div className="space-y-3">
            <FormLabel>Individual Role Listings (up to 3)</FormLabel>
            <p className="text-xs text-muted-foreground">
              Add specific job postings from LinkedIn, Indeed, or other platforms
            </p>
            
            {roles.map((role, index) => (
              <div key={index} className="p-4 border rounded-lg space-y-3 bg-muted/30">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">Role {index + 1}</p>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      const newRoles = roles.filter((_, i) => i !== index);
                      setRoles(newRoles);
                    }}
                  >
                    Remove
                  </Button>
                </div>
                <div className="space-y-2">
                  <Input
                    placeholder="Link Title (e.g., Marketing Manager)"
                    value={role.title}
                    onChange={(e) => {
                      const newRoles = [...roles];
                      newRoles[index].title = e.target.value;
                      setRoles(newRoles);
                    }}
                  />
                  <Select
                    value={role.type}
                    onValueChange={(value) => {
                      const newRoles = [...roles];
                      newRoles[index].type = value;
                      setRoles(newRoles);
                    }}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Position Type" />
                    </SelectTrigger>
                    <SelectContent>
                      {linkTypes.map((type) => (
                        <SelectItem key={type} value={type}>
                          {type}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    placeholder="https://linkedin.com/jobs/..."
                    value={role.url}
                    onChange={(e) => {
                      const newRoles = [...roles];
                      newRoles[index].url = e.target.value;
                      setRoles(newRoles);
                    }}
                  />
                  <Input
                    placeholder="Remote, New York, NY, etc."
                    value={role.location}
                    onChange={(e) => {
                      const newRoles = [...roles];
                      newRoles[index].location = e.target.value;
                      setRoles(newRoles);
                    }}
                  />
                </div>
              </div>
            ))}

            {roles.length < 3 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  if (roles.length < 3) {
                    setRoles([...roles, { title: "", type: "", url: "", location: "" }]);
                  }
                }}
                className="w-full"
              >
                + Add Role
              </Button>
            )}
          </div>
        </div>

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

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          {existingProfile ? "Update Profile" : "Create Profile"}
        </Button>
      </form>
    </Form>
  );
};

export default CompanyProfileForm;
