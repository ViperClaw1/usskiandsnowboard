import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

interface Connection {
  id: string;
  athlete_profiles: {
    sport_discipline: string | null;
    photo_url: string | null;
  };
  created_at: string;
}

interface ConnectionsListProps {
  employerProfileId: string;
  status: "accepted" | "rejected";
}

const ConnectionsList = ({ employerProfileId, status }: ConnectionsListProps) => {
  const [connections, setConnections] = useState<Connection[]>([]);
  const [loading, setLoading] = useState(true);

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
          athlete_profiles (
            sport_discipline,
            photo_url
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
    <div className="grid gap-3">
      {connections.map((connection) => (
        <Card key={connection.id}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10">
                <AvatarImage src={connection.athlete_profiles.photo_url ?? undefined} />
                <AvatarFallback>AT</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <p className="font-medium text-sm">Athlete</p>
                {connection.athlete_profiles.sport_discipline && (
                  <p className="text-xs text-muted-foreground">{connection.athlete_profiles.sport_discipline}</p>
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
