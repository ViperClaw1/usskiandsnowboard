import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface ConnectionRequest {
  id: string;
  athlete_id: string;
  message: string | null;
  opportunity_type: string | null;
  created_at: string;
  athlete_profiles: {
    bio: string | null;
    sport_discipline: string | null;
    skills: string[] | null;
    photo_url: string | null;
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
      const { data, error } = await supabase
        .from("connection_requests")
        .select(`
          *,
          athlete_profiles (
            bio,
            sport_discipline,
            skills,
            photo_url,
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

      setRequests(data || []);
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

      toast.success("Request accepted!");
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
      const { data, error } = await supabase
        .from("connection_requests")
        .update({ status: "rejected" })
        .eq("id", requestId)
        .select("id, status")
        .single();

      if (error) throw error;

      toast.success("Request rejected");
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error("Error rejecting request:", error);
      toast.error("Failed to reject request");
    } finally {
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin" />
      </div>
    );
  }

  if (requests.length === 0) {
    return (
      <div className="text-center p-8">
        <p className="text-muted-foreground">No pending connection requests</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2">
        {requests.map((request) => (
          <Card key={request.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedRequest(request)}>
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
                  {request.athlete_profiles.sport_discipline && (
                    <p className="text-sm text-muted-foreground">{request.athlete_profiles.sport_discipline}</p>
                  )}
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {request.opportunity_type && (
                <p className="text-sm mb-2">
                  <span className="font-medium">Opportunity:</span> {request.opportunity_type}
                </p>
              )}
              {request.message && (
                <p className="text-sm text-muted-foreground line-clamp-2">{request.message}</p>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedRequest && (
        <Dialog open={!!selectedRequest} onOpenChange={() => setSelectedRequest(null)}>
          <DialogContent className="max-w-2xl">
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
