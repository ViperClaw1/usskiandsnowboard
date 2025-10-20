import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Loader2 } from "lucide-react";

const roleSchema = z.object({
  title: z.string().min(1, "Title is required").max(100),
  type: z.string().min(1, "Link type is required"),
  url: z.string().url("Please enter a valid URL"),
  location: z.string().min(1, "Location is required"),
});

const formSchema = z.object({
  job_board_url: z.string().url("Please enter a valid URL").optional().or(z.literal("")),
  individual_roles: z.array(roleSchema).max(3, "Maximum 3 roles allowed").optional(),
});

type FormValues = z.infer<typeof formSchema>;

interface CompanyProfileFormProps {
  userId: string;
  existingProfile?: any;
  onSuccess?: () => void;
}

const CompanyProfileForm = ({ userId, existingProfile, onSuccess }: CompanyProfileFormProps) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [roles, setRoles] = useState<Array<{ title: string; type: string; url: string; location: string }>>(
    existingProfile?.individual_roles || []
  );


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
      job_board_url: existingProfile?.job_board_url || "",
      individual_roles: existingProfile?.individual_roles || [],
    },
  });


  const onSubmit = async (values: FormValues) => {
    setIsSubmitting(true);
    try {
      const profileData = {
        job_board_url: values.job_board_url || null,
        individual_roles: roles.length > 0 ? roles : null,
      };

      const { error } = await supabase
        .from("employer_profiles")
        .update(profileData)
        .eq("user_id", userId);

      if (error) throw error;

      toast.success("Job opportunities updated successfully!");
      onSuccess?.();
    } catch (error) {
      console.error("Error updating job opportunities:", error);
      toast.error("Failed to update job opportunities");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
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

        <Button type="submit" disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Update Opportunities
        </Button>
      </form>
    </Form>
  );
};

export default CompanyProfileForm;
