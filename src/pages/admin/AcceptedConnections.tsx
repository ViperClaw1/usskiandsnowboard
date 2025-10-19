import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const AcceptedConnections = () => {
  const navigate = useNavigate();

  const { data: connections, isLoading } = useQuery({
    queryKey: ["accepted-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_requests")
        .select(`
          *,
          athlete:athlete_profiles(
            profiles:user_id(full_name, email)
          ),
          employer:employer_profiles(company_name, contact_email)
        `)
        .eq("status", "accepted")
        .order("updated_at", { ascending: false });

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

      <main className="container mx-auto px-4 py-8">
        <h1 className="text-3xl font-bold mb-6">Accepted Connections</h1>
        
        <Card>
          <CardHeader>
            <CardTitle>Active Connections ({connections?.length || 0})</CardTitle>
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
                    <TableHead>Athlete</TableHead>
                    <TableHead>Athlete Email</TableHead>
                    <TableHead>Employer</TableHead>
                    <TableHead>Employer Email</TableHead>
                    <TableHead>Opportunity Type</TableHead>
                    <TableHead>Connected On</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {connections?.map((connection) => (
                    <TableRow key={connection.id}>
                      <TableCell>{connection.athlete?.profiles?.full_name || "N/A"}</TableCell>
                      <TableCell>{connection.athlete?.profiles?.email || "N/A"}</TableCell>
                      <TableCell>{connection.employer?.company_name || "N/A"}</TableCell>
                      <TableCell>{connection.employer?.contact_email || "N/A"}</TableCell>
                      <TableCell>{connection.opportunity_type || "N/A"}</TableCell>
                      <TableCell>{format(new Date(connection.updated_at), "MMM d, yyyy")}</TableCell>
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

export default AcceptedConnections;
