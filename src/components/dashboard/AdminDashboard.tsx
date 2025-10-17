import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Shield, Users, Briefcase, Link as LinkIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    // Clear local state and navigate even if server-side logout fails
    // (session might already be invalid)
    if (error && error.message !== "Session from session_id claim in JWT does not exist") {
      toast.error("Error signing out");
      console.error("Sign out error:", error);
    } else {
      toast.success("Signed out successfully");
    }
    navigate("/");
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <Button variant="ghost" onClick={handleSignOut}>
            <LogOut className="h-4 w-4 mr-2" />
            Sign Out
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <div className="grid gap-6">
          <Card className="shadow-elegant">
            <CardHeader>
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-destructive/10 flex items-center justify-center">
                  <Shield className="h-8 w-8 text-destructive" />
                </div>
                <div>
                  <CardTitle>Admin Control Center</CardTitle>
                  <CardDescription>Manage the entire platform</CardDescription>
                </div>
              </div>
            </CardHeader>
          </Card>

          <div className="grid md:grid-cols-4 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Users className="h-5 w-5 text-primary" />
                  Athletes
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground mt-1">Total registered</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Briefcase className="h-5 w-5 text-accent" />
                  Partners
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground mt-1">Active partners</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-primary" />
                  Requests
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-accent">0</p>
                <p className="text-sm text-muted-foreground mt-1">Pending approval</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <LinkIcon className="h-5 w-5 text-foreground" />
                  Connections
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground mt-1">Facilitated</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Recent Connection Requests</CardTitle>
              <CardDescription>Review and approve employer requests</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground text-center py-8">
                No pending requests
              </p>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
