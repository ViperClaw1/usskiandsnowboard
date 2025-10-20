import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { MapPin, Award, Briefcase, Mail, Instagram } from "lucide-react";

interface AthleteProfilePreviewProps {
  profile: any;
  profileData: any;
  viewMode: "public" | "connected";
}

export const AthleteProfilePreview = ({ profile, profileData, viewMode }: AthleteProfilePreviewProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-sm font-medium text-muted-foreground">
            Preview Mode: {viewMode === "public" ? "Public View" : "Connected View"}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Header Section */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profileData?.photo_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(profile?.full_name || "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{profile?.full_name}</h2>
              {profileData?.sport_discipline && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Award className="h-4 w-4" />
                  {profileData.sport_discipline}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          {profileData?.bio && (
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{profileData.bio}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {profileData?.availability && (
              <div>
                <p className="text-sm font-medium">Availability</p>
                <p className="text-sm text-muted-foreground">{profileData.availability}</p>
              </div>
            )}
            {profileData?.years_of_membership && (
              <div>
                <p className="text-sm font-medium">Years of Membership</p>
                <p className="text-sm text-muted-foreground">{profileData.years_of_membership}</p>
              </div>
            )}
          </div>

          {/* Skills */}
          {profileData?.skills && profileData.skills.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Skills</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.skills.map((skill: string) => (
                  <Badge key={skill} variant="secondary">{skill}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Career Interests */}
          {profileData?.career_interests && profileData.career_interests.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2">Career Interests</h3>
              <div className="flex flex-wrap gap-2">
                {profileData.career_interests.map((interest: string) => (
                  <Badge key={interest} variant="outline">{interest}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Geographic Preferences */}
          {profileData?.geographic_preferences && profileData.geographic_preferences.length > 0 && (
            <div>
              <h3 className="font-semibold mb-2 flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Geographic Preferences
              </h3>
              <div className="flex flex-wrap gap-2">
                {profileData.geographic_preferences.map((location: string) => (
                  <Badge key={location} variant="outline">{location}</Badge>
                ))}
              </div>
            </div>
          )}

          {/* Contact Info - Only shown in connected view */}
          {viewMode === "connected" && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Contact Information</h3>
              <div className="space-y-2">
                {profileData?.email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${profileData.email}`} className="text-primary hover:underline">
                      {profileData.email}
                    </a>
                  </div>
                )}
                {profileData?.instagram_url && (
                  <div className="flex items-center gap-2 text-sm">
                    <Instagram className="h-4 w-4 text-muted-foreground" />
                    <a href={profileData.instagram_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                      Instagram Profile
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}

          {viewMode === "public" && (
            <p className="text-xs text-muted-foreground text-center pt-4 border-t">
              Connect with this athlete to view full contact information
            </p>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
