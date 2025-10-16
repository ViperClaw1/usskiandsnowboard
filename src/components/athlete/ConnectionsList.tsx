import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Building2 } from "lucide-react";
import { toast } from "sonner";

interface Connection {
  id: string;
  employer_profiles: {
    company_name: string;
    industry: string | null;
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
            industry
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
    <div className="grid gap-3">
      {connections.map((connection) => (
        <Card key={connection.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-accent/10 flex items-center justify-center">
                <Building2 className="h-5 w-5 text-accent" />
              </div>
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
  );
};

export default ConnectionsList;
