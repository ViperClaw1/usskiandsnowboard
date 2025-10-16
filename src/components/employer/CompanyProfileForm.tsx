import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const formSchema = z.object({
  company_name: z.string().min(1, "Company name is required"),
  industry: z.string().optional(),
  contact_person: z.string().optional(),
  opportunities_offered: z.string().optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CompanyProfileFormProps {
  userId: string;
  existingProfile?: any;
  onSuccess?: () => void;
}

const CompanyProfileForm = ({ userId, existingProfile, onSuccess }: CompanyProfileFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      company_name: existingProfile?.company_name || "",
      industry: existingProfile?.industry || "",
      contact_person: existingProfile?.contact_person || "",
      opportunities_offered: existingProfile?.opportunities_offered || "",
    },
  });

  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const profileData = {
        user_id: userId,
        company_name: values.company_name,
        industry: values.industry || null,
        contact_person: values.contact_person || null,
        opportunities_offered: values.opportunities_offered || null,
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
              <FormControl>
                <Input placeholder="e.g., Technology, Healthcare, Finance" {...field} />
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
          name="opportunities_offered"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Opportunities Offered</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Describe the types of opportunities you offer (internships, full-time positions, etc.)"
                  className="min-h-[100px]"
                  {...field}
                />
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
