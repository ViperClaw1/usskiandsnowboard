import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Building2, User, Eye, BarChart2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";

const AllEmployers = () => {
  const navigate = useNavigate();
  const { data: employers, isLoading } = useQuery({
    queryKey: ["all-employers"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("employer_profiles")
        .select("*")
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
        <h1 className="text-3xl font-bold mb-6">All Employers</h1>

        <Card>
          <CardHeader>
            <CardTitle>Employer Profiles ({employers?.length || 0})</CardTitle>
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
                        <TableHead>Company Name</TableHead>
                        <TableHead>Industry</TableHead>
                        <TableHead>Contact Person</TableHead>
                        <TableHead>Profile Completeness</TableHead>
                        <TableHead>Views</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {employers?.map((employer) => (
                        <TableRow key={employer.id}>
                          <TableCell>{employer.company_name}</TableCell>
                          <TableCell>{employer.industry || "N/A"}</TableCell>
                          <TableCell>{employer.contact_person || "N/A"}</TableCell>
                          <TableCell>{employer.profile_completeness}%</TableCell>
                          <TableCell>{employer.profile_views}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* ── Mobile / tablet card list (< 830 px) ── */}
                <div className="flex flex-col gap-3 [@media(min-width:830px)]:hidden">
                  {employers?.map((employer) => (
                    <div
                      key={employer.id}
                      className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      {/* Profile completeness — top-right */}
                      <div className="absolute top-3 right-3 text-xs font-medium text-muted-foreground">
                        {employer.profile_completeness}%
                      </div>

                      {/* Company name */}
                      <p className="pr-12 font-semibold text-sm leading-snug text-foreground">
                        {employer.company_name}
                      </p>

                      {/* Meta row */}
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {employer.industry && (
                          <span className="inline-flex items-center gap-1">
                            <Building2 className="h-3 w-3 shrink-0" />
                            {employer.industry}
                          </span>
                        )}
                        {employer.contact_person && (
                          <span className="inline-flex items-center gap-1">
                            <User className="h-3 w-3 shrink-0" />
                            {employer.contact_person}
                          </span>
                        )}
                      </div>

                      {/* Stats strip */}
                      <div className="mt-3 flex items-center gap-4 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <BarChart2 className="h-3.5 w-3.5 shrink-0" />
                          {employer.profile_completeness}% complete
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 shrink-0" />
                          {employer.profile_views} views
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

export default AllEmployers;
