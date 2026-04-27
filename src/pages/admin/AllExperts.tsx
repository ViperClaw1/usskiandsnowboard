import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Mail, Briefcase, Eye, BarChart2 } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { useScrollToTop } from "@/hooks/useScrollToTop";

const AllExperts = () => {
  const navigate = useNavigate();
  useScrollToTop();
  const { data: experts, isLoading } = useQuery({
    queryKey: ["all-experts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("expert_profiles")
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
        <h1 className="text-3xl font-bold mb-6">All Experts</h1>

        <Card>
          <CardHeader>
            <CardTitle>Expert Profiles ({experts?.length || 0})</CardTitle>
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
                        <TableHead>Job Title</TableHead>
                        <TableHead>Area of Expertise</TableHead>
                        <TableHead>Profile Completeness</TableHead>
                        <TableHead>Views</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {experts?.map((expert) => (
                        <TableRow key={expert.id}>
                          <TableCell>{expert.full_name || "N/A"}</TableCell>
                          <TableCell>{expert.email || "N/A"}</TableCell>
                          <TableCell>{expert.job_title || "N/A"}</TableCell>
                          <TableCell>{expert.area_of_expertise || "N/A"}</TableCell>
                          <TableCell>{expert.profile_completeness}%</TableCell>
                          <TableCell>{expert.profile_views}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>

                {/* ── Mobile / tablet card list (< 830 px) ── */}
                <div className="flex flex-col gap-3 [@media(min-width:830px)]:hidden">
                  {experts?.map((expert) => (
                    <div
                      key={expert.id}
                      className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                    >
                      <div className="absolute top-3 right-3 text-xs font-medium text-muted-foreground">
                        {expert.profile_completeness}%
                      </div>

                      <p className="pr-12 font-semibold text-sm leading-snug text-foreground">
                        {expert.full_name || "N/A"}
                      </p>

                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                        {expert.email && (
                          <span className="inline-flex items-center gap-1">
                            <Mail className="h-3 w-3 shrink-0" />
                            {expert.email}
                          </span>
                        )}
                        {expert.job_title && (
                          <span className="inline-flex items-center gap-1">
                            <Briefcase className="h-3 w-3 shrink-0" />
                            {expert.job_title}
                          </span>
                        )}
                      </div>

                      <div className="mt-3 flex items-center gap-4 border-t border-border/60 pt-2.5 text-xs text-muted-foreground">
                        <span className="inline-flex items-center gap-1">
                          <BarChart2 className="h-3.5 w-3.5 shrink-0" />
                          {expert.profile_completeness}% complete
                        </span>
                        <span className="inline-flex items-center gap-1">
                          <Eye className="h-3.5 w-3.5 shrink-0" />
                          {expert.profile_views} views
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

export default AllExperts;
