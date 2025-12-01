import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Eye, TrendingUp } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
export const TopProfilesTable = () => {
  const {
    data: topAthletes,
    isLoading: athletesLoading
  } = useQuery({
    queryKey: ['top-athletes'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('top_athlete_profiles').select('*').limit(5);
      if (error) throw error;
      return data;
    }
  });
  const {
    data: topEmployers,
    isLoading: employersLoading
  } = useQuery({
    queryKey: ['top-employers'],
    queryFn: async () => {
      const {
        data,
        error
      } = await supabase.from('top_employer_profiles').select('*').limit(5);
      if (error) throw error;
      return data;
    }
  });
  return <div className="grid gap-6 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-primary" />
            Top Athlete Profiles
          </CardTitle>
          <CardDescription>Most viewed athlete profiles</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Sport</TableHead>
                <TableHead className="text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {athletesLoading ? Array.from({
              length: 5
            }).map((_, i) => <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>) : topAthletes && topAthletes.length > 0 ? topAthletes.map(athlete => <TableRow key={athlete.id}>
                    <TableCell className="font-medium">{athlete.full_name}</TableCell>
                    <TableCell className="text-muted-foreground">{athlete.sport_discipline}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        {athlete.profile_views}
                      </div>
                    </TableCell>
                  </TableRow>) : <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No data available
                  </TableCell>
                </TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">Top Partners Profiles<TrendingUp className="h-5 w-5 text-accent" />
            Top Employer Profiles
          </CardTitle>
          <CardDescription>Most viewed partner companies</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Company</TableHead>
                <TableHead>Industry</TableHead>
                <TableHead className="text-right">Views</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {employersLoading ? Array.from({
              length: 5
            }).map((_, i) => <TableRow key={i}>
                    <TableCell><Skeleton className="h-4 w-32" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-24" /></TableCell>
                    <TableCell><Skeleton className="h-4 w-16 ml-auto" /></TableCell>
                  </TableRow>) : topEmployers && topEmployers.length > 0 ? topEmployers.map(employer => <TableRow key={employer.id}>
                    <TableCell className="font-medium">{employer.company_name}</TableCell>
                    <TableCell className="text-muted-foreground">{employer.industry}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Eye className="h-3 w-3 text-muted-foreground" />
                        {employer.profile_views}
                      </div>
                    </TableCell>
                  </TableRow>) : <TableRow>
                  <TableCell colSpan={3} className="text-center text-muted-foreground">
                    No data available
                  </TableCell>
                </TableRow>}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>;
};