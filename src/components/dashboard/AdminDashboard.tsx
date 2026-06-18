import { User } from "@supabase/supabase-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Shield, Settings, Users, Building2, BarChart3, Bell, FileText, Clock, UserCheck } from "lucide-react";
import { NotificationBell } from "@/components/notifications/NotificationBell";
import { useNavigate } from "react-router-dom";
import { AdminStatsCards } from "./admin/AdminStatsCards";
import { SignupsChart } from "./admin/SignupsChart";
import { ConnectionsChart } from "./admin/ConnectionsChart";
import { DistributionCharts } from "./admin/DistributionCharts";
import { UserManagementTable } from "./admin/UserManagementTable";
import { TopProfilesTable } from "./admin/TopProfilesTable";
import { AthleteLayoutEditor } from "./admin/AthleteLayoutEditor";
import { PartnerLayoutEditor } from "./admin/PartnerLayoutEditor";
import { ExpertLayoutEditor } from "./admin/ExpertLayoutEditor";
import { TrainingArticleManager } from "./admin/TrainingArticleManager";
import { WaitlistManager } from "./admin/WaitlistManager";

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analytics");

  const handleSignOut = async () => {
    try {
      await supabase.auth.signOut({ scope: "local" });
      localStorage.clear();
      sessionStorage.clear();
      toast.success("Signed out successfully");
      navigate("/auth");
    } catch (e) {
      console.error("Sign out exception:", e);
      toast.error("Failed to sign out");
    }
  };

  const testNotification = async () => {
    try {
      toast.loading("Sending test notification...");

      const { error } = await supabase.functions.invoke("send-admin-notification", {
        body: {
          notification_type: "new_account",
          user_id: user.id,
        },
      });

      if (error) {
        console.error("Test notification error:", error);
        toast.error("Failed to send test notification: " + error.message);
      } else {
        toast.success("Test notification sent! Check admin email.");
      }
    } catch (err: any) {
      console.error("Test notification error:", err);
      toast.error("Failed to send test notification");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-3xl grid-cols-5 mx-auto">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="athlete" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Athlete View</span>
            </TabsTrigger>
            <TabsTrigger value="experts" className="flex items-center gap-2">
              <UserCheck className="h-4 w-4" />
              <span className="hidden sm:inline">Expert View</span>
            </TabsTrigger>
            <TabsTrigger value="training" className="flex items-center gap-2">
              <FileText className="h-4 w-4" />
              <span className="hidden sm:inline">Training</span>
            </TabsTrigger>
            <TabsTrigger value="waitlist" className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              <span className="hidden sm:inline">Waitlist</span>
            </TabsTrigger>
          </TabsList>


          <TabsContent value="analytics" forceMount className="space-y-6 mt-6">
            {/* Header Card */}
            <div className="bg-gradient-to-r from-primary to-primary-glow rounded-lg p-6 text-primary-foreground shadow-elegant">
              <div className="flex items-center gap-4">
                <div className="h-16 w-16 rounded-full bg-white/10 flex items-center justify-center backdrop-blur-sm">
                  <Shield className="h-8 w-8" />
                </div>
                <div>
                  <h2 className="text-2xl font-bold">Analytics Dashboard</h2>
                  <p className="text-primary-foreground/90">Comprehensive platform insights and metrics</p>
                </div>
              </div>
            </div>

            {/* Stats Overview */}
            <AdminStatsCards />

            {/* Time Series Charts */}
            <div className="grid gap-6 lg:grid-cols-2">
              <SignupsChart />
              <ConnectionsChart />
            </div>

            {/* Distribution Charts */}
            <DistributionCharts />

            {/* Top Profiles */}
            <TopProfilesTable />

            {/* Recent Users */}
            <UserManagementTable />

            {/* User Management Card */}
            <Card className="bg-gradient-to-r from-primary/5 to-accent/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex flex-col gap-4 [@media(min-width:830px)]:flex-row [@media(min-width:830px)]:items-center [@media(min-width:830px)]:justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">User Management</h3>
                    <p className="text-muted-foreground">Grant or revoke admin access to team members</p>
                  </div>
                  <Button
                    onClick={() => navigate("/admin/users")}
                    size="lg"
                    className="w-full [@media(min-width:830px)]:w-auto shrink-0"
                  >
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="athlete" forceMount className="mt-6">
            <AthleteLayoutEditor />
          </TabsContent>

          <TabsContent value="employer" forceMount className="mt-6">
            <PartnerLayoutEditor />
          </TabsContent>

          <TabsContent value="training" forceMount className="mt-6">
            <TrainingArticleManager />
          </TabsContent>

          <TabsContent value="waitlist" forceMount className="mt-6">
            <WaitlistManager />
          </TabsContent>

          <TabsContent value="experts" forceMount className="mt-6">
            <ExpertLayoutEditor />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
