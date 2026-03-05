import { useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { format, isWithinInterval, subDays } from "date-fns";
import { useQuery } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock } from "lucide-react";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useState } from "react";

// ==============================
// Types
// ==============================

interface ActivityRow {
  id: string;
  counterpartName: string;
  counterpartEmail: string | null;
  message: string | null;
  opportunityType: string | null;
  status: string;
  direction: "outbound" | "inbound";
  createdAt: string;
  isNew: boolean;
}

interface ConnectionActivityBoardProps {
  profileId: string;
  profileType: "athlete" | "employer";
  userId: string;
}

// ==============================
// Query functions
// ==============================

const fetchAthleteActivity = async (profileId: string, userId: string): Promise<ActivityRow[]> => {
  const { data, error } = await supabase
    .from("connection_requests")
    .select(`
      id,
      message,
      opportunity_type,
      status,
      created_at,
      initiated_by_user_id,
      employer_profiles (
        company_name,
        contact_email
      )
    `)
    .eq("athlete_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const sevenDaysAgo = subDays(new Date(), 7);

  return (data ?? []).map((row) => {
    const ep = row.employer_profiles as { company_name: string; contact_email: string | null } | null;
    return {
      id: row.id,
      counterpartName: ep?.company_name ?? "Unknown Company",
      counterpartEmail: ep?.contact_email ?? null,
      message: row.message,
      opportunityType: row.opportunity_type,
      status: row.status ?? "pending",
      direction: row.initiated_by_user_id === userId ? "outbound" : "inbound",
      createdAt: row.created_at,
      isNew: isWithinInterval(new Date(row.created_at), { start: sevenDaysAgo, end: new Date() }),
    };
  });
};

const fetchEmployerActivity = async (profileId: string, userId: string): Promise<ActivityRow[]> => {
  const { data, error } = await supabase
    .from("connection_requests")
    .select(`
      id,
      message,
      opportunity_type,
      status,
      created_at,
      initiated_by_user_id,
      athlete_profiles (
        email,
        profiles (
          full_name
        )
      )
    `)
    .eq("employer_id", profileId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  const sevenDaysAgo = subDays(new Date(), 7);

  return (data ?? []).map((row) => {
    const ap = row.athlete_profiles as {
      email: string | null;
      profiles: { full_name: string | null } | null;
    } | null;
    return {
      id: row.id,
      counterpartName: ap?.profiles?.full_name ?? "Unknown Athlete",
      counterpartEmail: ap?.email ?? null,
      message: row.message,
      opportunityType: row.opportunity_type,
      status: row.status ?? "pending",
      direction: row.initiated_by_user_id === userId ? "outbound" : "inbound",
      createdAt: row.created_at,
      isNew: isWithinInterval(new Date(row.created_at), { start: sevenDaysAgo, end: new Date() }),
    };
  });
};

// ==============================
// Group rows by date label
// ==============================
const groupByDate = (rows: ActivityRow[]): { label: string; items: ActivityRow[] }[] => {
  const groups: Record<string, ActivityRow[]> = {};
  rows.forEach((row) => {
    const label = format(new Date(row.createdAt), "MMMM d, yyyy");
    if (!groups[label]) groups[label] = [];
    groups[label].push(row);
  });
  return Object.entries(groups).map(([label, items]) => ({ label, items }));
};

// ==============================
// Status pill
// ==============================
const StatusPill = ({ status }: { status: string }) => {
  if (status === "accepted") {
    return (
      <Badge variant="default" className="bg-green-500/15 text-green-700 dark:text-green-400 border-0 gap-1">
        <CheckCircle2 className="h-3 w-3" />
        Connected
      </Badge>
    );
  }
  return (
    <Badge variant="secondary" className="gap-1">
      <Clock className="h-3 w-3" />
      Pending
    </Badge>
  );
};

// ==============================
// Direction icon
// ==============================
const DirectionIcon = ({ direction }: { direction: "inbound" | "outbound" }) =>
  direction === "outbound" ? (
    <ArrowUpRight className="h-3.5 w-3.5 text-primary" />
  ) : (
    <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground" />
  );

// ==============================
// Main Component
// ==============================

export const ConnectionActivityBoard = ({ profileId, profileType, userId }: ConnectionActivityBoardProps) => {
  const [filter, setFilter] = useState<"all" | "new" | "existing">("all");

  const queryKey = ["connection-activity", profileType, profileId];
  const queryFn =
    profileType === "athlete"
      ? () => fetchAthleteActivity(profileId, userId)
      : () => fetchEmployerActivity(profileId, userId);

  const { data: rows = [], isLoading } = useQuery<ActivityRow[]>({
    queryKey,
    queryFn,
    staleTime: 2 * 60 * 1000,
  });

  const filtered = useMemo(() => {
    if (filter === "new") return rows.filter((r) => r.isNew);
    if (filter === "existing") return rows.filter((r) => !r.isNew);
    return rows;
  }, [rows, filter]);

  const groups = useMemo(() => groupByDate(filtered), [filtered]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter tabs */}
      <div className="flex items-center justify-between gap-3">
        <Tabs value={filter} onValueChange={(v) => setFilter(v as "all" | "new" | "existing")}>
          <TabsList>
            <TabsTrigger value="all">All ({rows.length})</TabsTrigger>
            <TabsTrigger value="new">New ({rows.filter((r) => r.isNew).length})</TabsTrigger>
            <TabsTrigger value="existing">Existing ({rows.filter((r) => !r.isNew).length})</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      {groups.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <p className="text-sm">No connection activity yet.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {groups.map(({ label, items }) => (
            <div key={label}>
              {/* Date header */}
              <div className="flex items-center gap-3 mb-2">
                <div className="h-px flex-1 bg-border" />
                <span className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</span>
                <div className="h-px flex-1 bg-border" />
              </div>

              <div className="rounded-lg border overflow-hidden">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-[180px]">
                        {profileType === "athlete" ? "Partner" : "Athlete"}
                      </TableHead>
                      <TableHead className="hidden md:table-cell">Email</TableHead>
                      <TableHead className="hidden lg:table-cell">Opportunity</TableHead>
                      <TableHead>Message</TableHead>
                      <TableHead className="w-[90px]">Status</TableHead>
                      <TableHead className="w-[80px] text-right">Time</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {items.map((row) => (
                      <TableRow key={row.id}>
                        {/* Name + direction + new badge */}
                        <TableCell>
                          <div className="flex items-start gap-1.5">
                            <DirectionIcon direction={row.direction} />
                            <div className="min-w-0">
                              <p className="font-medium text-sm leading-tight truncate max-w-[140px]">
                                {row.counterpartName}
                              </p>
                              {row.isNew && (
                                <Badge className="mt-0.5 h-4 text-[10px] px-1.5 bg-primary/15 text-primary border-0">
                                  New
                                </Badge>
                              )}
                            </div>
                          </div>
                        </TableCell>

                        {/* Email */}
                        <TableCell className="hidden md:table-cell">
                          {row.counterpartEmail ? (
                            <a
                              href={`mailto:${row.counterpartEmail}`}
                              className="text-xs text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {row.counterpartEmail}
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        {/* Opportunity */}
                        <TableCell className="hidden lg:table-cell">
                          <span className="text-xs text-muted-foreground">
                            {row.opportunityType ?? "—"}
                          </span>
                        </TableCell>

                        {/* Message */}
                        <TableCell>
                          {row.message ? (
                            <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">
                              {row.message}
                            </p>
                          ) : (
                            <span className="text-xs text-muted-foreground/50">—</span>
                          )}
                        </TableCell>

                        {/* Status */}
                        <TableCell>
                          <StatusPill status={row.status} />
                        </TableCell>

                        {/* Time */}
                        <TableCell className="text-right">
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {format(new Date(row.createdAt), "h:mm a")}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
