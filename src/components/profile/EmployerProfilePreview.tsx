import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Building2, MapPin, Users, Globe, Linkedin, Mail, Briefcase } from "lucide-react";

interface EmployerProfilePreviewProps {
  profile: any;
}

export const EmployerProfilePreview = ({ profile }: EmployerProfilePreviewProps) => {
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
        <CardContent className="space-y-6 pt-6">
          {/* Header Section */}
          <div className="flex items-start gap-4">
            <Avatar className="h-20 w-20">
              <AvatarImage src={profile?.logo_url} />
              <AvatarFallback className="bg-primary/10 text-primary text-lg">
                {getInitials(profile?.company_name || "")}
              </AvatarFallback>
            </Avatar>
            <div className="flex-1">
              <h2 className="text-2xl font-bold">{profile?.company_name}</h2>
              {profile?.industry && (
                <p className="text-muted-foreground flex items-center gap-1 mt-1">
                  <Building2 className="h-4 w-4" />
                  {profile.industry}
                </p>
              )}
            </div>
          </div>

          {/* About */}
          {profile?.about && (
            <div>
              <h3 className="font-semibold mb-2">About</h3>
              <p className="text-muted-foreground">{profile.about}</p>
            </div>
          )}

          {/* Company Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {profile?.company_size && (
              <div>
                <p className="text-sm font-medium flex items-center gap-1">
                  <Users className="h-4 w-4" />
                  Company Size
                </p>
                <p className="text-sm text-muted-foreground">{profile.company_size}</p>
              </div>
            )}
            {profile?.hq_location && (
              <div>
                <p className="text-sm font-medium flex items-center gap-1">
                  <MapPin className="h-4 w-4" />
                  Headquarters
                </p>
                <p className="text-sm text-muted-foreground">{profile.hq_location}</p>
              </div>
            )}
          </div>

          {/* Job Opportunities */}
          {(profile?.job_board_url || (profile?.individual_roles && profile.individual_roles.length > 0)) && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3 flex items-center gap-2">
                <Briefcase className="h-4 w-4" />
                Job Opportunities
              </h3>
              <div className="space-y-4">
                {profile.job_board_url && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-1">Company Job Board</p>
                    <a 
                      href={profile.job_board_url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-sm text-primary hover:underline break-all"
                    >
                      {profile.job_board_url}
                    </a>
                  </div>
                )}
                
                {profile.individual_roles && profile.individual_roles.length > 0 && (
                  <div>
                    <p className="text-xs font-medium text-muted-foreground mb-2">Featured Roles</p>
                    <div className="space-y-2">
                      {profile.individual_roles.map((role: any, index: number) => (
                        <div key={index} className="p-3 border rounded-lg hover:border-primary/50 transition-colors">
                          <div className="flex items-start justify-between gap-2 mb-1">
                            <div>
                              <p className="text-sm font-medium">{role.title}</p>
                              {role.location && (
                                <p className="text-xs text-muted-foreground mt-0.5">{role.location}</p>
                              )}
                            </div>
                            <span className="text-xs text-muted-foreground shrink-0">{role.type}</span>
                          </div>
                          <a 
                            href={role.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline break-all"
                          >
                            {role.url}
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Links - Always visible */}
          <div className="border-t pt-4">
            <h3 className="font-semibold mb-3">Links</h3>
            <div className="space-y-2">
              {profile?.website && (
                <div className="flex items-center gap-2 text-sm">
                  <Globe className="h-4 w-4 text-muted-foreground" />
                  <a href={profile.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    Company Website
                  </a>
                </div>
              )}
              {profile?.linkedin_url && (
                <div className="flex items-center gap-2 text-sm">
                  <Linkedin className="h-4 w-4 text-muted-foreground" />
                  <a href={profile.linkedin_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">
                    LinkedIn Profile
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Contact Info */}
          {(profile?.contact_person || profile?.contact_email) && (
            <div className="border-t pt-4">
              <h3 className="font-semibold mb-3">Contact Information</h3>
              <div className="space-y-2">
                {profile?.contact_person && (
                  <div className="text-sm">
                    <p className="font-medium">Contact Person</p>
                    <p className="text-muted-foreground">
                      {profile.contact_person}
                      {profile?.contact_title && ` - ${profile.contact_title}`}
                    </p>
                  </div>
                )}
                {profile?.contact_email && (
                  <div className="flex items-center gap-2 text-sm">
                    <Mail className="h-4 w-4 text-muted-foreground" />
                    <a href={`mailto:${profile.contact_email}`} className="text-primary hover:underline">
                      {profile.contact_email}
                    </a>
                  </div>
                )}
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};
