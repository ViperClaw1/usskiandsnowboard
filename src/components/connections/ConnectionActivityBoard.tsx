import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { LoadingSpinner } from "@/components/ui/loading-spinner";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { format, formatDistanceToNow, isToday, isYesterday, isWithinInterval, subDays } from "date-fns";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowUpRight, ArrowDownLeft, CheckCircle2, Clock, Loader2, ChevronDown, ChevronUp, Mail } from "lucide-react";
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
    .select(
      `
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
    `,
    )
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
    .select(
      `
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
    `,
    )
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
// Date group label for feed separators
// ==============================
const getDateGroupLabel = (date: Date): string => {
  if (isToday(date)) return "Today";
  if (isYesterday(date)) return "Yesterday";
  return format(date, "MMMM d, yyyy");
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
    <ArrowUpRight className="h-3.5 w-3.5 text-primary shrink-0" />
  ) : (
    <ArrowDownLeft className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
  );

// ==============================
// Date separator (between feed cards when date changes)
// ==============================
const FeedDateSeparator = ({ label }: { label: string }) => (
  <div className="flex items-center gap-3 py-2">
    <div className="h-px flex-1 bg-border" />
    <span className="text-xs font-semibold text-muted-foreground uppercase tracking-wider px-1">{label}</span>
    <div className="h-px flex-1 bg-border" />
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

  const [actionRow, setActionRow] = useState<ActivityRow | null>(null);
  const [actionMessage, setActionMessage] = useState("");
  const [processing, setProcessing] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);

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

  useEffect(() => {
    const filter = profileType === "athlete" ? `athlete_id=eq.${profileId}` : `employer_id=eq.${profileId}`;

    const channel = supabase
      .channel(`activity-board-${profileId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "connection_requests", filter }, () =>
        queryClient.invalidateQueries({ queryKey }),
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profileId, profileType, queryClient]);

  const handleAccept = async () => {
    if (!actionRow) return;
    setProcessing(true);
    try {
      const { error } = await supabase
        .from("connection_requests")
        .update({ status: "accepted" })
        .eq("id", actionRow.id);
      if (error) throw error;

      // DB trigger on_connection_request_event fires send-connection-notification automatically
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

  // Single chronological feed: rows already sorted by created_at desc
  let lastDateLabel: string | null = null;

  return (
    <div className="space-y-1">
      <ul className="list-none p-0 m-0 space-y-1" role="list">
        {rows.map((row) => {
          const date = new Date(row.createdAt);
          const dateLabel = getDateGroupLabel(date);
          const showDateSeparator = dateLabel !== lastDateLabel;
          if (showDateSeparator) lastDateLabel = dateLabel;

          const canReview = row.direction === "inbound" && row.status === "pending";
          const isExpanded = expandedId === row.id;

          return (
            <li key={row.id} className="list-none" role="listitem">
              {showDateSeparator && <FeedDateSeparator label={dateLabel} />}

              <Card
                className={`overflow-hidden transition-colors hover:bg-muted/30 ${
                  row.isNew ? "border-l-4 border-l-primary" : ""
                }`}
              >
                <CardContent className="p-4">
                  <div className="flex flex-col gap-3">
                    {/* Top row: direction, name, badges, time, actions */}
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <DirectionIcon direction={row.direction} />
                        <div className="min-w-0">
                          <p className="font-medium text-sm truncate">{row.counterpartName}</p>
                          <div className="flex items-center gap-1.5 flex-wrap mt-0.5">
                            {row.isNew && (
                              <Badge className="h-4 text-[10px] px-1.5 bg-primary/15 text-primary border-0">New</Badge>
                            )}
                            <StatusPill status={row.status} />
                            <span className="text-xs text-muted-foreground">
                              {formatDistanceToNow(date, { addSuffix: true })}
                            </span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {canReview && (
                          <Button
                            size="sm"
                            variant="default"
                            className="h-9 min-w-[72px]"
                            onClick={() => {
                              setActionRow(row);
                              setActionMessage("");
                            }}
                          >
                            Review
                          </Button>
                        )}
                        {row.message && (
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-9 w-9 p-0"
                            onClick={() => setExpandedId(isExpanded ? null : row.id)}
                            aria-expanded={isExpanded}
                            aria-label={isExpanded ? "Collapse message" : "Expand message"}
                          >
                            {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Opportunity type */}
                    {row.opportunityType && (
                      <p className="text-xs text-muted-foreground">
                        <span className="font-medium">Opportunity:</span> {row.opportunityType}
                      </p>
                    )}

                    {/* Message preview or full */}
                    {row.message && (
                      <div className="text-sm">
                        {isExpanded ? (
                          <p className="text-muted-foreground whitespace-pre-wrap rounded-md bg-muted/50 p-3 border">
                            {row.message}
                          </p>
                        ) : (
                          <p className="text-muted-foreground line-clamp-2">{row.message}</p>
                        )}
                      </div>
                    )}

                    {/* Email link */}
                    {row.counterpartEmail && (
                      <a
                        href={`mailto:${row.counterpartEmail}`}
                        className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors w-fit"
                      >
                        <Mail className="h-3.5 w-3.5" />
                        {row.counterpartEmail}
                      </a>
                    )}
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ul>

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
            <div className="rounded-md bg-muted/50 p-3 text-sm text-muted-foreground border">"{actionRow.message}"</div>
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
            <Button className="flex-1 min-h-[44px]" onClick={handleAccept} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Accept"}
            </Button>
            <Button variant="outline" className="flex-1 min-h-[44px]" onClick={handleDecline} disabled={processing}>
              {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : "Decline"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};
