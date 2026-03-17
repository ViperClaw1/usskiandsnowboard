import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { User, Briefcase, Shield } from "lucide-react";

interface RoleSelectionProps {
  userId: string;
  onRoleSet: (role: string) => void;
}

const RoleSelection = ({ userId, onRoleSet }: RoleSelectionProps) => {
  const [loading, setLoading] = useState(false);

  const setRole = async (role: "athlete" | "employer") => {
    setLoading(true);
    try {
      const { error } = await supabase
        .from("user_roles")
        .insert({ user_id: userId, role });

      if (error) throw error;

      toast.success(`Welcome! You're now registered as ${role === "athlete" ? "an athlete" : role === "employer" ? "an employer" : "an admin"}`);
      onRoleSet(role);
    } catch (error: any) {
      toast.error(error.message || "Failed to set role");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-background to-secondary p-4">
      <div className="w-full max-w-4xl">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold mb-2 text-foreground">Welcome to the Platform</h1>
          <p className="text-muted-foreground">Choose your role to get started</p>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <Card className="shadow-elegant hover:shadow-hover transition-shadow cursor-pointer" onClick={() => !loading && setRole("athlete")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <User className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>I'm an Athlete</CardTitle>
              <CardDescription>
                Create your profile and connect with career opportunities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li>• Build your professional profile</li>
                <li>• Showcase skills and experience</li>
                <li>• Connect with partners</li>
                <li>• Receive opportunity requests</li>
              </ul>
              <Button className="w-full" disabled={loading}>
                Get Started as Athlete
              </Button>
            </CardContent>
          </Card>

          <Card className="shadow-elegant hover:shadow-hover transition-shadow cursor-pointer" onClick={() => !loading && setRole("employer")}>
            <CardHeader>
              <div className="h-12 w-12 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                <Briefcase className="h-6 w-6 text-accent" />
              </div>
              <CardTitle>I'm an Employer</CardTitle>
              <CardDescription>
                Discover talented athletes for your organization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground mb-4">
                <li>• Search athlete profiles</li>
                <li>• Filter by skills and interests</li>
                <li>• Request connections</li>
                <li>• Post opportunities</li>
              </ul>
              <Button className="w-full" variant="secondary" disabled={loading}>
                Get Started as Employer
              </Button>
            </CardContent>
          </Card>
        </div>

        <Card className="mt-6 shadow-elegant">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-full bg-destructive/10 flex items-center justify-center">
                <Shield className="h-5 w-5 text-destructive" />
              </div>
              <div>
                <p className="text-sm font-medium">Admin Access</p>
                <p className="text-xs text-muted-foreground">Contact system administrator for admin privileges</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default RoleSelection;
