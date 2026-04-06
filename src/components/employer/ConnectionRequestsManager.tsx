import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Loader2, CheckCircle, XCircle, Instagram, Search } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface ConnectionRequest {
  id: string;
  athlete_id: string;
  employer_id: string;
  message: string | null;
  opportunity_type: string | null;
  created_at: string;
  initiated_by_athlete: boolean;
  athlete_profiles: {
    email: string | null;
    bio: string | null;
    sport_discipline: string[] | null;
    skills: string[] | null;
    photo_url: string | null;
    professional_highlights: string | null;
    years_of_membership: number | null;
    instagram_url: string | null;
    availability: string | null;
    career_interests: string[] | null;
    geographic_preferences: string[] | null;
    user_id: string;
    profiles: {
      full_name: string | null;
    };
  };
}

interface ConnectionRequestsManagerProps {
  employerProfileId: string;
}

const ConnectionRequestsManager = ({ employerProfileId }: ConnectionRequestsManagerProps) => {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ConnectionRequest | null>(null);
  const [processing, setProcessing] = useState(false);
  const [showAcceptDialog, setShowAcceptDialog] = useState(false);
  const [acceptanceMessage, setAcceptanceMessage] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("");

  useEffect(() => {
    if (employerProfileId) {
      loadRequests();
    }

    // Set up real-time subscription for connection requests
    const channel = supabase
      .channel('employer_connection_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `employer_id=eq.${employerProfileId}`
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employerProfileId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      // Get current user to check who owns the employer profile
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const { data, error } = await supabase
        .from("connection_requests")
        .select(`
          *,
          athlete_profiles (
            email,
            bio,
            sport_discipline,
            skills,
            photo_url,
            professional_highlights,
            years_of_membership,
            instagram_url,
            availability,
            career_interests,
            geographic_preferences,
            user_id,
            profiles (
              full_name
            )
          )
        `)
        .eq("employer_id", employerProfileId)
        .eq("status", "pending")
        .order("created_at", { ascending: false });

      if (error) {
        console.error("Error loading requests:", error);
        toast.error("Failed to load connection requests");
        return;
      }

      // Determine who initiated each request by comparing initiated_by_user_id with current user
      const requestsWithInitiator = (data || []).map(req => ({
        ...req,
        // If the current user initiated, they can only cancel. Otherwise they can accept/reject.
        initiated_by_athlete: req.initiated_by_user_id !== user.id
      }));

      setRequests(requestsWithInitiator);
    } catch (error) {
      console.error("Error:", error);
      toast.error("An error occurred");
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptRequest = async () => {
    if (!selectedRequest) return;

    if (!acceptanceMessage.trim()) {
      toast.error("Please include a message with your acceptance");
      return;
    }

    setProcessing(true);
    try {
      const { data, error } = await supabase
        .from("connection_requests")
        .update({ 
          status: "accepted",
          message: acceptanceMessage 
        })
        .eq("id", selectedRequest.id)
        .select("id, status")
        .single();

      if (error) throw error;

      // DB trigger on_connection_request_event fires send-connection-notification automatically

      // Get user email
      const { data: { user } } = await supabase.auth.getUser();
      const userEmail = user?.email || "your email";
      const athleteName = selectedRequest.athlete_profiles.profiles?.full_name || "the athlete";
      
      toast.success(`Please check your email (${userEmail}) for an introduction to ${athleteName}!`, {
        duration: 6000,
      });
      
      setShowAcceptDialog(false);
      setAcceptanceMessage("");
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error("Error accepting request:", error);
      toast.error("Failed to accept request");
    } finally {
      setProcessing(false);
    }
  };

  const handleRejectRequest = async (requestId: string) => {
    setProcessing(true);
    try {
      // Delete the record entirely — allows the requester to re-send
      const { error } = await supabase
        .from("connection_requests")
        .delete()
        .eq("id", requestId);

      if (error) throw error;

      toast.success("Request declined");
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error("Error declining request:", error);
      toast.error("Failed to decline request");
    } finally {
      setProcessing(false);
    }
  };

  const filteredRequests = useMemo(() => {
    return requests.filter((request) => {
      const matchesSearch = !searchTerm || 
        request.athlete_profiles.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.athlete_profiles.bio?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSport = !filterSport ||
        (Array.isArray(request.athlete_profiles.sport_discipline)
          ? request.athlete_profiles.sport_discipline.includes(filterSport)
          : request.athlete_profiles.sport_discipline === filterSport);
      
      const matchesAvailability = !filterAvailability || 
        request.athlete_profiles.availability === filterAvailability;
      
      return matchesSearch && matchesSport && matchesAvailability;
    });
  }, [requests, searchTerm, filterSport, filterAvailability]);

  const uniqueSports = useMemo(() => {
    const allSports = requests.flatMap(r =>
      Array.isArray(r.athlete_profiles.sport_discipline)
        ? r.athlete_profiles.sport_discipline
        : r.athlete_profiles.sport_discipline ? [r.athlete_profiles.sport_discipline] : []
    );
    return Array.from(new Set(allSports));
  }, [requests]);

  const uniqueAvailability = useMemo(() => {
    return Array.from(new Set(requests.map(r => r.athlete_profiles.availability).filter(Boolean)));
  }, [requests]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  return (
    <>
      <div className="mb-4 space-y-3">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by name or bio..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterSport}
            onChange={(e) => setFilterSport(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Sports</option>
            {uniqueSports.map(sport => (
              <option key={sport} value={sport}>{sport}</option>
            ))}
          </select>
          <select
            value={filterAvailability}
            onChange={(e) => setFilterAvailability(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Availability</option>
            {uniqueAvailability.map(avail => (
              <option key={avail} value={avail}>{avail}</option>
            ))}
          </select>
        </div>
      </div>

      {filteredRequests.length === 0 ? (
        <div className="text-center p-8">
          <p className="text-muted-foreground">
            {requests.length === 0 ? "Your next champion awaits—explore our athlete directory to make connections" : "No requests match your filters"}
          </p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {filteredRequests.map((request) => (
          <Card key={request.id} className="cursor-pointer hover:border-primary/50 hover:shadow-lg hover:scale-[1.01] transition-all duration-200 animate-fade-in" onClick={() => setSelectedRequest(request)}>
            <CardHeader>
              <div className="flex items-center gap-4">
                <Avatar className="h-12 w-12">
                  <AvatarImage src={request.athlete_profiles.photo_url ?? undefined} />
                  <AvatarFallback>AT</AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">
                    {request.athlete_profiles.profiles?.full_name || "Athlete"}
                  </CardTitle>
                  <p className="text-sm text-muted-foreground">
                    {Array.isArray(request.athlete_profiles.sport_discipline) ? request.athlete_profiles.sport_discipline.join(", ") : (request.athlete_profiles.sport_discipline || "Sport not specified")}
                  </p>
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-xs text-muted-foreground/70">
                Request Date: {format(new Date(request.created_at), "MMM d, yyyy")}
              </p>
              
              <div>
                <p className="text-xs font-medium mb-1">Bio</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {request.athlete_profiles.bio || "No bio provided"}
                </p>
              </div>

              <div>
                <p className="text-xs font-medium mb-1">Opportunity Type</p>
                <p className="text-sm text-muted-foreground">
                  {request.opportunity_type || "Not specified"}
                </p>
              </div>

              {request.message && (
                <div className="border-l-2 border-primary/20 pl-3">
                  <p className="text-xs font-medium mb-1 text-primary">Message Preview</p>
                  <p className="text-sm text-muted-foreground line-clamp-2 italic">"{request.message}"</p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Connection Request Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedRequest.athlete_profiles.photo_url ?? undefined} />
                  <AvatarFallback>AT</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedRequest.athlete_profiles.profiles?.full_name || "Athlete"}
                  </h3>
                  {selectedRequest.athlete_profiles.sport_discipline && (
                    <p className="text-sm text-muted-foreground">{selectedRequest.athlete_profiles.sport_discipline}</p>
                  )}
                </div>
              </div>

              {selectedRequest.athlete_profiles.bio && (
                <div>
                  <h4 className="font-medium mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.athlete_profiles.bio}</p>
                </div>
              )}

              {selectedRequest.athlete_profiles.professional_highlights && (
                <div>
                  <h4 className="font-medium mb-2">Professional Highlights</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.athlete_profiles.professional_highlights}</p>
                </div>
              )}

              {selectedRequest.athlete_profiles.years_of_membership && (
                <div>
                  <h4 className="font-medium mb-2">Years of U.S. Ski & Snowboard Membership</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.athlete_profiles.years_of_membership} years</p>
                </div>
              )}

              {selectedRequest.athlete_profiles.instagram_url && (
                <div>
                  <h4 className="font-medium mb-2">Instagram</h4>
                  <a 
                    href={selectedRequest.athlete_profiles.instagram_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <Instagram className="h-4 w-4" />
                    View Profile
                  </a>
                </div>
              )}

              {selectedRequest.athlete_profiles.skills && selectedRequest.athlete_profiles.skills.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.athlete_profiles.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.athlete_profiles.career_interests && selectedRequest.athlete_profiles.career_interests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Career Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedRequest.athlete_profiles.career_interests.map((interest, index) => (
                      <Badge key={index} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedRequest.athlete_profiles.availability && (
                <div>
                  <h4 className="font-medium mb-2">Availability</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.athlete_profiles.availability}</p>
                </div>
              )}

              {selectedRequest.athlete_profiles.geographic_preferences && selectedRequest.athlete_profiles.geographic_preferences.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Geographic Preferences</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.athlete_profiles.geographic_preferences.join(", ")}</p>
                </div>
              )}

              {selectedRequest.athlete_profiles.email && (
                <div>
                  <h4 className="font-medium mb-2">Contact Email</h4>
                  <a 
                    href={`mailto:${selectedRequest.athlete_profiles.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {selectedRequest.athlete_profiles.email}
                  </a>
                </div>
              )}

              {selectedRequest.opportunity_type && (
                <div>
                  <h4 className="font-medium mb-2">Requested Opportunity</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.opportunity_type}</p>
                </div>
              )}

              {selectedRequest.message && (
                <div>
                  <h4 className="font-medium mb-2">Message</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.message}</p>
                </div>
              )}

              <div className="flex gap-4">
                {selectedRequest.initiated_by_athlete ? (
                  <>
                    <Button
                      onClick={() => {
                        setShowAcceptDialog(true);
                      }}
                      disabled={processing}
                      className="flex-1"
                    >
                      <CheckCircle className="mr-2 h-4 w-4" />
                      Accept
                    </Button>
                    <Button
                      onClick={() => handleRejectRequest(selectedRequest.id)}
                      disabled={processing}
                      variant="destructive"
                      className="flex-1"
                    >
                      {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                      Reject
                    </Button>
                  </>
                ) : (
                  <Button
                    onClick={() => handleRejectRequest(selectedRequest.id)}
                    disabled={processing}
                    variant="outline"
                    className="flex-1"
                  >
                    {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <XCircle className="mr-2 h-4 w-4" />}
                    Cancel Request
                  </Button>
                )}
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Accept Request Dialog with Message */}
      {selectedRequest && showAcceptDialog && (
        <Dialog open={showAcceptDialog} onOpenChange={(open) => {
          setShowAcceptDialog(open);
          if (!open) {
            setAcceptanceMessage("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Accept Connection Request</DialogTitle>
              <DialogDescription>
                Send a personalized message to {selectedRequest.athlete_profiles.profiles?.full_name || "the athlete"}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="acceptance-message">Your Message *</Label>
                <Textarea
                  id="acceptance-message"
                  placeholder="Introduce yourself and explain the opportunity..."
                  value={acceptanceMessage}
                  onChange={(e) => setAcceptanceMessage(e.target.value)}
                  className="mt-2 min-h-[120px]"
                />
              </div>
              <Button
                onClick={handleAcceptRequest}
                disabled={processing || !acceptanceMessage.trim()}
                className="w-full"
              >
                {processing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Accept & Send Message"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ConnectionRequestsManager;
