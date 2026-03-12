import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

export const TopProfilesTable = () => {
  const { data: topAthletes, isLoading: athletesLoading } = useQuery({
    queryKey: ["top-athletes"],
    queryFn: async () => {
      const { data, error } = await supabase.from("top_athlete_profiles").select("*").limit(5);
      if (error) throw error;
      return data;
    },
  });

  const { data: topEmployers, isLoading: employersLoading } = useQuery({
    queryKey: ["top-employers"],
    queryFn: async () => {
      const { data, error } = await supabase.from("top_employer_profiles").select("*").limit(5);
      if (error) throw error;
      return data;
    },
  });

  return (
    /* Parent: side-by-side on desktop (md grid), stacked on mobile/tablet */
    <div className="flex flex-col gap-6 [@media(min-width:830px)]:grid [@media(min-width:830px)]:grid-cols-2">
      {/* ── Top Athletes ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Athlete Profiles
          </CardTitle>
          <CardDescription>Most viewed athlete profiles</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden [@media(min-width:830px)]:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Sport</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {athletesLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : topAthletes && topAthletes.length > 0 ? (
                  topAthletes.map((athlete) => (
                    <TableRow key={athlete.id}>
                      <TableCell className="font-medium">{athlete.full_name}</TableCell>
                      <TableCell className="text-muted-foreground">{athlete.sport_discipline}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          {athlete.profile_views}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile / tablet cards */}
          <div className="flex flex-col gap-2 [@media(min-width:830px)]:hidden">
            {athletesLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border px-4 py-3 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))
            ) : topAthletes && topAthletes.length > 0 ? (
              topAthletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Views — top-right */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {athlete.profile_views}
                  </div>

                  <p className="pr-16 font-semibold text-sm text-foreground">{athlete.full_name}</p>
                  {athlete.sport_discipline && (
                    <p className="mt-0.5 text-xs text-muted-foreground">{athlete.sport_discipline}</p>
                  )}
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>

      {/* ── Top Employers ── */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-accent" />
            Top Employer Profiles
          </CardTitle>
          <CardDescription>Most viewed partner companies</CardDescription>
        </CardHeader>
        <CardContent>
          {/* Desktop table */}
          <div className="hidden [@media(min-width:830px)]:block">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Company</TableHead>
                  <TableHead>Industry</TableHead>
                  <TableHead className="text-right">Views</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {employersLoading ? (
                  Array.from({ length: 5 }).map((_, i) => (
                    <TableRow key={i}>
                      <TableCell>
                        <Skeleton className="h-4 w-32" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-24" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-16 ml-auto" />
                      </TableCell>
                    </TableRow>
                  ))
                ) : topEmployers && topEmployers.length > 0 ? (
                  topEmployers.map((employer) => (
                    <TableRow key={employer.id}>
                      <TableCell className="font-medium">{employer.company_name}</TableCell>
                      <TableCell className="text-muted-foreground">{employer.industry}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Eye className="h-3 w-3 text-muted-foreground" />
                          {employer.profile_views}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={3} className="text-center text-muted-foreground">
                      No data available
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>

          {/* Mobile / tablet cards */}
          <div className="flex flex-col gap-2 [@media(min-width:830px)]:hidden">
            {employersLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="rounded-xl border border-border px-4 py-3 space-y-1.5">
                  <Skeleton className="h-4 w-36" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))
            ) : topEmployers && topEmployers.length > 0 ? (
              topEmployers.map((employer) => (
                <div
                  key={employer.id}
                  className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Views — top-right */}
                  <div className="absolute top-3 right-3 flex items-center gap-1 text-xs text-muted-foreground">
                    <Eye className="h-3 w-3" />
                    {employer.profile_views}
                  </div>

                  <p className="pr-16 font-semibold text-sm text-foreground">{employer.company_name}</p>
                  {employer.industry && <p className="mt-0.5 text-xs text-muted-foreground">{employer.industry}</p>}
                </div>
              ))
            ) : (
              <p className="py-6 text-center text-sm text-muted-foreground">No data available</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
