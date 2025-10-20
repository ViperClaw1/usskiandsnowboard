import { User } from "@supabase/supabase-js";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { LogOut, Shield, Settings, Users, Building2, BarChart3 } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { AdminStatsCards } from "./admin/AdminStatsCards";
import { SignupsChart } from "./admin/SignupsChart";
import { ConnectionsChart } from "./admin/ConnectionsChart";
import { DistributionCharts } from "./admin/DistributionCharts";
import { UserManagementTable } from "./admin/UserManagementTable";
import { TopProfilesTable } from "./admin/TopProfilesTable";
import AthleteDashboard from "./AthleteDashboard";
import EmployerDashboard from "./EmployerDashboard";

interface AdminDashboardProps {
  user: User;
}

const AdminDashboard = ({ user }: AdminDashboardProps) => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState("analytics");

  const handleSignOut = async () => {
    try {
      const { error } = await supabase.auth.signOut();
      if (error) {
        console.warn("Sign out warning:", error);
      }
    } catch (e) {
      console.warn("Sign out exception:", e);
    } finally {
      toast.success("Signed out successfully");
      navigate("/");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-foreground">Admin Dashboard</h1>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => navigate("/settings")}>
              <Settings className="h-4 w-4" />
            </Button>
            <Button variant="ghost" onClick={handleSignOut}>
              <LogOut className="h-4 w-4 mr-2" />
              Sign Out
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
          <TabsList className="grid w-full max-w-md grid-cols-3 mx-auto">
            <TabsTrigger value="analytics" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              <span className="hidden sm:inline">Analytics</span>
            </TabsTrigger>
            <TabsTrigger value="athlete" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              <span className="hidden sm:inline">Athlete View</span>
            </TabsTrigger>
            <TabsTrigger value="employer" className="flex items-center gap-2">
              <Building2 className="h-4 w-4" />
              <span className="hidden sm:inline">Partner View</span>
            </TabsTrigger>
          </TabsList>

          <TabsContent value="analytics" className="space-y-6 mt-6">
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
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-xl font-bold text-foreground">User Management</h3>
                    <p className="text-muted-foreground">Grant or revoke admin access to team members</p>
                  </div>
                  <Button onClick={() => navigate("/admin/users")} size="lg">
                    <Shield className="h-4 w-4 mr-2" />
                    Manage Users
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="athlete" className="mt-0">
            <Card className="mb-4 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
              <CardContent className="pt-4">
                <p className="text-sm text-amber-800 dark:text-amber-200">
                  <strong>QA Mode:</strong> Viewing as Athlete - This is how the athlete dashboard appears to athletes
                </p>
              </CardContent>
            </Card>
            <AthleteDashboard user={user} />
          </TabsContent>

          <TabsContent value="employer" className="mt-0">
            <Card className="mb-4 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
              <CardContent className="pt-4">
                <p className="text-sm text-blue-800 dark:text-blue-200">
                  <strong>QA Mode:</strong> Viewing as Partner - This is how the partner dashboard appears to partners
                </p>
              </CardContent>
            </Card>
            <EmployerDashboard user={user} />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
};

export default AdminDashboard;
