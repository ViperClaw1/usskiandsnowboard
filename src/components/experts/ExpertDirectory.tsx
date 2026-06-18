import { useState, useMemo, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { useUserRole } from "@/hooks/useUserRole";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { ProfileCardSkeleton } from "@/components/ui/skeleton-card";
import { Search, X, Linkedin, ImagePlus } from "lucide-react";
import { ExpertConnectionRequestDialog } from "./ExpertConnectionRequestDialog";
import { INDUSTRY_OPTIONS } from "@/data/suggestions";
import usLogo from "@/assets/us-logo-new.png";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

// ==============================
// Types
// ==============================
export interface ExpertProfile {
  id: string;
  user_id: string;
  full_name: string;
  job_title: string | null;
  area_of_expertise: string | null;
  bio: string | null;
  photo_url: string | null;
  background_image_url: string | null;
  industry: string | null;
  is_alum: boolean | null;
  ussa_affiliate: string | null;
  linkedin_url: string | null;
  email: string | null;
  is_public: boolean | null;
  created_at: string | null;
}


// ==============================
// Helpers
// ==============================
function getInitials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((n) => n[0].toUpperCase())
    .join("");
}

function getPrimaryIndustry(industry: string | null): string | null {
  if (!industry) return null;
  const first = industry
    .split(",")
    .map((v) => v.trim())
    .find(Boolean);
  return first || null;
}

// ==============================
// Fetch
// ==============================
const fetchExperts = async (): Promise<ExpertProfile[]> => {
  const { data, error } = await supabase
    .from("expert_profiles")
    .select("*")
    // Legacy expert rows may have is_public = null. Treat null as public.
    .or("is_public.is.true,is_public.is.null")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as ExpertProfile[];
};

// ==============================
// Component
// ==============================
interface ExpertDirectoryProps {
  adminMode?: boolean;
  onAddExpert?: () => void;
}

const DirectoryLoadingSkeleton = () => (
  <div className="space-y-6">
    <div className="flex flex-col sm:flex-row gap-3">
      <Skeleton className="h-10 flex-1" />
      <Skeleton className="h-10 w-full sm:w-56" />
    </div>
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      <ProfileCardSkeleton />
      <ProfileCardSkeleton />
      <ProfileCardSkeleton />
    </div>
  </div>
);

export const ExpertDirectory = ({ adminMode = false, onAddExpert }: ExpertDirectoryProps) => {
  const { user } = useAuth();
  const { role } = useUserRole(user?.id);

  const [search, setSearch] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("all");
  const [filterAffiliation, setFilterAffiliation] = useState("all");
  const [selectedExpert, setSelectedExpert] = useState<ExpertProfile | null>(null);
  const [connectionDialogExpert, setConnectionDialogExpert] = useState<ExpertProfile | null>(null);
  

  const { data: experts = [], isLoading } = useQuery({
    queryKey: ["expert-profiles"],
    queryFn: fetchExperts,
  });

  // Existing requests by this athlete
  const { data: existingRequests = [] } = useQuery({
    queryKey: ["expert-requests", user?.id],
    queryFn: async () => {
      if (!user || role !== "athlete") return [];
      const { data: ap } = await supabase.from("athlete_profiles").select("id").eq("user_id", user.id).maybeSingle();
      if (!ap) return [];
      const { data } = await supabase
        .from("expert_connection_requests")
        .select("expert_id, status")
        .eq("athlete_id", ap.id);
      return data ?? [];
    },
    enabled: !!user && role === "athlete",
  });

  const requestStatusMap = useMemo(() => {
    const m: Record<string, string> = {};
    existingRequests.forEach((r: { expert_id: string; status: string }) => {
      m[r.expert_id] = r.status;
    });
    return m;
  }, [existingRequests]);

  const filtered = useMemo(() => {
    let res = experts;
    if (search.trim()) {
      const s = search.toLowerCase();
      res = res.filter(
        (e) =>
          e.full_name.toLowerCase().includes(s) ||
          e.job_title?.toLowerCase().includes(s) ||
          e.area_of_expertise?.toLowerCase().includes(s),
      );
    }
    if (filterIndustry !== "all") {
      res = res.filter((e) =>
        e.industry
          ?.split(",")
          .map((v) => v.trim())
          .includes(filterIndustry),
      );
    }
    if (filterAffiliation !== "all") {
      if (filterAffiliation === "Athlete Alum") {
        res = res.filter((e) => e.is_alum);
      } else {
        res = res.filter(
          (e) => (e.ussa_affiliate ?? "").toLowerCase() === filterAffiliation.toLowerCase(),
        );
      }
    }
    // Sort: experts created within the last 30 days first (newest first), then the rest by created_at desc
    const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;
    const now = Date.now();
    const isNewExpert = (e: ExpertProfile) =>
      e.created_at ? now - new Date(e.created_at).getTime() <= THIRTY_DAYS_MS : false;
    res = [...res].sort((a, b) => {
      const aNew = isNewExpert(a) ? 1 : 0;
      const bNew = isNewExpert(b) ? 1 : 0;
      if (aNew !== bNew) return bNew - aNew;
      const at = a.created_at ? new Date(a.created_at).getTime() : 0;
      const bt = b.created_at ? new Date(b.created_at).getTime() : 0;
      return bt - at;
    });
    return res;
  }, [experts, search, filterIndustry, filterAffiliation]);


  const totalFilteredExperts = filtered.length;
  const { visibleCount, sentinelRef, hasMore } = useInfiniteScroll(totalFilteredExperts, [
    search,
    filterIndustry,
    filterAffiliation,
  ]);

  const paginatedExperts = useMemo(() => filtered.slice(0, visibleCount), [filtered, visibleCount]);

  // Make the device Back button close the expert dialog instead of leaving /experts.
  useEffect(() => {
    if (!selectedExpert) return;
    window.history.pushState({ expertDialog: true }, "");
    const onPop = () => setSelectedExpert(null);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // If our temporary entry is still on top, pop it so we don't leave junk in history.
      if (window.history.state && (window.history.state as { expertDialog?: boolean }).expertDialog) {
        window.history.back();
      }
    };
  }, [selectedExpert]);


  const canRequest = role === "athlete";

  if (isLoading) return <DirectoryLoadingSkeleton />;

  return (
    <div className="space-y-6">
      {/* Controls */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search experts by name or expertise..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Select value={filterIndustry} onValueChange={setFilterIndustry}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filter by industry" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Industries</SelectItem>
            {INDUSTRY_OPTIONS.map((ind) => (
              <SelectItem key={ind} value={ind}>
                {ind}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={filterAffiliation} onValueChange={setFilterAffiliation}>
          <SelectTrigger className="w-full sm:w-56">
            <SelectValue placeholder="Filter by USSS Affiliation" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All USSS Affiliations</SelectItem>
            <SelectItem value="Athlete Alum">Athlete Alum</SelectItem>
            <SelectItem value="Trustee">Trustee</SelectItem>
            <SelectItem value="Ambassador">Ambassador</SelectItem>
            <SelectItem value="Next Gen">Next Gen</SelectItem>
          </SelectContent>
        </Select>
        {(filterIndustry !== "all" || filterAffiliation !== "all" || search) && (
          <Button
            variant="outline"
            size="icon"
            onClick={() => {
              setSearch("");
              setFilterIndustry("all");
              setFilterAffiliation("all");
            }}
          >
            <X className="h-4 w-4" />
          </Button>
        )}
        {adminMode && onAddExpert && <Button onClick={onAddExpert}>+ Add Expert</Button>}
      </div>

      {/* Grid */}
      {filtered.length === 0 ? (
        <div className="text-center py-16 text-muted-foreground">No experts found.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-stretch">
          {paginatedExperts.map((expert) => {
            const requestStatus = requestStatusMap[expert.id];
            return (
              <Card
                key={expert.id}
                className="h-full cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50 flex flex-col"
                onClick={async () => {
                  setSelectedExpert(expert);
                  try {
                    await supabase.rpc("increment_expert_profile_views", {
                      expert_profile_id: expert.id,
                    });
                  } catch (error) {
                    console.error("Error tracking expert view:", error);
                  }
                }}
              >
                <CardContent className="p-5 flex flex-col flex-1 items-center text-center gap-3">
                  <Avatar className="h-24 w-24">
                    <AvatarImage src={expert.photo_url ?? undefined} alt={expert.full_name} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xl font-semibold">
                      {getInitials(expert.full_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="space-y-1">
                    <p className="text-lg font-semibold text-foreground">{expert.full_name}</p>
                    {expert.job_title && <p className="text-sm text-muted-foreground">{expert.job_title}</p>}
                    {expert.area_of_expertise && (
                      <p className="text-xs text-primary font-medium">{expert.area_of_expertise}</p>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-1 justify-center">
                    {expert.created_at &&
                      Date.now() - new Date(expert.created_at).getTime() <= 30 * 24 * 60 * 60 * 1000 && (
                        <Badge className="text-xs bg-emerald-500 text-white border-transparent hover:bg-emerald-500">
                          New
                        </Badge>
                      )}
                    {getPrimaryIndustry(expert.industry) && (
                      <Badge variant="secondary" className="text-xs">
                        {getPrimaryIndustry(expert.industry)}
                      </Badge>
                    )}
                    {expert.ussa_affiliate && (
                      <Badge className="text-xs bg-primary/10 text-primary border-primary/20">
                        <img src={usLogo} alt="" className="h-3.5 w-3.5 object-contain mr-1" />
                        {expert.ussa_affiliate}
                      </Badge>
                    )}
                  </div>

                  {expert.bio && <p className="text-xs text-muted-foreground line-clamp-2">{expert.bio}</p>}
                  {canRequest && (
                    <Button
                      size="sm"
                      className="w-full mt-auto"
                      variant={requestStatus === "accepted" ? "default" : "outline"}
                      disabled={!!requestStatus}
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!requestStatus) setConnectionDialogExpert(expert);
                      }}
                    >
                      {requestStatus === "pending"
                        ? "Request Sent"
                        : requestStatus === "accepted"
                          ? "✓ Connected"
                          : "Request a Connection"}
                    </Button>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      {totalFilteredExperts > 0 && (
        <>
          <div ref={sentinelRef} aria-hidden className="h-1" />
          <p className="text-center text-sm text-muted-foreground">
            {hasMore
              ? `Loading more… (showing ${paginatedExperts.length} of ${totalFilteredExperts})`
              : `Showing all ${totalFilteredExperts} matching experts`}
          </p>
        </>
      )}

      {/* Expert Detail Dialog */}
      {selectedExpert && (
        <Dialog open={!!selectedExpert} onOpenChange={(o) => !o && setSelectedExpert(null)}>
          <DialogContent className="sm:max-w-lg p-0 overflow-hidden max-h-[50vh] sm:max-h-[90vh] w-[calc(100vw-1rem)] sm:w-full flex flex-col gap-0">
            {/* Banner (fixed, doesn't scroll) */}
            {selectedExpert.background_image_url && (
              <div
                className="h-28 shrink-0 bg-cover bg-center"
                style={{ backgroundImage: `url(${selectedExpert.background_image_url})` }}
              />
            )}

            <div className={`flex-1 overflow-y-auto px-6 pb-6 space-y-4 ${selectedExpert.background_image_url ? "-mt-8" : "pt-6"}`}>
              <div className="flex items-end gap-4">
                <Avatar className="h-16 w-16 border-4 border-background shadow">
                  <AvatarImage src={selectedExpert.photo_url ?? undefined} alt={selectedExpert.full_name} />
                  <AvatarFallback className="bg-primary/10 text-primary text-lg font-semibold">
                    {getInitials(selectedExpert.full_name)}
                  </AvatarFallback>
                </Avatar>
                <div className="pb-1 bg-background px-3 py-2 rounded-md shadow-sm">
                  <p className="text-lg leading-tight font-semibold">{selectedExpert.full_name}</p>
                  {selectedExpert.job_title && (
                    <p className="text-sm text-muted-foreground">{selectedExpert.job_title}</p>
                  )}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {selectedExpert.industry && <Badge variant="secondary">{selectedExpert.industry}</Badge>}
                {selectedExpert.ussa_affiliate && (
                  <Badge className="bg-primary/10 text-primary border-primary/20">
                    <img src={usLogo} alt="" className="h-3.5 w-3.5 object-contain mr-1" />
                    {selectedExpert.ussa_affiliate}
                  </Badge>
                )}
              </div>

              {selectedExpert.area_of_expertise && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">
                    Area of Expertise
                  </p>
                  <p className="text-sm text-foreground">{selectedExpert.area_of_expertise}</p>
                </div>
              )}

              {selectedExpert.bio && (
                <div>
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-1">About</p>
                  <p className="text-sm text-foreground leading-relaxed">{selectedExpert.bio}</p>
                </div>
              )}

              {selectedExpert.linkedin_url && (
                <a
                  href={selectedExpert.linkedin_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 text-sm text-primary hover:underline"
                >
                  <Linkedin className="h-4 w-4" />
                  LinkedIn Profile
                </a>
              )}

              {canRequest &&
                (() => {
                  const rs = requestStatusMap[selectedExpert.id];
                  return (
                    <Button
                      className="w-full"
                      variant={rs === "pending" ? "outline" : rs === "accepted" ? "secondary" : "default"}
                      disabled={!!rs}
                      onClick={() => {
                        if (!rs) {
                          setSelectedExpert(null);
                          setConnectionDialogExpert(selectedExpert);
                        }
                      }}
                    >
                      {rs === "pending" ? "Request Sent" : rs === "accepted" ? "✓ Connected" : "Request a Connection"}
                    </Button>
                  );
                })()}

              <Button variant="outline" className="w-full" onClick={() => setSelectedExpert(null)}>
                Close
              </Button>
            </div>
          </DialogContent>

        </Dialog>
      )}

      {/* Connection Request Dialog */}
      {connectionDialogExpert && user && (
        <ExpertConnectionRequestDialog
          expert={connectionDialogExpert}
          userId={user.id}
          open={!!connectionDialogExpert}
          onOpenChange={(o) => !o && setConnectionDialogExpert(null)}
          onSuccess={() => setConnectionDialogExpert(null)}
        />
      )}
    </div>
  );
};
