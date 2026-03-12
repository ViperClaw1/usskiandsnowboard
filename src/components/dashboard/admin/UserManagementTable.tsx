import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2 } from "lucide-react";

export const UserManagementTable = () => {
  const { data: users, isLoading } = useQuery({
    queryKey: ["all-users"],
    queryFn: async () => {
      const { data: profiles, error: profilesError } = await supabase
        .from("profiles")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(10);

      if (profilesError) throw profilesError;

      const { data: roles, error: rolesError } = await supabase.from("user_roles").select("*");

      if (rolesError) throw rolesError;

      const { data: employers, error: employersError } = await supabase
        .from("employer_profiles")
        .select("user_id, company_name");

      if (employersError) throw employersError;

      const employerByUserId = (employers ?? []).reduce<Record<string, string>>((acc, row) => {
        acc[row.user_id] = row.company_name ?? "";
        return acc;
      }, {});

      return profiles.map((profile) => ({
        ...profile,
        role: roles.find((r) => r.user_id === profile.id)?.role || "none",
        companyName: employerByUserId[profile.id] ?? null,
      }));
    },
  });

  const getRoleVariant = (role: string) =>
    role === "admin" ? "destructive" : role === "athlete" ? "default" : role === "employer" ? "secondary" : "outline";

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Users</CardTitle>
        <CardDescription>Latest user registrations</CardDescription>
      </CardHeader>
      <CardContent>
        {/* ── Desktop table (≥ 830 px) ── */}
        <div className="hidden [@media(min-width:830px)]:block overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Company Name</TableHead>
                <TableHead>Joined</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-40" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-20" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-32" />
                    </TableCell>
                    <TableCell>
                      <Skeleton className="h-4 w-24" />
                    </TableCell>
                  </TableRow>
                ))
              ) : users && users.length > 0 ? (
                users.map((user) => (
                  <TableRow key={user.id}>
                    <TableCell className="font-medium">{user.full_name || "N/A"}</TableCell>
                    <TableCell>{user.email}</TableCell>
                    <TableCell>
                      <Badge variant={getRoleVariant(user.role)}>{user.role}</Badge>
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {user.role === "employer" && (user as { companyName?: string | null }).companyName
                        ? (user as { companyName: string }).companyName
                        : "—"}
                    </TableCell>
                    <TableCell className="text-muted-foreground">
                      {format(new Date(user.created_at), "MMM dd, yyyy")}
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground">
                    No users found
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>

        {/* ── Mobile / tablet card list (< 830 px) ── */}
        <div className="flex flex-col gap-3 [@media(min-width:830px)]:hidden">
          {isLoading ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="rounded-xl border border-border px-4 py-3 space-y-2">
                <Skeleton className="h-4 w-40" />
                <Skeleton className="h-3 w-56" />
                <Skeleton className="h-3 w-24" />
              </div>
            ))
          ) : users && users.length > 0 ? (
            users.map((user) => {
              const companyName =
                user.role === "employer" ? (user as { companyName?: string | null }).companyName : null;
              return (
                <div
                  key={user.id}
                  className="relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Joined date — top-right */}
                  <div className="absolute top-3 right-3 text-xs text-muted-foreground">
                    {format(new Date(user.created_at), "MMM d, yyyy")}
                  </div>

                  {/* Name */}
                  <p className="pr-24 font-semibold text-sm leading-snug text-foreground">{user.full_name || "N/A"}</p>

                  {/* Email + company */}
                  <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted-foreground">
                    <span>{user.email}</span>
                    {companyName && (
                      <span className="inline-flex items-center gap-1 font-medium text-foreground/70">
                        <Building2 className="h-3 w-3 shrink-0" />
                        {companyName}
                      </span>
                    )}
                  </div>

                  {/* Role badge */}
                  <div className="mt-2">
                    <Badge variant={getRoleVariant(user.role)} className="text-xs capitalize">
                      {user.role}
                    </Badge>
                  </div>
                </div>
              );
            })
          ) : (
            <p className="py-8 text-center text-sm text-muted-foreground">No users found</p>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
