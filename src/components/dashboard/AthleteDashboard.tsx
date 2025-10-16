import { useState } from "react";
import { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, User as UserIcon } from "lucide-react";
import { useNavigate } from "react-router-dom";
import ProfileForm from "@/components/athlete/ProfileForm";

interface AthleteDashboardProps {
  user: User;
}

const AthleteDashboard = ({ user }: AthleteDashboardProps) => {
  const navigate = useNavigate();
  const [showProfileDialog, setShowProfileDialog] = useState(false);

  const handleSignOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) {
      toast.error("Failed to sign out");
    } else {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  const handleProfileComplete = () => {
    setShowProfileDialog(false);
    toast.success("Profile updated! Refreshing...");
    setTimeout(() => window.location.reload(), 1000);
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Athlete Dashboard</h1>
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
                <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
                  <UserIcon className="h-8 w-8 text-primary" />
                </div>
                <div>
                  <CardTitle>Welcome, {user.email}</CardTitle>
                  <CardDescription>Complete your athlete profile to get started</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Your profile is <span className="font-semibold text-foreground">0% complete</span>
                </p>
                <Button onClick={() => setShowProfileDialog(true)}>
                  Complete Your Profile
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Profile Views</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-primary">0</p>
                <p className="text-sm text-muted-foreground mt-1">This month</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Connection Requests</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-accent">0</p>
                <p className="text-sm text-muted-foreground mt-1">Pending</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-lg">Opportunities</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-3xl font-bold text-foreground">0</p>
                <p className="text-sm text-muted-foreground mt-1">Available</p>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>

      <Dialog open={showProfileDialog} onOpenChange={setShowProfileDialog}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Complete Your Athlete Profile</DialogTitle>
            <DialogDescription>
              Share your athletic background, skills, and career interests
            </DialogDescription>
          </DialogHeader>
          <ProfileForm userId={user.id} onComplete={handleProfileComplete} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AthleteDashboard;
