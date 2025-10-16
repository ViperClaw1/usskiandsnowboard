import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";

interface AthleteProfile {
  id: string;
  user_id: string;
  bio: string | null;
  sport_discipline: string | null;
  skills: string[] | null;
  photo_url: string | null;
}

const AthleteDirectory = () => {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadAthletes();
  }, []);

  const loadAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select("*")
        .eq("is_public", true);

      if (error) {
        console.error("Error loading athletes:", error);
        throw error;
      }
      
      console.log("Loaded athletes:", data);
      setAthletes(data || []);
    } catch (error) {
      console.error("Error loading athletes:", error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (athletes.length === 0) {
    return (
      <div className="text-center py-12">
        <p className="text-muted-foreground">No athletes found in the directory.</p>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
      {athletes.map((athlete) => (
        <Card key={athlete.id} className="hover:shadow-lg transition-shadow">
          <CardHeader>
            <div className="flex items-center gap-4">
              <Avatar className="h-16 w-16">
                <AvatarImage src={athlete.photo_url ?? undefined} alt="Athlete profile photo" />
                <AvatarFallback>AT</AvatarFallback>
              </Avatar>
              <div>
                <CardTitle className="text-lg">Athlete</CardTitle>
                {athlete.sport_discipline && (
                  <p className="text-sm text-muted-foreground">{athlete.sport_discipline}</p>
                )}
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {athlete.bio && (
              <p className="text-sm text-muted-foreground mb-4 line-clamp-3">{athlete.bio}</p>
            )}
            {athlete.skills && athlete.skills.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {athlete.skills.slice(0, 3).map((skill, index) => (
                  <Badge key={index} variant="secondary">{skill}</Badge>
                ))}
                {athlete.skills.length > 3 && (
                  <Badge variant="outline">+{athlete.skills.length - 3} more</Badge>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default AthleteDirectory;
