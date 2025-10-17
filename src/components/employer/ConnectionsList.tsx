import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { format } from "date-fns";

interface Connection {
  id: string;
  athlete_profiles: {
    email: string | null;
    sport_discipline: string | null;
    photo_url: string | null;
    bio: string | null;
    skills: string[] | null;
    availability: string | null;
    career_interests: string[] | null;
    geographic_preferences: string[] | null;
    professional_highlights: string | null;
    years_of_membership: number | null;
    instagram_url: string | null;
    user_id: string;
    profiles: {
      full_name: string | null;
    };
  };
  created_at: string;
  updated_at: string;
}

interface ConnectionsListProps {
  employerProfileId: string;
  status: "accepted" | "rejected";
}

const ConnectionsList = ({ employerProfileId, status }: ConnectionsListProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedConnection, setSelectedConnection] = useState<Connection | null>(null);

  useEffect(() => {
    if (employerProfileId) {
      loadConnections();
    }

    // Set up real-time subscription for connection updates
    const channel = supabase
      .channel('employer_connections_changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'connection_requests',
          filter: `employer_id=eq.${employerProfileId}`
        },
        () => {
          loadConnections();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employerProfileId, status]);

  const loadConnections = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from("connection_requests")
        .select(`
          id,
          created_at,
          updated_at,
          athlete_profiles (
            email,
            sport_discipline,
            photo_url,
            bio,
            skills,
            availability,
            career_interests,
            geographic_preferences,
            professional_highlights,
            years_of_membership,
            instagram_url,
            user_id,
            profiles (
              full_name
            )
          )
        `)
        .eq("employer_id", employerProfileId)
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
      <div className="max-h-[400px] overflow-y-auto pr-2">
        <div className="grid gap-2 md:grid-cols-2 lg:grid-cols-3">
          {connections.map((connection) => (
            <Card key={connection.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedConnection(connection)}>
              <CardContent className="p-3">
                <div className="flex items-start gap-2 mb-2">
                  <Avatar className="h-8 w-8 flex-shrink-0">
                    <AvatarImage src={connection.athlete_profiles.photo_url ?? undefined} />
                    <AvatarFallback className="text-xs">AT</AvatarFallback>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">
                      {connection.athlete_profiles.profiles?.full_name || "Athlete"}
                    </p>
                    {connection.athlete_profiles.sport_discipline && (
                      <p className="text-xs text-muted-foreground truncate">{connection.athlete_profiles.sport_discipline}</p>
                    )}
                  </div>
                  <Badge variant={status === "accepted" ? "default" : "secondary"} className="text-xs flex-shrink-0">
                    {status === "accepted" ? "Connected" : "Declined"}
                  </Badge>
                </div>
                <p className="text-xs text-muted-foreground/70 mb-1">
                  {format(new Date(connection.updated_at), "MMM d, yyyy")}
                </p>
                {connection.athlete_profiles.bio && (
                  <p className="text-xs text-muted-foreground line-clamp-2">{connection.athlete_profiles.bio}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>

      {selectedConnection && (
        <Dialog open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedConnection.athlete_profiles.profiles?.full_name || "Athlete Profile"}
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16">
                  <AvatarImage src={selectedConnection.athlete_profiles.photo_url ?? undefined} />
                  <AvatarFallback>AT</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold">
                    {selectedConnection.athlete_profiles.profiles?.full_name || "Athlete"}
                  </h3>
                  {selectedConnection.athlete_profiles.sport_discipline && (
                    <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.sport_discipline}</p>
                  )}
                </div>
              </div>

              {selectedConnection.athlete_profiles.bio && (
                <div>
                  <h4 className="font-medium mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.bio}</p>
                </div>
              )}

              {selectedConnection.athlete_profiles.professional_highlights && (
                <div>
                  <h4 className="font-medium mb-2">Professional Highlights</h4>
                  <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.professional_highlights}</p>
                </div>
              )}

              {selectedConnection.athlete_profiles.years_of_membership && (
                <div>
                  <h4 className="font-medium mb-2">Years of U.S. Ski & Snowboard Membership</h4>
                  <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.years_of_membership} years</p>
                </div>
              )}

              {selectedConnection.athlete_profiles.instagram_url && (
                <div>
                  <h4 className="font-medium mb-2">Instagram</h4>
                  <a 
                    href={selectedConnection.athlete_profiles.instagram_url} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View Profile
                  </a>
                </div>
              )}

              {selectedConnection.athlete_profiles.skills && selectedConnection.athlete_profiles.skills.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedConnection.athlete_profiles.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedConnection.athlete_profiles.career_interests && selectedConnection.athlete_profiles.career_interests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Career Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedConnection.athlete_profiles.career_interests.map((interest, index) => (
                      <Badge key={index} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedConnection.athlete_profiles.geographic_preferences && selectedConnection.athlete_profiles.geographic_preferences.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Geographic Preferences</h4>
                  <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.geographic_preferences.join(", ")}</p>
                </div>
              )}

              {selectedConnection.athlete_profiles.email && (
                <div>
                  <h4 className="font-medium mb-2">Contact Email</h4>
                  <a 
                    href={`mailto:${selectedConnection.athlete_profiles.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {selectedConnection.athlete_profiles.email}
                  </a>
                </div>
              )}

              {selectedConnection.athlete_profiles.availability && (
                <div>
                  <h4 className="font-medium mb-2">Availability</h4>
                  <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.availability}</p>
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
