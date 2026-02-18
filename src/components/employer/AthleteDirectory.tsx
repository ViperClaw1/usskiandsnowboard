import { useEffect, useState, useMemo, useRef } from "react";
import { useSwipeable } from "react-swipeable";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, Instagram, ChevronLeft, ChevronRight, Search, X, Share2, RefreshCw } from "lucide-react";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { AthletePortfolioView } from "@/components/athlete/AthletePortfolioView";

interface AthleteProfile {
  id: string;
  user_id: string;
  email: string | null;
  bio: string | null;
  sport_discipline: string | null;
  skills: string[] | null;
  photo_url: string | null;
  availability: string | null;
  career_interests: string[] | null;
  geographic_preferences: string[] | null;
  professional_highlights: string | null;
  years_of_membership: number | null;
  instagram_url: string | null;
  profile_views: number | null;
  sponsors: string[] | null;
  profiles: {
    full_name: string | null;
  };
  lifestyle_photos?: string[];
}

interface Education {
  id: string;
  school: string;
  degree: string | null;
  graduation_year: number | null;
}

interface Experience {
  id: string;
  title: string;
  organization: string | null;
  description: string | null;
  start_date: string | null;
  end_date: string | null;
  is_current: boolean | null;
}

interface Certification {
  id: string;
  name: string;
  issuer: string | null;
  issue_date: string | null;
}

const AthleteDirectory = () => {
  const navigate = useNavigate();
  const [athletes, setAthletes] = useState<AthleteProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteProfile | null>(null);
  const [showRequestDialog, setShowRequestDialog] = useState(false);
  const [employerProfileId, setEmployerProfileId] = useState<string | null>(null);
  const [employerRoles, setEmployerRoles] = useState<
    Array<{ title: string; type: string; url: string; location: string }>
  >([]);
  const [requestMessage, setRequestMessage] = useState("");
  const [opportunityType, setOpportunityType] = useState("");
  const [sendingRequest, setSendingRequest] = useState(false);
  const [athleteEducation, setAthleteEducation] = useState<Education[]>([]);
  const [athleteExperience, setAthleteExperience] = useState<Experience[]>([]);
  const [athleteCertifications, setAthleteCertifications] = useState<Certification[]>([]);
  const [athletePhotos, setAthletePhotos] = useState<string[]>([]);
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pullDistance, setPullDistance] = useState(0);
  const scrollContainerRef = useRef<HTMLDivElement>(null);
  const [filterSport, setFilterSport] = useState<string>("all");
  const [filterAvailability, setFilterAvailability] = useState<string>("all");
  const [filterSkills, setFilterSkills] = useState<string>("");
  const [filterCareerInterests, setFilterCareerInterests] = useState<string>("");
  const [existingRequests, setExistingRequests] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadAthletes();
    loadEmployerProfile();

    // Set up real-time subscription for connection requests
    const channel = supabase
      .channel("employer_connection_changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "connection_requests",
        },
        () => {
          // Reload existing requests when any change happens
          if (employerProfileId) {
            loadExistingRequests(employerProfileId);
          }
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [employerProfileId]);

  const loadEmployerProfile = async () => {
    const {
      data: { user },
    } = await supabase.auth.getUser();
    if (!user) return;

    const { data } = await supabase
      .from("employer_profiles")
      .select("id, individual_roles")
      .eq("user_id", user.id)
      .single();

    if (data) {
      setEmployerProfileId(data.id);
      setEmployerRoles(
        (data.individual_roles as Array<{ title: string; type: string; url: string; location: string }>) || [],
      );
      loadExistingRequests(data.id);
    }
  };

  const loadExistingRequests = async (employerId: string) => {
    try {
      const { data, error } = await supabase
        .from("connection_requests")
        .select("athlete_id, status")
        .eq("employer_id", employerId)
        .in("status", ["pending", "accepted"]); // Only count active requests

      if (error) throw error;

      const requestedAthleteIds = new Set(data?.map((r) => r.athlete_id) || []);
      setExistingRequests(requestedAthleteIds);
    } catch (error) {
      console.error("Error loading existing requests:", error);
    }
  };

  const loadAthletes = async () => {
    try {
      const { data, error } = await supabase
        .from("athlete_profiles")
        .select(
          `
          *,
          profiles(full_name)
        `,
        )
        .eq("is_public", true);

      if (error) {
        console.error("Error loading athletes:", error);
        throw error;
      }

      // Load lifestyle photos for each athlete
      const athletesWithPhotos = await Promise.all(
        (data || []).map(async (athlete) => {
          try {
            const { data: photoFiles } = await supabase.storage
              .from("athlete-photos")
              .list(`${athlete.user_id}/lifestyle`, {
                limit: 5,
                sortBy: { column: "created_at", order: "desc" },
              });

            if (photoFiles && photoFiles.length > 0) {
              const photoUrls = photoFiles.map((file) => {
                const { data: urlData } = supabase.storage
                  .from("athlete-photos")
                  .getPublicUrl(`${athlete.user_id}/lifestyle/${file.name}`);
                return urlData.publicUrl;
              });
              console.log(`Loaded ${photoUrls.length} photos for athlete ${athlete.user_id}`);
              return { ...athlete, lifestyle_photos: photoUrls };
            }
            console.log(`No photos found for athlete ${athlete.user_id}`);
            return { ...athlete, lifestyle_photos: [] };
          } catch (error) {
            console.error(`Error loading photos for athlete ${athlete.user_id}:`, error);
            return { ...athlete, lifestyle_photos: [] };
          }
        }),
      );

      console.log("Athletes with photos:", athletesWithPhotos);
      setAthletes(athletesWithPhotos);
    } catch (error) {
      console.error("Error loading athletes:", error);
    } finally {
      setLoading(false);
    }
  };

  const loadAthleteDetails = async (athleteId: string, userId: string) => {
    try {
      // Load education
      const { data: education } = await supabase
        .from("education")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("graduation_year", { ascending: false });

      setAthleteEducation(education || []);

      // Load experience
      const { data: experience } = await supabase
        .from("experience")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("start_date", { ascending: false });

      setAthleteExperience(experience || []);

      // Load certifications
      const { data: certifications } = await supabase
        .from("certifications")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("issue_date", { ascending: false });

      setAthleteCertifications(certifications || []);

      // Load photos
      const { data: photoFiles } = await supabase.storage.from("athlete-photos").list(`${userId}/lifestyle`, {
        limit: 100,
        sortBy: { column: "created_at", order: "desc" },
      });

      if (photoFiles && photoFiles.length > 0) {
        const photoUrls = photoFiles.map((file) => {
          const { data: urlData } = supabase.storage
            .from("athlete-photos")
            .getPublicUrl(`${userId}/lifestyle/${file.name}`);
          return urlData.publicUrl;
        });
        setAthletePhotos(photoUrls);
        setCurrentPhotoIndex(0);
      } else {
        setAthletePhotos([]);
      }
    } catch (error) {
      console.error("Error loading athlete details:", error);
    }
  };

  const handleSendRequest = async () => {
    if (!employerProfileId || !selectedAthlete) {
      toast.error("Unable to send request");
      return;
    }

    if (existingRequests.has(selectedAthlete.id)) {
      toast.error("You have already sent a request to this athlete");
      return;
    }

    if (!requestMessage.trim()) {
      toast.error("Please include a message with your request");
      return;
    }

    setSendingRequest(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) {
        toast.error("User not authenticated");
        return;
      }

      const { data: insertedRequest, error } = await supabase
        .from("connection_requests")
        .insert({
          athlete_id: selectedAthlete.id,
          employer_id: employerProfileId,
          message: requestMessage,
          opportunity_type: opportunityType || null,
          status: "pending",
          initiated_by_user_id: user.id,
        })
        .select("id")
        .single();

      if (error) throw error;

      // Send notification separately - don't let notification failures block success
      if (insertedRequest?.id) {
        try {
          await supabase.functions.invoke("send-connection-notification", {
            body: {
              notification_type: "new_request",
              request_id: insertedRequest.id,
            },
          });
        } catch (notificationError) {
          console.error("Error sending notification:", notificationError);
          // Non-fatal: request was saved, just notification failed
        }
      }

      toast.success("Connection request sent!");
      setRequestMessage("");
      setOpportunityType("");
      setShowRequestDialog(false);
      setSelectedAthlete(null);

      // Add to existing requests
      setExistingRequests((prev) => new Set([...prev, selectedAthlete.id]));
    } catch (error) {
      console.error("Error sending request:", error);
      toast.error("Failed to send connection request");
    } finally {
      setSendingRequest(false);
    }
  };

  // Filter athletes based on search term and filters
  const filteredAthletes = useMemo(() => {
    let result = athletes;

    // Text search filter
    if (searchTerm.trim()) {
      const search = searchTerm.toLowerCase();
      result = result.filter((athlete) => {
        const searchableFields = [
          athlete.profiles.full_name,
          athlete.sport_discipline,
          athlete.bio,
          athlete.professional_highlights,
          athlete.availability,
          ...(athlete.skills || []),
          ...(athlete.career_interests || []),
        ]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();

        return searchableFields.includes(search);
      });
    }

    // Sport filter
    if (filterSport && filterSport !== "all") {
      result = result.filter((athlete) => athlete.sport_discipline === filterSport);
    }

    // Availability filter
    if (filterAvailability && filterAvailability !== "all") {
      result = result.filter((athlete) => athlete.availability === filterAvailability);
    }

    // Skills filter
    if (filterSkills) {
      result = result.filter((athlete) =>
        athlete.skills?.some((skill) => skill.toLowerCase().includes(filterSkills.toLowerCase())),
      );
    }

    // Career interests filter
    if (filterCareerInterests) {
      result = result.filter((athlete) =>
        athlete.career_interests?.some((interest) =>
          interest.toLowerCase().includes(filterCareerInterests.toLowerCase()),
        ),
      );
    }

    return result;
  }, [athletes, searchTerm, filterSport, filterAvailability, filterSkills, filterCareerInterests]);

  // Pull to refresh functionality
  const handleRefresh = async () => {
    setIsRefreshing(true);
    await loadAthletes();
    setIsRefreshing(false);
    setPullDistance(0);
  };

  const pullHandlers = useSwipeable({
    onSwipedDown: (eventData) => {
      if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0 && eventData.deltaY > 100) {
        handleRefresh();
      }
    },
    onSwiping: (eventData) => {
      if (scrollContainerRef.current && scrollContainerRef.current.scrollTop === 0 && eventData.deltaY > 0) {
        setPullDistance(Math.min(eventData.deltaY, 100));
      }
    },
    trackMouse: false,
    trackTouch: true,
  });

  // Share profile functionality
  const handleShareProfile = async (athlete: AthleteProfile) => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `${athlete.profiles.full_name || "Athlete"} - U.S. Ski & Snowboard`,
          text: `Check out ${athlete.profiles.full_name || "this athlete"}'s profile: ${athlete.bio || athlete.sport_discipline || "Athlete profile"}`,
          url: window.location.href,
        });
        toast.success("Profile shared successfully!");
      } catch (error) {
        if ((error as Error).name !== "AbortError") {
          console.error("Error sharing:", error);
        }
      }
    } else {
      // Fallback: copy link to clipboard
      navigator.clipboard.writeText(window.location.href);
      toast.success("Link copied to clipboard!");
    }
  };

  // Swipe handlers for photo gallery
  const photoSwipeHandlers = useSwipeable({
    onSwipedLeft: () => {
      if (athletePhotos.length > 1) {
        setCurrentPhotoIndex((prev) => (prev === athletePhotos.length - 1 ? 0 : prev + 1));
      }
    },
    onSwipedRight: () => {
      if (athletePhotos.length > 1) {
        setCurrentPhotoIndex((prev) => (prev === 0 ? athletePhotos.length - 1 : prev - 1));
      }
    },
    trackMouse: false,
    trackTouch: true,
  });

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
    <div ref={scrollContainerRef} {...pullHandlers} className="relative">
      {/* Pull to refresh indicator */}
      {pullDistance > 0 && (
        <div
          className="absolute top-0 left-0 right-0 flex items-center justify-center py-2 bg-primary/10 transition-all duration-200"
          style={{ transform: `translateY(${pullDistance - 100}px)` }}
        >
          <RefreshCw className={`h-4 w-4 ${isRefreshing ? "animate-spin" : ""}`} />
          <span className="ml-2 text-sm">{isRefreshing ? "Refreshing..." : "Pull to refresh"}</span>
        </div>
      )}

      {/* Search and Filters */}
      <div className="mb-6 space-y-4">
        {/* Search Bar */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            type="text"
            placeholder="Search by name, sport, skills, interests..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-9 pr-9"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm("")}
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          )}
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
          <Select value={filterSport} onValueChange={setFilterSport}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Sport" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All Sports</SelectItem>
              {Array.from(new Set(athletes.map((a) => a.sport_discipline).filter(Boolean))).map((sport) => (
                <SelectItem key={sport} value={sport!}>
                  {sport}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={filterAvailability} onValueChange={setFilterAvailability}>
            <SelectTrigger>
              <SelectValue placeholder="Filter by Availability" />
            </SelectTrigger>
            <SelectContent position="popper">
              <SelectItem value="all">All Availability</SelectItem>
              {Array.from(new Set(athletes.map((a) => a.availability).filter(Boolean))).map((avail) => (
                <SelectItem key={avail} value={avail!}>
                  {avail}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Input
            type="text"
            placeholder="Filter by Skill..."
            value={filterSkills}
            onChange={(e) => setFilterSkills(e.target.value)}
          />

          <Input
            type="text"
            placeholder="Filter by Interest..."
            value={filterCareerInterests}
            onChange={(e) => setFilterCareerInterests(e.target.value)}
          />
        </div>

        {/* Clear Filters Button */}
        {(filterSport || filterAvailability || filterSkills || filterCareerInterests || searchTerm) && (
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Showing {filteredAthletes.length} of {athletes.length} athletes
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setSearchTerm("");
                setFilterSport("");
                setFilterAvailability("");
                setFilterSkills("");
                setFilterCareerInterests("");
              }}
            >
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAthletes.map((athlete) => (
          <Card
            key={athlete.id}
            className="cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50"
            onClick={async () => {
              setSelectedAthlete(athlete);
              // Increment view count
              try {
                await supabase
                  .from("athlete_profiles")
                  .update({ profile_views: (athlete.profile_views || 0) + 1 })
                  .eq("id", athlete.id);
              } catch (error) {
                console.error("Error tracking view:", error);
              }
              // Load additional details
              loadAthleteDetails(athlete.id, athlete.user_id);
            }}
          >
            <CardHeader className="pb-3">
              <div className="flex flex-col items-center gap-3">
                <Avatar className="h-24 w-24">
                  <AvatarImage
                    src={athlete.photo_url ?? undefined}
                    alt={athlete.profiles.full_name ?? "Athlete"}
                    className="object-cover"
                  />
                  <AvatarFallback>
                    {athlete.profiles.full_name
                      ? athlete.profiles.full_name
                          .split(" ")
                          .map((n) => n[0])
                          .join("")
                          .toUpperCase()
                      : "AT"}
                  </AvatarFallback>
                </Avatar>
                <div className="text-center w-full">
                  <CardTitle className="text-lg">{athlete.profiles.full_name || "Athlete"}</CardTitle>
                  <p className="text-sm text-muted-foreground">{athlete.sport_discipline || "Sport not specified"}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    {athlete.years_of_membership
                      ? `${athlete.years_of_membership} years U.S. Ski & Snowboard`
                      : "\u00A0"}
                  </p>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Bio</p>
                <p className="text-sm text-muted-foreground line-clamp-2">{athlete.bio || "No bio provided"}</p>
              </div>

              <div className="min-h-[2.5rem]">
                <p className="text-xs font-semibold text-foreground mb-1">Highlights</p>
                <p className="text-sm text-muted-foreground line-clamp-2">
                  {athlete.professional_highlights || "Not specified"}
                </p>
              </div>

              <div className="flex items-center gap-2 min-h-[1.5rem]">
                <p className="text-xs font-semibold text-foreground">Availability:</p>
                {athlete.availability ? (
                  <Badge variant="outline" className="text-xs">
                    {athlete.availability}
                  </Badge>
                ) : (
                  <span className="text-xs text-muted-foreground">Not specified</span>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Interests</p>
                {athlete.career_interests && athlete.career_interests.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {athlete.career_interests.slice(0, 2).map((interest, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {interest}
                      </Badge>
                    ))}
                    {athlete.career_interests.length > 2 && (
                      <Badge variant="outline" className="text-xs">
                        +{athlete.career_interests.length - 2}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not specified</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Skills</p>
                {athlete.skills && athlete.skills.length > 0 ? (
                  <div className="flex flex-wrap gap-1">
                    {athlete.skills.slice(0, 3).map((skill, index) => (
                      <Badge key={index} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                    {athlete.skills.length > 3 && (
                      <Badge variant="outline" className="text-xs">
                        +{athlete.skills.length - 3}
                      </Badge>
                    )}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">Not specified</p>
                )}
              </div>

              <div>
                <p className="text-xs font-semibold text-foreground mb-1">Location Preferences</p>
                {athlete.geographic_preferences && athlete.geographic_preferences.length > 0 ? (
                  <p className="text-xs text-muted-foreground line-clamp-1">
                    {athlete.geographic_preferences.slice(0, 2).join(", ")}
                    {athlete.geographic_preferences.length > 2 && ` +${athlete.geographic_preferences.length - 2} more`}
                  </p>
                ) : (
                  <p className="text-xs text-muted-foreground">Not specified</p>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {selectedAthlete && (
        <Dialog
          open={!!selectedAthlete && !showRequestDialog}
          onOpenChange={(open) => {
            if (!open && !showRequestDialog) {
              setSelectedAthlete(null);
            }
          }}
        >
          <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{selectedAthlete.profiles.full_name || "Athlete"}</DialogTitle>
            </DialogHeader>

            <Tabs defaultValue="profile" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="profile">Profile</TabsTrigger>
                <TabsTrigger value="portfolio">Athlete Content</TabsTrigger>
              </TabsList>

              <TabsContent value="profile" className="space-y-6 mt-6">
                <div className="flex items-center gap-4">
                  <Avatar className="h-16 w-16">
                    <AvatarImage src={selectedAthlete.photo_url ?? undefined} className="object-cover" />
                    <AvatarFallback>
                      {selectedAthlete.profiles.full_name
                        ? selectedAthlete.profiles.full_name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .toUpperCase()
                        : "AT"}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <h3 className="font-semibold">{selectedAthlete.profiles.full_name || "Athlete"}</h3>
                    {selectedAthlete.sport_discipline && (
                      <p className="text-sm text-muted-foreground">{selectedAthlete.sport_discipline}</p>
                    )}
                  </div>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Bio</h4>
                  <p className="text-sm text-muted-foreground">{selectedAthlete.bio || "Not specified"}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Professional Highlights</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAthlete.professional_highlights || "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Years of U.S. Ski & Snowboard Membership</h4>
                  <p className="text-sm text-muted-foreground">
                    {selectedAthlete.years_of_membership
                      ? `${selectedAthlete.years_of_membership} years`
                      : "Not specified"}
                  </p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Availability</h4>
                  <p className="text-sm text-muted-foreground">{selectedAthlete.availability || "Not specified"}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Email</h4>
                  <p className="text-sm text-muted-foreground">{selectedAthlete.email || "Not specified"}</p>
                </div>

                <div>
                  <h4 className="font-medium mb-2">Instagram</h4>
                  {selectedAthlete.instagram_url ? (
                    <a
                      href={selectedAthlete.instagram_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline flex items-center gap-2"
                    >
                      <Instagram className="h-4 w-4" />
                      View Profile
                    </a>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Sponsors</h4>
                  {selectedAthlete.sponsors && selectedAthlete.sponsors.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedAthlete.sponsors.map((sponsor, index) => (
                        <Badge key={index} variant="outline">
                          {sponsor}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Skills</h4>
                  {selectedAthlete.skills && selectedAthlete.skills.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedAthlete.skills.map((skill, index) => (
                        <Badge key={index} variant="secondary">
                          {skill}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Career Interests</h4>
                  {selectedAthlete.career_interests && selectedAthlete.career_interests.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedAthlete.career_interests.map((interest, index) => (
                        <Badge key={index} variant="outline">
                          {interest}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Geographic Preferences</h4>
                  {selectedAthlete.geographic_preferences && selectedAthlete.geographic_preferences.length > 0 ? (
                    <p className="text-sm text-muted-foreground">{selectedAthlete.geographic_preferences.join(", ")}</p>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Education</h4>
                  {athleteEducation.length > 0 ? (
                    <div className="space-y-3">
                      {athleteEducation.map((edu) => (
                        <div key={edu.id} className="border-l-2 border-primary/20 pl-3">
                          <p className="font-medium text-sm">{edu.school}</p>
                          {edu.degree && <p className="text-sm text-muted-foreground">{edu.degree}</p>}
                          {edu.graduation_year && (
                            <p className="text-xs text-muted-foreground">Graduated {edu.graduation_year}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Experience</h4>
                  {athleteExperience.length > 0 ? (
                    <div className="space-y-3">
                      {athleteExperience.map((exp) => (
                        <div key={exp.id} className="border-l-2 border-primary/20 pl-3">
                          <p className="font-medium text-sm">{exp.title}</p>
                          {exp.organization && <p className="text-sm text-muted-foreground">{exp.organization}</p>}
                          {exp.description && <p className="text-sm text-muted-foreground mt-1">{exp.description}</p>}
                          <p className="text-xs text-muted-foreground mt-1">
                            {exp.start_date &&
                              new Date(exp.start_date).toLocaleDateString("en-US", { month: "short", year: "numeric" })}
                            {" - "}
                            {exp.is_current
                              ? "Present"
                              : exp.end_date
                                ? new Date(exp.end_date).toLocaleDateString("en-US", {
                                    month: "short",
                                    year: "numeric",
                                  })
                                : "Present"}
                          </p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>

                <div>
                  <h4 className="font-medium mb-2">Certifications</h4>
                  {athleteCertifications.length > 0 ? (
                    <div className="space-y-2">
                      {athleteCertifications.map((cert) => (
                        <div key={cert.id} className="border-l-2 border-primary/20 pl-3">
                          <p className="font-medium text-sm">{cert.name}</p>
                          {cert.issuer && <p className="text-sm text-muted-foreground">{cert.issuer}</p>}
                          {cert.issue_date && (
                            <p className="text-xs text-muted-foreground">
                              Issued{" "}
                              {new Date(cert.issue_date).toLocaleDateString("en-US", {
                                month: "short",
                                year: "numeric",
                              })}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-muted-foreground">Not specified</p>
                  )}
                </div>

                <div>
                  <Button
                    onClick={() => {
                      setShowRequestDialog(true);
                    }}
                    className="w-full"
                    disabled={existingRequests.has(selectedAthlete.id)}
                  >
                    {existingRequests.has(selectedAthlete.id) ? "Request Sent" : "Request Connection"}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="portfolio" className="mt-6">
                <div className="space-y-6">
                  <div>
                    <h4 className="font-medium mb-2">Lifestyle Photos</h4>
                    {athletePhotos.length > 0 ? (
                      <div className="relative touch-pan-y" {...photoSwipeHandlers}>
                        <img
                          src={athletePhotos[currentPhotoIndex]}
                          alt={`Lifestyle photo ${currentPhotoIndex + 1}`}
                          className="w-full h-64 object-cover rounded-lg select-none"
                          draggable={false}
                        />
                        {athletePhotos.length > 1 && (
                          <>
                            <Button
                              variant="outline"
                              size="icon"
                              className="absolute left-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm md:flex hidden"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentPhotoIndex((prev) => (prev === 0 ? athletePhotos.length - 1 : prev - 1));
                              }}
                            >
                              <ChevronLeft className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="outline"
                              size="icon"
                              className="absolute right-2 top-1/2 -translate-y-1/2 bg-background/80 backdrop-blur-sm md:flex hidden"
                              onClick={(e) => {
                                e.stopPropagation();
                                setCurrentPhotoIndex((prev) => (prev === athletePhotos.length - 1 ? 0 : prev + 1));
                              }}
                            >
                              <ChevronRight className="h-4 w-4" />
                            </Button>
                            <div className="absolute bottom-2 left-1/2 -translate-x-1/2 bg-background/80 backdrop-blur-sm px-2 py-1 rounded-full text-xs">
                              {currentPhotoIndex + 1} / {athletePhotos.length}
                            </div>
                            <div className="absolute top-2 left-1/2 -translate-x-1/2 text-xs text-muted-foreground md:hidden">
                              Swipe to navigate
                            </div>
                          </>
                        )}
                      </div>
                    ) : (
                      <p className="text-sm text-muted-foreground">Not specified</p>
                    )}
                  </div>

                  <AthletePortfolioView athleteId={selectedAthlete.id} />
                </div>
              </TabsContent>
            </Tabs>
          </DialogContent>
        </Dialog>
      )}

      {selectedAthlete && showRequestDialog && (
        <Dialog
          open={showRequestDialog}
          onOpenChange={(open) => {
            setShowRequestDialog(open);
            if (!open) {
              setRequestMessage("");
              setOpportunityType("");
            }
          }}
        >
          <DialogContent className="max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Request Connection</DialogTitle>
              <DialogDescription>Send a connection request to this athlete</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
              <div>
                <Label htmlFor="opportunity-type">Opportunity Type (Optional)</Label>
                <Select value={opportunityType} onValueChange={setOpportunityType}>
                  <SelectTrigger id="opportunity-type" className="mt-2">
                    <SelectValue placeholder="Select opportunity type" />
                  </SelectTrigger>
                  <SelectContent className="bg-popover z-50">
                    <SelectItem value="General Inquiry">General Inquiry</SelectItem>
                    {employerRoles
                      .filter((role) => role.title && role.title.trim())
                      .map((role, index) => (
                        <SelectItem key={index} value={role.title}>
                          {role.title}
                        </SelectItem>
                      ))}
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
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
            </div>
            <div className="pt-4 border-t">
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
    </div>
  );
};

export default AthleteDirectory;
