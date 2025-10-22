import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const AllAthletes = () => {
  const navigate = useNavigate();

  const { data: athletes, isLoading } = useQuery({
    queryKey: ["all-athletes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(`
          *,
          profiles:user_id (full_name, email)
        `)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b bg-card">
        <div className="container mx-auto px-4 py-4">
          <Button variant="ghost" onClick={() => navigate("/dashboard")}>
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
      </header>

      <main className="container mx-auto px-4 py-8 max-w-7xl">
        <h1 className="text-3xl font-bold mb-6">All Athletes</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Athlete Profiles ({athletes?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Sport</TableHead>
                    <TableHead>Profile Completeness</TableHead>
                    <TableHead>Views</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {athletes?.map((athlete) => (
                    <TableRow key={athlete.id}>
                      <TableCell>{athlete.profiles?.full_name || "N/A"}</TableCell>
                      <TableCell>{athlete.profiles?.email}</TableCell>
                      <TableCell>{athlete.sport_discipline || "N/A"}</TableCell>
                      <TableCell>{athlete.profile_completeness}%</TableCell>
                      <TableCell>{athlete.profile_views}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AllAthletes;
