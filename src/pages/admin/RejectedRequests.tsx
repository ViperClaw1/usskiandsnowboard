import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, MessageSquare } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";

const RejectedRequests = () => {
  const navigate = useNavigate();
  const { data: requests, isLoading } = useQuery({
    queryKey: ["rejected-requests"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("connection_requests")
        .select(
          `
          *,
          athlete:athlete_profiles(
            profiles:user_id(full_name)
          ),
          employer:employer_profiles(company_name)
        `,
        )
        .eq("status", "rejected")
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
        <h1 className="text-3xl font-bold mb-6">Rejected Requests</h1>

        <Card>
          <CardHeader>
            <CardTitle>Rejected Connection Requests ({requests?.length || 0})</CardTitle>
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
                        <TableHead>Employer</TableHead>
                        <TableHead>Opportunity Type</TableHead>
                        <TableHead>Rejected On</TableHead>
                        <TableHead>Message</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests?.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.athlete?.profiles?.full_name || "N/A"}</TableCell>
                          <TableCell>{request.employer?.company_name || "N/A"}</TableCell>
                          <TableCell>{request.opportunity_type || "N/A"}</TableCell>
                          <TableCell>{format(new Date(request.updated_at), "MMM d, yyyy")}</TableCell>
                          <TableCell className="max-w-xs truncate">{request.message || "N/A"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* ── Mobile / tablet card list (< 830 px) ── */}
                <div className="flex flex-col gap-3 [@media(min-width:830px)]:hidden">
                  {requests?.map((request) => (
                    <div
                      key={request.id}
                      className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* Rejected date — top-right */}
                      <div className="absolute top-3 right-3 text-xs text-muted-foreground">
                        {format(new Date(request.updated_at), "MMM d, yyyy")}
                      </div>

                      {/* Athlete name */}
                      <p className="pr-24 font-semibold text-sm leading-snug text-foreground">
                        {request.athlete?.profiles?.full_name || "N/A"}
                      </p>

                      {/* Meta row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span className="font-medium text-foreground/70">
                          {request.employer?.company_name || "N/A"}
                        </span>
                        {request.opportunity_type && <span className="italic">{request.opportunity_type}</span>}
                      </div>

                      {/* Message */}
                      {request.message && (
                        <div className="mt-2 flex items-start gap-1.5 text-xs text-muted-foreground border-t border-border/60 pt-2">
                          <MessageSquare className="h-3 w-3 shrink-0 mt-0.5" />
                          <span className="line-clamp-2">{request.message}</span>
                        </div>
                      )}
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

export default RejectedRequests;
