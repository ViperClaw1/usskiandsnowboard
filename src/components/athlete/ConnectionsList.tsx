import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Connection {
  id: string;
  employer_profiles: {
    company_name: string;
    industry: string | null;
    about: string | null;
    opportunities_offered: string | null;
    contact_person: string | null;
    logo_url: string | null;
    website: string | null;
    linkedin_url: string | null;
    company_size: string | null;
    hq_location: string | null;
  };
  created_at: string;
}

interface ConnectionsListProps {
  athleteProfileId: string;
  status: "accepted" | "rejected";
}

const ConnectionsList = ({ athleteProfileId, status }: ConnectionsListProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  useEffect(() => {
    if (athleteProfileId) {
      loadConnections();
    }

    // Set up real-time subscription for connection updates
    const channel = supabase
      .channel('athlete_connections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `athlete_id=eq.${athleteProfileId}`
        },
        () => {
          loadConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [athleteProfileId, status]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("connection_requests")
        .select(`
          id,
          created_at,
          employer_profiles (
            company_name,
            industry,
            about,
            opportunities_offered,
            contact_person,
            logo_url,
            website,
            linkedin_url,
            company_size,
            hq_location
          )
        `)
        .eq("athlete_id", athleteProfileId)
        .eq("status", status)
        .order("updated_at", { ascending: false });

      if (error) {
        console.error("Error loading connections:", error);
        toast.error("Failed to load connections");
        return;
      }

      setConnections(data || []);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  if (connections.length === 0) {
    return (
      <div className="text-center p-4">
        <p className="text-sm text-muted-foreground">No {status} connections</p>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-3">
        {connections.map((connection) => (
          <Card key={connection.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedConnection(connection)}>
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <Avatar className="h-10 w-10">
                  {connection.employer_profiles.logo_url ? (
                    <img src={connection.employer_profiles.logo_url} alt={connection.employer_profiles.company_name} className="object-cover rounded-full" />
                  ) : (
                    <AvatarFallback>
                      <Building2 className="h-5 w-5 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div className="flex-1">
                  <p className="font-medium text-sm">{connection.employer_profiles.company_name}</p>
                  {connection.employer_profiles.industry && (
                    <p className="text-xs text-muted-foreground">{connection.employer_profiles.industry}</p>
                  )}
                </div>
                <Badge variant={status === "accepted" ? "default" : "secondary"}>
                  {status === "accepted" ? "Connected" : "Declined"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedConnection && (
        <Dialog open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>{selectedConnection.employer_profiles.company_name}</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  {selectedConnection.employer_profiles.logo_url ? (
                    <img src={selectedConnection.employer_profiles.logo_url} alt={selectedConnection.employer_profiles.company_name} className="object-cover rounded-full" />
                  ) : (
                    <AvatarFallback>
                      <Building2 className="h-8 w-8 text-muted-foreground" />
                    </AvatarFallback>
                  )}
                </Avatar>
                <div>
                  <h3 className="font-semibold">{selectedConnection.employer_profiles.company_name}</h3>
                  {selectedConnection.employer_profiles.industry && (
                    <p className="text-sm text-muted-foreground">{selectedConnection.employer_profiles.industry}</p>
                  )}
                </div>
              </div>

              {selectedConnection.employer_profiles.about && (
                <div>
                  <h4 className="font-medium mb-2">About</h4>
                  <p className="text-sm text-muted-foreground">{selectedConnection.employer_profiles.about}</p>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                {selectedConnection.employer_profiles.company_size && (
                  <div>
                    <h4 className="font-medium mb-2">Company Size</h4>
                    <p className="text-sm text-muted-foreground">{selectedConnection.employer_profiles.company_size}</p>
                  </div>
                )}
                {selectedConnection.employer_profiles.hq_location && (
                  <div>
                    <h4 className="font-medium mb-2">HQ Location</h4>
                    <p className="text-sm text-muted-foreground">{selectedConnection.employer_profiles.hq_location}</p>
                  </div>
                )}
              </div>

              {selectedConnection.employer_profiles.opportunities_offered && (
                <div>
                  <h4 className="font-medium mb-2">Opportunities Offered</h4>
                  <p className="text-sm text-muted-foreground">{selectedConnection.employer_profiles.opportunities_offered}</p>
                </div>
              )}

              {selectedConnection.employer_profiles.contact_person && (
                <div>
                  <h4 className="font-medium mb-2">Contact Person</h4>
                  <p className="text-sm text-muted-foreground">{selectedConnection.employer_profiles.contact_person}</p>
                </div>
              )}

              {selectedConnection.employer_profiles.website && (
                <div>
                  <h4 className="font-medium mb-2">Website</h4>
                  <a href={selectedConnection.employer_profiles.website} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {selectedConnection.employer_profiles.website}
                  </a>
                </div>
              )}

              {selectedConnection.employer_profiles.linkedin_url && (
                <div>
                  <h4 className="font-medium mb-2">LinkedIn</h4>
                  <a href={selectedConnection.employer_profiles.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary hover:underline">
                    {selectedConnection.employer_profiles.linkedin_url}
                  </a>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ConnectionsList;
