import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, isWithinInterval, subDays } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  onActionComplete?: () => void;
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
// Section divider
// ==============================
const SectionDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 my-4">
    <div className="h-px flex-1 bg-border" />
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{label}</span>
    <div className="h-px flex-1 bg-border" />
  </div>
);

// ==============================
// Date divider inside a section
// ==============================
const DateDivider = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 mb-2">
    <div className="h-px flex-1 bg-border/50" />
    <span className="text-xs font-medium text-muted-foreground/70 uppercase tracking-wide">{label}</span>
    <div className="h-px flex-1 bg-border/50" />
  </div>
);

// ==============================
// Main Component
// ==============================

export const ConnectionActivityBoard = ({
  profileId,
  profileType,
  userId,
  onActionComplete,
}: ConnectionActivityBoardProps) => {
  const queryClient = useQueryClient();

  // ==============================
  // State — inline action dialog
  // ==============================
  const [actionRow, setActionRow] = useState<ActivityRow | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [processing, setProcessing] = useState(false);

  // ==============================
  // Data fetching
  // ==============================
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

  // ==============================
  // Realtime subscription — invalidates query on any change
  // ==============================
  useEffect(() => {
    const filter =
      profileType === "athlete" ? `athlete_id=eq.${profileId}` : `employer_id=eq.${profileId}`;

    const channel = supabase
      .channel(`activity-board-${profileId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "connection_requests", filter },
        () => queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, profileType, queryClient]);

  // ==============================
  // Derived — split into new / existing, each sorted desc
  // ==============================
  const newRows = [...rows.filter((r) => r.isNew)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );
  const existingRows = [...rows.filter((r) => !r.isNew)].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime(),
  );

  const existingGroups = groupByDate(existingRows);

  // ==============================
  // Handlers — accept / decline from activity board
  // ==============================
  const handleAccept = async () => {
    if (!actionRow) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("connection_requests")
        .update({ status: "accepted" })
        .eq("id", actionRow.id);
      if (error) throw error;

      // Send notification
      try {
        await supabase.functions.invoke("send-connection-notification", {
          body: { notification_type: "request_accepted", request_id: actionRow.id },
        });
      } catch (e) {
        console.error("Notification error:", e);
      }

      toast.success(`Connected with ${actionRow.counterpartName}`);
      queryClient.invalidateQueries({ queryKey });
      onActionComplete?.();
      setActionRow(null);
      setActionMessage("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to accept request");
    } finally {
      setProcessing(false);
    }
  };

  const handleDecline = async () => {
    if (!actionRow) return;
    setProcessing(true);
    try {
      const { error } = await supabase.from("connection_requests").delete().eq("id", actionRow.id);
      if (error) throw error;

      toast.success("Request declined");
      queryClient.invalidateQueries({ queryKey });
      onActionComplete?.();
      setActionRow(null);
      setActionMessage("");
    } catch (err) {
      console.error(err);
      toast.error("Failed to decline request");
    } finally {
      setProcessing(false);
    }
  };

  // ==============================
  // Render
  // ==============================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner />
      </div>
    );
  }

  if (rows.length === 0) {
    return (
      <div className="text-center py-12 text-muted-foreground">
        <p className="text-sm">No connection activity yet.</p>
      </div>
    );
  }

  const renderTable = (items: ActivityRow[], highlighted: boolean) => (
    <div className={`rounded-lg border overflow-hidden ${highlighted ? "border-primary/30" : ""}`}>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="w-[180px]">
              {profileType === "athlete" ? "Partner" : "Athlete"}
            </TableHead>
            <TableHead className="hidden md:table-cell">Email</TableHead>
            <TableHead className="hidden lg:table-cell">Opportunity</TableHead>
            <TableHead>Message</TableHead>
            <TableHead className="w-[100px]">Status</TableHead>
            <TableHead className="w-[80px] text-right">Time</TableHead>
            {highlighted && <TableHead className="w-[160px] text-right">Actions</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((row) => {
            const canAct = highlighted && row.direction === "inbound" && row.status === "pending";
            return (
              <TableRow
                key={row.id}
                className={
                  highlighted
                    ? "bg-primary/5 border-l-2 border-l-primary hover:bg-primary/10 transition-colors"
                    : undefined
                }
              >
                {/* Name + direction + new badge */}
                <TableCell>
                  <div className="flex items-start gap-1.5">
                    <DirectionIcon direction={row.direction} />
                    <div className="min-w-0">
                      <p className="font-medium text-sm leading-tight truncate max-w-[140px]">
                        {row.counterpartName}
                      </p>
                      {highlighted && (
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
                  <span className="text-xs text-muted-foreground">{row.opportunityType ?? "—"}</span>
                </TableCell>

                {/* Message */}
                <TableCell>
                  {row.message ? (
                    <p className="text-xs text-muted-foreground line-clamp-2 max-w-[200px]">{row.message}</p>
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

                {/* Inline actions (new inbound pending only) */}
                {highlighted && (
                  <TableCell className="text-right">
                    {canAct ? (
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 px-2"
                        onClick={() => {
                          setActionRow(row);
                          setActionMessage("");
                        }}
                      >
                        Review
                      </Button>
                    ) : (
                      <span className="text-xs text-muted-foreground/50">—</span>
                    )}
                  </TableCell>
                )}
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );

  return (
    <div className="space-y-2">
      {/* ---- New section ---- */}
      {newRows.length > 0 && (
        <>
          <SectionDivider label={`New (${newRows.length})`} />
          {renderTable(newRows, true)}
        </>
      )}

      {/* ---- Earlier section ---- */}
      {existingRows.length > 0 && (
        <>
          <SectionDivider label="Earlier" />
          <div className="space-y-6">
            {existingGroups.map(({ label, items }) => (
              <div key={label}>
                <DateDivider label={label} />
                {renderTable(items, false)}
              </div>
            ))}
          </div>
        </>
      )}

      {/* ---- Accept / Decline Dialog ---- */}
      <Dialog
        open={!!actionRow}
        onOpenChange={(open) => {
          if (!open) {
            setActionRow(null);
            setActionMessage("");
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Connection Request</DialogTitle>
            <DialogDescription>
              {actionRow?.counterpartName} sent you a connection request
              {actionRow?.opportunityType ? ` regarding "${actionRow.opportunityType}"` : ""}.
            </DialogDescription>
          </DialogHeader>

          {actionRow?.message && (
            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground border">
              "{actionRow.message}"
            </div>
          )}

          <div className="space-y-2">
            <Label htmlFor="response-message">Optional response message</Label>
            <Textarea
              id="response-message"
              placeholder="Add a message when accepting (optional)..."
              value={actionMessage}
              onChange={(e) => setActionMessage(e.target.value)}
              className="min-h-[80px]"
            />
          </div>

          <div className="flex gap-3 pt-2">
            <Button
              className="flex-1"
              onClick={handleAccept}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
            </Button>
            <Button
              variant="outline"
              className="flex-1"
              onClick={handleDecline}
              disabled={processing}
            >
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
