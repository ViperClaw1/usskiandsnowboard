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

const AcceptedExpertConnections = () => {
  const navigate = useNavigate();
  useScrollToTop();
  const { data: connections, isLoading } = useQuery({
    queryKey: ["accepted-expert-connections"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_connection_requests")
        .select(
          `
          *,
          athlete:athlete_profiles(
            profiles:user_id(full_name, email)
          ),
          expert:expert_profiles(full_name, email, job_title)
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
        <h1 className="text-3xl font-bold mb-6">Accepted Athlete ↔ Expert Connections</h1>

        <Card>
          <CardHeader>
            <CardTitle>Active Mentorship Connections ({connections?.length || 0})</CardTitle>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : !connections?.length ? (
              <p className="text-sm text-muted-foreground">No accepted expert connections yet.</p>
            ) : (
              <>
                {/* Desktop table */}
                <div className="hidden [@media(min-width:830px)]:block overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Athlete</TableHead>
                        <TableHead>Athlete Email</TableHead>
                        <TableHead>Expert</TableHead>
                        <TableHead>Expert Email</TableHead>
                        <TableHead>Expertise</TableHead>
                        <TableHead>Connected On</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {connections.map((c) => (
                        <TableRow key={c.id}>
                          <TableCell>{c.athlete?.profiles?.full_name || "N/A"}</TableCell>
                          <TableCell>{c.athlete?.profiles?.email || "N/A"}</TableCell>
                          <TableCell>{c.expert?.full_name || "N/A"}</TableCell>
                          <TableCell>{c.expert?.email || "N/A"}</TableCell>
                          <TableCell>{c.expert?.job_title || "N/A"}</TableCell>
                          <TableCell>{format(new Date(c.updated_at), "MMM d, yyyy")}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* Mobile list */}
                <div className="flex flex-col gap-3 [@media(min-width:830px)]:hidden">
                  {connections.map((c) => (
                    <div
                      key={c.id}
                      className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="absolute top-3 right-3 text-xs text-muted-foreground">
                        {format(new Date(c.updated_at), "MMM d, yyyy")}
                      </div>
                      <p className="pr-24 font-semibold text-sm leading-snug text-foreground">
                        {c.athlete?.profiles?.full_name || "N/A"}
                      </p>
                      <div className="mt-1.5 flex flex-col gap-1 text-xs text-muted-foreground">
                        {c.athlete?.profiles?.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            {c.athlete.profiles.email}
                          </span>
                        )}
                        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5">
                          <span className="font-medium text-foreground/70">
                            {c.expert?.full_name || "N/A"}
                          </span>
                          {c.expert?.email && (
                            <span className="inline-flex items-center gap-1">
                              <Mail className="h-3 w-3 shrink-0" />
                              {c.expert.email}
                            </span>
                          )}
                          {c.expert?.job_title && <span className="italic">{c.expert.job_title}</span>}
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

export default AcceptedExpertConnections;
