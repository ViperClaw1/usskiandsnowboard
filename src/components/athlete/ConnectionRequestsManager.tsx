import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2, CheckCircle, XCircle, Building2, Globe, Linkedin } from "lucide-react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

interface ConnectionRequest {
  id: string;
  employer_id: string;
  message: string | null;
  opportunity_type: string | null;
  created_at: string;
  employer_profiles: {
    company_name: string;
    industry: string | null;
    company_size: string | null;
    hq_location: string | null;
    about: string | null;
    opportunities_offered: string | null;
    contact_person: string | null;
    logo_url: string | null;
    website: string | null;
    linkedin_url: string | null;
  };
}

interface ConnectionRequestsManagerProps {
  athleteProfileId: string;
}

const ConnectionRequestsManager = ({ athleteProfileId }: ConnectionRequestsManagerProps) => {
  const [requests, setRequests] = useState<ConnectionRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedRequest, setSelectedRequest] = useState<ConnectionRequest | null>(null);
  const [processing, setProcessing] = useState(false);

  useEffect(() => {
    if (athleteProfileId) {
      loadRequests();
    }

    // Set up real-time subscription for connection requests
    const channel = supabase
      .channel('connection_requests_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `athlete_id=eq.${athleteProfileId}`
        },
        () => {
          loadRequests();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteProfileId]);

  const loadRequests = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("connection_requests")
        .select(`
          *,
          employer_profiles (
            company_name,
            industry,
            company_size,
            hq_location,
            about,
            opportunities_offered,
            contact_person,
            logo_url,
            website,
            linkedin_url
          )
        `)
        .eq("athlete_id", athleteProfileId)
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

  const handleUpdateStatus = async (requestId: string, status: "accepted" | "rejected") => {
    setProcessing(true);
    try {
      const { data, error } = await supabase
        .from("connection_requests")
        .update({ status })
        .eq("id", requestId)
        .select("id, status")
        .single();

      if (error) throw error;

      if (status === "accepted" && selectedRequest) {
        // Get user email
        const { data: { user } } = await supabase.auth.getUser();
        const userEmail = user?.email || "your email";
        const companyName = selectedRequest.employer_profiles.company_name;
        
        toast.success(`Please check your email (${userEmail}) for an introduction to ${companyName}!`, {
          duration: 6000,
        });
      } else {
        toast.success(`Connection ${status}`);
      }
      
      setSelectedRequest(null);
      loadRequests();
    } catch (error) {
      console.error("Error updating status:", error);
      toast.error("Failed to update connection status");
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
                  {request.employer_profiles.logo_url ? (
                    <AvatarImage src={request.employer_profiles.logo_url} alt={request.employer_profiles.company_name} className="object-cover" />
                  ) : (
                    <AvatarFallback>
                      <Building2 className="h-6 w-6 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-base">{request.employer_profiles.company_name}</CardTitle>
                  {request.employer_profiles.industry && (
                    <p className="text-sm text-muted-foreground">{request.employer_profiles.industry}</p>
                  )}
                </div>
                <Badge variant="secondary">Pending</Badge>
              </div>
            </CardHeader>
            <CardContent>
              {request.employer_profiles.about && (
                <p className="text-sm mb-2 text-muted-foreground line-clamp-2">{request.employer_profiles.about}</p>
              )}
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
              <DialogTitle>Connection Request from {selectedRequest.employer_profiles.company_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {selectedRequest.employer_profiles.logo_url ? (
                    <AvatarImage src={selectedRequest.employer_profiles.logo_url} alt={selectedRequest.employer_profiles.company_name} className="object-cover" />
                  ) : (
                    <AvatarFallback>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedRequest.employer_profiles.company_name}</h3>
                  {selectedRequest.employer_profiles.industry && (
                    <p className="text-sm text-muted-foreground">{selectedRequest.employer_profiles.industry}</p>
                  )}
                </div>
              </div>

              {selectedRequest.employer_profiles.about && (
                <div>
                  <h4 className="font-medium mb-2">About</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.employer_profiles.about}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedRequest.employer_profiles.company_size && (
                  <div>
                    <h4 className="font-medium mb-2">Company Size</h4>
                    <p className="text-sm text-muted-foreground">{selectedRequest.employer_profiles.company_size}</p>
                  </div>
                )}
                {selectedRequest.employer_profiles.hq_location && (
                  <div>
                    <h4 className="font-medium mb-2">HQ Location</h4>
                    <p className="text-sm text-muted-foreground">{selectedRequest.employer_profiles.hq_location}</p>
                  </div>
                )}
              </div>

              {selectedRequest.employer_profiles.opportunities_offered && (
                <div>
                  <h4 className="font-medium mb-2">Opportunities Offered</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.employer_profiles.opportunities_offered}</p>
                </div>
              )}

              {selectedRequest.employer_profiles.contact_person && (
                <div>
                  <h4 className="font-medium mb-2">Contact Person</h4>
                  <p className="text-sm text-muted-foreground">{selectedRequest.employer_profiles.contact_person}</p>
                </div>
              )}

              {selectedRequest.employer_profiles.website && (
                <div>
                  <h4 className="font-medium mb-2">Website</h4>
                  <a 
                    href={selectedRequest.employer_profiles.website} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <Globe className="h-4 w-4" />
                    Visit Website
                  </a>
                </div>
              )}

              {selectedRequest.employer_profiles.linkedin_url && (
                <div>
                  <h4 className="font-medium mb-2">LinkedIn</h4>
                  <a 
                    href={selectedRequest.employer_profiles.linkedin_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline flex items-center gap-2"
                  >
                    <Linkedin className="h-4 w-4" />
                    View Company
                  </a>
                </div>
              )}

              {selectedRequest.opportunity_type && (
                <div>
                  <h4 className="font-medium mb-2">Specific Opportunity</h4>
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
                  onClick={() => handleUpdateStatus(selectedRequest.id, "accepted")}
                  disabled={processing}
                  className="flex-1"
                >
                  {processing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CheckCircle className="mr-2 h-4 w-4" />}
                  Accept
                </Button>
                <Button
                  onClick={() => handleUpdateStatus(selectedRequest.id, "rejected")}
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
    </>
  );
};

export default ConnectionRequestsManager;
