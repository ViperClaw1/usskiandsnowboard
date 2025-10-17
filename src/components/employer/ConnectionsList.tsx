import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Loader2, Search, ChevronLeft, ChevronRight } from "lucide-react";
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
    lifestyle_photos?: string[];
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSport, setFilterSport] = useState("");
  const [filterAvailability, setFilterAvailability] = useState("");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);

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

  // Reset carousel index when opening a new athlete
  useEffect(() => {
    setCurrentPhotoIndex(0);
  }, [selectedConnection?.id]);

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

      const connectionsWithPhotos = await Promise.all(
        (data || []).map(async (conn: any) => {
          try {
            const { data: photoFiles } = await supabase.storage
              .from('athlete-photos')
              .list(`${conn.athlete_profiles.user_id}/lifestyle`, {
                limit: 5,
                sortBy: { column: 'created_at', order: 'desc' },
              });

            let photoUrls: string[] = [];
            if (photoFiles && photoFiles.length > 0) {
              photoUrls = photoFiles.map((file) => {
                const { data: urlData } = supabase.storage
                  .from('athlete-photos')
                  .getPublicUrl(`${conn.athlete_profiles.user_id}/lifestyle/${file.name}`);
                return urlData.publicUrl;
              });
              console.log(`Loaded ${photoUrls.length} lifestyle photos for ${conn.athlete_profiles.user_id}`);
            } else {
              console.log(`No lifestyle photos found for ${conn.athlete_profiles.user_id}`);
              if (conn.athlete_profiles.photo_url) {
                // Fallback to profile photo if no lifestyle photos exist
                photoUrls = [conn.athlete_profiles.photo_url];
              }
            }

            return {
              ...conn,
              athlete_profiles: {
                ...conn.athlete_profiles,
                lifestyle_photos: photoUrls,
              },
            };
          } catch (e) {
            console.error('Error loading lifestyle photos for athlete', conn.athlete_profiles.user_id, e);
            return {
              ...conn,
              athlete_profiles: {
                ...conn.athlete_profiles,
                lifestyle_photos: [],
              },
            };
          }
        })
      );

      setConnections(connectionsWithPhotos);
    } catch (error) {
      console.error("Error:", error);
    } finally {
      setLoading(false);
    }
  };

  const filteredConnections = useMemo(() => {
    return connections.filter((connection) => {
      const matchesSearch = !searchTerm || 
        connection.athlete_profiles.profiles?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        connection.athlete_profiles.bio?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesSport = !filterSport || 
        connection.athlete_profiles.sport_discipline === filterSport;
      
      const matchesAvailability = !filterAvailability || 
        connection.athlete_profiles.availability === filterAvailability;
      
      return matchesSearch && matchesSport && matchesAvailability;
    });
  }, [connections, searchTerm, filterSport, filterAvailability]);

  const uniqueSports = useMemo(() => {
    return Array.from(new Set(connections.map(c => c.athlete_profiles.sport_discipline).filter(Boolean)));
  }, [connections]);

  const uniqueAvailability = useMemo(() => {
    return Array.from(new Set(connections.map(c => c.athlete_profiles.availability).filter(Boolean)));
  }, [connections]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Loader2 className="h-6 w-6 animate-spin" />
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

      {filteredConnections.length === 0 ? (
        <div className="text-center p-4">
          <p className="text-sm text-muted-foreground">
            {connections.length === 0 ? `No ${status} connections` : "No connections match your filters"}
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredConnections.map((connection) => (
          <Card key={connection.id} className="cursor-pointer hover:border-primary/50 transition-colors" onClick={() => setSelectedConnection(connection)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex flex-col items-center text-center">
                  <Avatar className="h-16 w-16 mb-3">
                    <AvatarImage src={connection.athlete_profiles.photo_url ?? undefined} />
                    <AvatarFallback>AT</AvatarFallback>
                  </Avatar>
                  <div className="w-full space-y-1">
                    <p className="font-medium text-sm min-h-[1.25rem]">
                      {connection.athlete_profiles.profiles?.full_name || "Athlete"}
                    </p>
                    <p className="text-xs text-muted-foreground min-h-[1rem]">
                      {connection.athlete_profiles.sport_discipline || "Sport not specified"}
                    </p>
                    <div className="flex justify-center min-h-[1.5rem] mt-2">
                      <Badge variant={status === "accepted" ? "default" : "secondary"}>
                        {status === "accepted" ? "Connected" : "Declined"}
                      </Badge>
                    </div>
                  </div>
                </div>
                <div className="min-h-[4.5rem]">
                  <p className="text-sm text-muted-foreground line-clamp-3">
                    {connection.athlete_profiles.bio || "\u00A0"}
                  </p>
                </div>
                <div className="min-h-[1.25rem]">
                  <p className="text-xs text-muted-foreground/70 text-center">
                    {status === 'accepted' ? 'Connection Date' : 'Declined Date'}: {format(new Date(connection.updated_at), "MMM d, yyyy")}
                  </p>
                </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {selectedConnection && (
        <Dialog open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
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

              <div>
                <h4 className="font-medium mb-2">Bio</h4>
                <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.bio || "No bio provided"}</p>
              </div>

              <div>
                <h4 className="font-medium mb-2">Professional Highlights</h4>
                <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.professional_highlights || "Not provided"}</p>
              </div>

              {selectedConnection.athlete_profiles.years_of_membership ? (
                <div>
                  <h4 className="font-medium mb-2">Years of U.S. Ski & Snowboard Membership</h4>
                  <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.years_of_membership} years</p>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium mb-2">Years of U.S. Ski & Snowboard Membership</h4>
                  <p className="text-sm text-muted-foreground">Not specified</p>
                </div>
              )}

              {selectedConnection.athlete_profiles.instagram_url ? (
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
              ) : (
                <div>
                  <h4 className="font-medium mb-2">Instagram</h4>
                  <p className="text-sm text-muted-foreground">Not provided</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Skills</h4>
                {selectedConnection.athlete_profiles.skills && selectedConnection.athlete_profiles.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedConnection.athlete_profiles.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No skills listed</p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Career Interests</h4>
                {selectedConnection.athlete_profiles.career_interests && selectedConnection.athlete_profiles.career_interests.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedConnection.athlete_profiles.career_interests.map((interest, index) => (
                      <Badge key={index} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No interests listed</p>
                )}
              </div>

              <div>
                <h4 className="font-medium mb-2">Geographic Preferences</h4>
                <p className="text-sm text-muted-foreground">
                  {selectedConnection.athlete_profiles.geographic_preferences && selectedConnection.athlete_profiles.geographic_preferences.length > 0
                    ? selectedConnection.athlete_profiles.geographic_preferences.join(", ")
                    : "Not specified"}
                </p>
              </div>

              {selectedConnection.athlete_profiles.email ? (
                <div>
                  <h4 className="font-medium mb-2">Contact Email</h4>
                  <a 
                    href={`mailto:${selectedConnection.athlete_profiles.email}`}
                    className="text-sm text-primary hover:underline"
                  >
                    {selectedConnection.athlete_profiles.email}
                  </a>
                </div>
              ) : (
                <div>
                  <h4 className="font-medium mb-2">Contact Email</h4>
                  <p className="text-sm text-muted-foreground">Not provided</p>
                </div>
              )}

              <div>
                <h4 className="font-medium mb-2">Availability</h4>
                <p className="text-sm text-muted-foreground">{selectedConnection.athlete_profiles.availability || "Not specified"}</p>
              </div>

              {selectedConnection.athlete_profiles.lifestyle_photos && selectedConnection.athlete_profiles.lifestyle_photos.length > 0 && (
                <div className="space-y-3">
                  <h4 className="font-medium">Athlete Highlights</h4>
                  <div className="relative w-full max-h-[400px] bg-muted rounded-lg overflow-hidden flex items-center justify-center">
                    <img
                      src={selectedConnection.athlete_profiles.lifestyle_photos[currentPhotoIndex]}
                      alt={`Lifestyle photo ${currentPhotoIndex + 1}`}
                      className="max-w-full max-h-[400px] object-contain"
                    />
                  </div>
                  {selectedConnection.athlete_profiles.lifestyle_photos.length > 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                      {selectedConnection.athlete_profiles.lifestyle_photos.map((photo, idx) => (
                        <button
                          key={idx}
                          onClick={() => setCurrentPhotoIndex(idx)}
                          className={`flex-shrink-0 w-20 h-20 rounded-lg overflow-hidden border-2 transition-all ${
                            idx === currentPhotoIndex ? 'border-primary' : 'border-transparent opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img
                            src={photo}
                            alt={`Thumbnail ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        </button>
                      ))}
                    </div>
                  )}
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
