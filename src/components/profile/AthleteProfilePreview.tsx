import { RefObject } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { MapPin, Award, Mail, Instagram, ImagePlus, Loader2 } from "lucide-react";

interface AthleteProfilePreviewProps {
  profile: any;
  profileData: any;
  viewMode: "public" | "connected";
  bgInputRef?: RefObject<HTMLInputElement>;
  onBgUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  uploadingBg?: boolean;
}

export const AthleteProfilePreview = ({
  profile,
  profileData,
  viewMode,
  bgInputRef,
  onBgUpload,
  uploadingBg,
}: AthleteProfilePreviewProps) => {
  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const bgUrl = profileData?.background_image_url;
  const isOwner = !!onBgUpload;

  return (
    <Card className="overflow-hidden">
      {/* Banner */}
      <div className="relative -mx-0 -mt-0">
        {bgInputRef && onBgUpload && (
          <input
            ref={bgInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onBgUpload}
          />
        )}

        {bgUrl ? (
          <div
            className="h-28 bg-cover bg-center"
            style={{ backgroundImage: `url(${bgUrl})` }}
          />
        ) : (
          <div className="h-28 bg-gradient-to-br from-primary/20 via-primary/10 to-muted flex items-center justify-center">
            {isOwner && !uploadingBg && (
              <Button
                variant="outline"
                size="sm"
                className="bg-background/80 backdrop-blur-sm"
                onClick={() => bgInputRef?.current?.click()}
              >
                <ImagePlus className="h-4 w-4 mr-2" />
                Add background photo
              </Button>
            )}
            {isOwner && uploadingBg && (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            )}
          </div>
        )}

        {isOwner && bgUrl && (
          <button
            className="absolute top-2 left-2 flex items-center gap-1 rounded-full bg-background/80 backdrop-blur-sm px-2 py-1 text-xs font-medium hover:bg-background/95 transition-colors"
            onClick={() => bgInputRef?.current?.click()}
            disabled={uploadingBg}
          >
            {uploadingBg ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : (
              <ImagePlus className="h-3 w-3" />
            )}
            Change photo
          </button>
        )}

        {/* Straddling avatar */}
        <Avatar className="absolute -bottom-8 left-6 h-16 w-16 border-4 border-background shadow-lg">
          <AvatarImage src={profileData?.photo_url} className="object-cover" />
          <AvatarFallback className="bg-primary/10 text-primary text-sm font-semibold">
            {getInitials(profile?.full_name || "")}
          </AvatarFallback>
        </Avatar>
      </div>

      <CardContent className="space-y-6 pt-6">
        {/* Name / sport — padded to clear the protruding avatar */}
        <div className="pt-10 pb-2">
          <h2 className="text-2xl font-bold leading-tight">{profile?.full_name || "Name not set"}</h2>
          <p className="text-muted-foreground flex items-center gap-1 mt-1">
            <Award className="h-4 w-4" />
            {profileData?.sport_discipline || "Sport not specified"}
          </p>
        </div>

        {/* Bio */}
        {profileData?.bio && (
          <div>
            <h3 className="font-semibold mb-2">About</h3>
            <p className="text-muted-foreground">{profileData.bio}</p>
          </div>
        )}

        {/* Details Grid */}
        {(profileData?.availability || profileData?.years_of_membership) && (
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
        )}

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

        {/* Professional Highlights */}
        {profileData?.professional_highlights && (
          <div>
            <h3 className="font-semibold mb-2">Professional Highlights</h3>
            <p className="text-sm text-muted-foreground">{profileData.professional_highlights}</p>
          </div>
        )}

        {/* Sponsors */}
        {profileData?.sponsors && profileData.sponsors.length > 0 && (
          <div>
            <h3 className="font-semibold mb-2">Sponsors</h3>
            <div className="flex flex-wrap gap-2">
              {profileData.sponsors.map((sponsor: string) => (
                <Badge key={sponsor} variant="secondary">{sponsor}</Badge>
              ))}
            </div>
          </div>
        )}

        {/* Contact Info */}
        {(profileData?.email || profileData?.instagram_url) && (
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
      </CardContent>
    </Card>
  );
};
