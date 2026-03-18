import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { useScrollToTop } from "@/hooks/useScrollToTop";

const AcceptedConnections = () => {
  const navigate = useNavigate();
  useScrollToTop();
  const { data: connections, isLoading } = useQuery({
    queryKey: ["accepted-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_requests")
        .select(
          `
          *,
          athlete:athlete_profiles(
            profiles:user_id(full_name, email)
          ),
          employer:employer_profiles(company_name, contact_email)
        `,
        )
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
              <>
                {/* ── Desktop table (≥ 830 px) ── */}
                <div className="hidden [@media(min-width:830px)]:block overflow-x-auto">
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
                </div>

                {/* ── Mobile / tablet card list (< 830 px) ── */}
                <div className="flex flex-col gap-3 [@media(min-width:830px)]:hidden">
                  {connections?.map((connection) => (
                    <div
                      key={connection.id}
                      className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* Connected date — top-right */}
                      <div className="absolute top-3 right-3 text-xs text-muted-foreground">
                        {format(new Date(connection.updated_at), "MMM d, yyyy")}
                      </div>

                      {/* Athlete name */}
                      <p className="pr-24 font-semibold text-sm leading-snug text-foreground">
                        {connection.athlete?.profiles?.full_name || "N/A"}
                      </p>

                      {/* Meta rows */}
                      <div className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
                        {connection.athlete?.profiles?.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            {connection.athlete.profiles.email}
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span className="font-medium text-foreground/70">
                            {connection.employer?.company_name || "N/A"}
                          </span>
                          {connection.employer?.contact_email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" />
                              {connection.employer.contact_email}
                            </span>
                          )}
                          {connection.opportunity_type && <span className="italic">{connection.opportunity_type}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  );
};

export default AcceptedConnections;
