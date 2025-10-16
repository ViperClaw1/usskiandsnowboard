import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";

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
  profiles: {
    full_name: string | null;
  };
}

const AthleteDirectory = () => {
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [employerProfileId, setEmployerProfileId] = useState<string | null>(null);
  const [requestMessage, setRequestMessage] = useState("");
  const [opportunityType, setOpportunityType] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);

  useEffect(() => {
    loadAthletes();
    loadEmployerProfile();
  }, []);

  const loadEmployerProfile = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("employer_profiles")
      .select("id")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setEmployerProfileId(data.id);
    }
  };

  const loadAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(`
          *,
          profiles!inner(full_name)
        `)
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

  const handleSendRequest = async () => {
    if (!employerProfileId || !selectedAthlete) {
      toast.error("Unable to send request");
      return;
    }

    if (!requestMessage.trim()) {
      toast.error("Please include a message with your request");
      return;
    }

    setSendingRequest(true);
    try {
      const { error } = await supabase
        .from("connection_requests")
        .insert({
          athlete_id: selectedAthlete.id,
          employer_id: employerProfileId,
          message: requestMessage,
          opportunity_type: opportunityType || null,
          status: "pending"
        });

      if (error) throw error;

      toast.success("Connection request sent!");
      setRequestMessage("");
      setOpportunityType("");
      setShowRequestDialog(false);
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send connection request");
    } finally {
      setSendingRequest(false);
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
                  <AvatarImage src={athlete.photo_url ?? undefined} alt={athlete.profiles.full_name ?? "Athlete"} className="object-cover" />
                  <AvatarFallback>
                    {athlete.profiles.full_name
                      ? athlete.profiles.full_name.split(" ").map(n => n[0]).join("").toUpperCase()
                      : "AT"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center">
                  <CardTitle className="text-lg">{athlete.profiles.full_name || "Athlete"}</CardTitle>
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
        <Dialog open={!!selectedAthlete && !showRequestDialog} onOpenChange={(open) => !open && setSelectedAthlete(null)}>
          <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedAthlete.profiles.full_name || "Athlete"} - Profile Details</DialogTitle>
            </DialogHeader>
            <div className="space-y-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-20 w-20">
                  <AvatarImage src={selectedAthlete.photo_url ?? undefined} className="object-cover" />
                  <AvatarFallback>
                    {selectedAthlete.profiles.full_name
                      ? selectedAthlete.profiles.full_name.split(" ").map(n => n[0]).join("").toUpperCase()
                      : "AT"}
                  </AvatarFallback>
                </Avatar>
                <div>
                  <h3 className="font-semibold text-lg">{selectedAthlete.profiles.full_name || "Athlete"}</h3>
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

              <Button 
                onClick={() => {
                  setShowRequestDialog(true);
                }}
                className="w-full"
              >
                Request Connection
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {selectedAthlete && showRequestDialog && (
        <Dialog open={showRequestDialog} onOpenChange={(open) => {
          setShowRequestDialog(open);
          if (!open) {
            setRequestMessage("");
            setOpportunityType("");
          }
        }}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Request Connection</DialogTitle>
              <DialogDescription>
                Send a connection request to this athlete
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="opportunity-type">Opportunity Type (Optional)</Label>
                <Textarea
                  id="opportunity-type"
                  placeholder="e.g., Internship, Full-time, Part-time..."
                  value={opportunityType}
                  onChange={(e) => setOpportunityType(e.target.value)}
                  className="mt-2"
                />
              </div>
              <div>
                <Label htmlFor="message">Message *</Label>
                <Textarea
                  id="message"
                  placeholder="Introduce your company and explain the opportunity..."
                  value={requestMessage}
                  onChange={(e) => setRequestMessage(e.target.value)}
                  className="mt-2 min-h-[100px]"
                />
              </div>
              <Button
                onClick={handleSendRequest}
                disabled={sendingRequest || !requestMessage.trim()}
                className="w-full"
              >
                {sendingRequest ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Sending...
                  </>
                ) : (
                  "Send Request"
                )}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
};

export default AthleteDirectory;
