import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
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
  availability: string | null;
  career_interests: string[] | null;
  geographic_preferences: string[] | null;
}

const AthleteDirectory = () => {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null);

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
    <>
      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {athletes.map((athlete) => (
          <Card 
            key={athlete.id} 
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50"
            onClick={() => setSelectedAthlete(athlete)}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage src={athlete.photo_url ?? undefined} alt="Athlete profile photo" className="object-cover" />
                  <AvatarFallback>AT</AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <CardTitle className="text-lg">Athlete</CardTitle>
                  {athlete.sport_discipline && (
                    <p className="text-sm text-muted-foreground">{athlete.sport_discipline}</p>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              {athlete.bio && (
                <p className="text-sm text-muted-foreground mb-4 line-clamp-2">{athlete.bio}</p>
              )}
              {athlete.skills && athlete.skills.length > 0 && (
                <div className="flex flex-wrap gap-2 justify-center">
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

      {selectedAthlete && (
        <Dialog open={!!selectedAthlete} onOpenChange={() => setSelectedAthlete(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Athlete Profile</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedAthlete.photo_url ?? undefined} className="object-cover" />
                  <AvatarFallback>AT</AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">Athlete Profile</h3>
                  {selectedAthlete.sport_discipline && (
                    <p className="text-sm text-muted-foreground">{selectedAthlete.sport_discipline}</p>
                  )}
                </div>
              </div>

              {selectedAthlete.bio && (
                <div>
                  <h4 className="font-medium mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{selectedAthlete.bio}</p>
                </div>
              )}

              {selectedAthlete.skills && selectedAthlete.skills.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Skills</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAthlete.skills.map((skill, index) => (
                      <Badge key={index} variant="secondary">{skill}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedAthlete.career_interests && selectedAthlete.career_interests.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Career Interests</h4>
                  <div className="flex flex-wrap gap-2">
                    {selectedAthlete.career_interests.map((interest, index) => (
                      <Badge key={index} variant="outline">{interest}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {selectedAthlete.availability && (
                <div>
                  <h4 className="font-medium mb-2">Availability</h4>
                  <p className="text-sm text-muted-foreground">{selectedAthlete.availability}</p>
                </div>
              )}

              {selectedAthlete.geographic_preferences && selectedAthlete.geographic_preferences.length > 0 && (
                <div>
                  <h4 className="font-medium mb-2">Geographic Preferences</h4>
                  <p className="text-sm text-muted-foreground">{selectedAthlete.geographic_preferences.join(", ")}</p>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AthleteDirectory;
