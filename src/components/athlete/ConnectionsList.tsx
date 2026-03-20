import { useState, useEffect, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { EmployerProfilePreview } from "@/components/profile/EmployerProfilePreview";
import { Input } from "@/components/ui/input";
import { Loader2, Building2, Search } from "lucide-react";
import { toast } from "sonner";

interface Connection {
  id: string;
  employer_profiles: {
    id: string;
    company_name: string;
    industry: string | null;
    about: string | null;
    opportunities_offered: string | null;
    contact_person: string | null;
    contact_title: string | null;
    contact_email: string | null;
    logo_url: string | null;
    background_image_url: string | null;
    website: string | null;
    linkedin_url: string | null;
    company_size: string | null;
    hq_location: string | null;
    job_board_url: string | null;
    individual_roles: any;
    phone: string | null;
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
  const [searchTerm, setSearchTerm] = useState("");
  const [filterIndustry, setFilterIndustry] = useState("");
  const [filterLocation, setFilterLocation] = useState("");

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
            id,
            company_name,
            industry,
            about,
            opportunities_offered,
            contact_person,
            contact_title,
            contact_email,
            logo_url,
            background_image_url,
            website,
            linkedin_url,
            company_size,
            hq_location,
            job_board_url,
            individual_roles,
            phone
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

  const filteredConnections = useMemo(() => {
    return connections.filter((connection) => {
      const matchesSearch = !searchTerm || 
        connection.employer_profiles.company_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        connection.employer_profiles.about?.toLowerCase().includes(searchTerm.toLowerCase());
      
      const matchesIndustry = !filterIndustry || 
        connection.employer_profiles.industry === filterIndustry;
      
      const matchesLocation = !filterLocation || 
        connection.employer_profiles.hq_location === filterLocation;
      
      return matchesSearch && matchesIndustry && matchesLocation;
    });
  }, [connections, searchTerm, filterIndustry, filterLocation]);

  const uniqueIndustries = useMemo(() => {
    return Array.from(new Set(connections.map(c => c.employer_profiles.industry).filter(Boolean)));
  }, [connections]);

  const uniqueLocations = useMemo(() => {
    return Array.from(new Set(connections.map(c => c.employer_profiles.hq_location).filter(Boolean)));
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
            placeholder="Search by company name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={filterIndustry}
            onChange={(e) => setFilterIndustry(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Industries</option>
            {uniqueIndustries.map(industry => (
              <option key={industry} value={industry}>{industry}</option>
            ))}
          </select>
          <select
            value={filterLocation}
            onChange={(e) => setFilterLocation(e.target.value)}
            className="flex h-9 rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
          >
            <option value="">All Locations</option>
            {uniqueLocations.map(location => (
              <option key={location} value={location}>{location}</option>
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
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredConnections.map((connection) => (
          <Card key={connection.id} className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50" onClick={() => setSelectedConnection(connection)}>
            <CardHeader className="pb-3">
              <div className="flex flex-col items-center gap-3">
                <div className="flex-shrink-0" style={{ width: '96px', height: '96px' }}>
                  {connection.employer_profiles.logo_url ? (
                    <img 
                      src={connection.employer_profiles.logo_url} 
                      alt={connection.employer_profiles.company_name}
                      className="w-full h-full object-contain rounded"
                      style={{ width: '96px', height: '96px' }}
                    />
                  ) : (
                    <Avatar className="h-24 w-24">
                      <AvatarFallback>
                        <Building2 className="h-12 w-12 text-muted-foreground" />
                      </AvatarFallback>
                    </Avatar>
                  )}
                </div>
                <div className="text-center w-full">
                  <CardTitle className="text-lg">{connection.employer_profiles.company_name}</CardTitle>
                  {connection.employer_profiles.industry && (
                    <p className="text-sm text-muted-foreground">{connection.employer_profiles.industry}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {connection.employer_profiles.about && (
                <p className="text-sm text-muted-foreground line-clamp-3">{connection.employer_profiles.about}</p>
              )}
              {connection.employer_profiles.opportunities_offered && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-1">Opportunities</p>
                  <p className="text-sm text-muted-foreground line-clamp-2">{connection.employer_profiles.opportunities_offered}</p>
                </div>
              )}
              <div className="flex items-center justify-between">
                <div className="flex flex-wrap gap-2">
                  {connection.employer_profiles.company_size && (
                    <Badge variant="outline" className="text-xs">{connection.employer_profiles.company_size}</Badge>
                  )}
                  {connection.employer_profiles.hq_location && (
                    <Badge variant="outline" className="text-xs">{connection.employer_profiles.hq_location}</Badge>
                  )}
                </div>
                <Badge variant={status === "accepted" ? "default" : "destructive"}>
                  {status === "accepted" ? "Connected Accepted" : "Declined"}
                </Badge>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      )}

      {selectedConnection && (
        <Dialog open={!!selectedConnection} onOpenChange={() => setSelectedConnection(null)}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <EmployerProfilePreview profile={selectedConnection.employer_profiles} />
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default ConnectionsList;
