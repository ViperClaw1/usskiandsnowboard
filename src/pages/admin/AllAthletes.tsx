import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Trophy, Eye, BarChart2 } from "lucide-react";
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
        .select(
          `
          *,
          profiles:user_id (full_name, email)
        `,
        )
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
              <>
                {/* ── Desktop table (≥ 830 px) ── */}
                <div className="hidden [@media(min-width:830px)]:block overflow-x-auto">
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
                </div>

                {/* ── Mobile / tablet card list (< 830 px) ── */}
                <div className="flex flex-col gap-3 [@media(min-width:830px)]:hidden">
                  {athletes?.map((athlete) => (
                    <div
                      key={athlete.id}
                      className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* Profile completeness — top-right */}
                      <div className="absolute top-3 right-3 text-xs font-medium text-muted-foreground">
                        {athlete.profile_completeness}%
                      </div>

                      {/* Name */}
                      <p className="pr-12 font-semibold text-sm leading-snug text-foreground">
                        {athlete.profiles?.full_name || "N/A"}
                      </p>

                      {/* Meta row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {athlete.profiles?.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            {athlete.profiles.email}
                          </span>
                        )}
                        {athlete.sport_discipline && (
                          <span className="inline-flex items-center gap-1">
                            <Trophy className="h-3 w-3 shrink-0" />
                            {athlete.sport_discipline}
                          </span>
                        )}
                      </div>

                      {/* Stats strip */}
                      <div className="mt-3 flex items-center gap-4 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <BarChart2 className="h-3.5 w-3.5 shrink-0" />
                          {athlete.profile_completeness}% complete
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 shrink-0" />
                          {athlete.profile_views} views
                        </span>
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

export default AllAthletes;
