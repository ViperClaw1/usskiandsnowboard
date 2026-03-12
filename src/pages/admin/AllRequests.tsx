import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const AllRequests = () => {
  const navigate = useNavigate();
  const { data: requests, isLoading } = useQuery({
    queryKey: ["all-requests"],
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
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case "accepted":
        return "default";
      case "pending":
        return "secondary";
      case "rejected":
        return "destructive";
      default:
        return "outline";
    }
  };

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
        <h1 className="text-3xl font-bold mb-6">All Connection Requests</h1>

        <Card>
          <CardHeader>
            <CardTitle>Connection Requests ({requests?.length || 0})</CardTitle>
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
                        <TableHead>Status</TableHead>
                        <TableHead>Created</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {requests?.map((request) => (
                        <TableRow key={request.id}>
                          <TableCell>{request.athlete?.profiles?.full_name || "N/A"}</TableCell>
                          <TableCell>{request.employer?.company_name || "N/A"}</TableCell>
                          <TableCell>{request.opportunity_type || "N/A"}</TableCell>
                          <TableCell>
                            <Badge variant={getStatusColor(request.status)}>{request.status}</Badge>
                          </TableCell>
                          <TableCell>{format(new Date(request.created_at), "MMM d, yyyy")}</TableCell>
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
                      {/* Status badge — top-right */}
                      <div className="absolute top-3 right-3">
                        <Badge variant={getStatusColor(request.status)} className="capitalize text-xs">
                          {request.status}
                        </Badge>
                      </div>

                      {/* Athlete name */}
                      <p className="pr-24 font-semibold text-sm leading-snug text-foreground">
                        {request.athlete?.profiles?.full_name || "N/A"}
                      </p>

                      {/* Meta row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        <span>{request.employer?.company_name || "N/A"}</span>
                        {request.opportunity_type && <span className="italic">{request.opportunity_type}</span>}
                        <span>{format(new Date(request.created_at), "MMM d, yyyy")}</span>
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

export default AllRequests;
