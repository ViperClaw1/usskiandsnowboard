import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Video as VideoIcon, FileText, Trophy, Award, Calendar, MapPin, Download } from "lucide-react";
import { format } from "date-fns";
import { Button } from "@/components/ui/button";

interface AthletePortfolioViewProps {
  athleteId: string;
}

export function AthletePortfolioView({ athleteId }: AthletePortfolioViewProps) {
  const { data: videos, isLoading: videosLoading } = useQuery({
    queryKey: ["athlete-videos-view", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_videos")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: achievements, isLoading: achievementsLoading } = useQuery({
    queryKey: ["athlete-achievements-view", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_achievements")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("achievement_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: awards, isLoading: awardsLoading } = useQuery({
    queryKey: ["athlete-awards-view", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_awards")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("award_date", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const { data: documents, isLoading: documentsLoading } = useQuery({
    queryKey: ["athlete-documents-view", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_documents")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const isLoading = videosLoading || achievementsLoading || awardsLoading || documentsLoading;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin" />
      </div>
    );
  }

  const hasContent = (videos && videos.length > 0) || 
                     (achievements && achievements.length > 0) || 
                     (awards && awards.length > 0) ||
                     (documents && documents.length > 0);

  if (!hasContent) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        <p>No portfolio content available</p>
      </div>
    );
  }

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      {/* Videos Section */}
      {videos && videos.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <VideoIcon className="h-5 w-5" />
            Videos ({videos.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            {videos.map((video) => (
              <Card key={video.id}>
                <CardContent className="p-4 space-y-3">
                  <video
                    src={video.video_url}
                    controls
                    className="w-full rounded-lg bg-black"
                    preload="metadata"
                  >
                    Your browser does not support the video tag.
                  </video>
                  <div>
                    <h5 className="font-semibold">{video.title}</h5>
                    {video.description && (
                      <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.video_type.charAt(0).toUpperCase() + video.video_type.slice(1)}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Documents Section */}
      {documents && documents.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Documents ({documents.length})
          </h4>
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <h5 className="font-semibold">{doc.title}</h5>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.document_type.charAt(0).toUpperCase() + doc.document_type.slice(1)} • {formatFileSize(doc.file_size_bytes)}
                      </p>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(doc.document_url, '_blank')}
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {/* Achievements Timeline */}
      {achievements && achievements.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Trophy className="h-5 w-5" />
            Achievements Timeline ({achievements.length})
          </h4>
          <div className="space-y-4">
            {achievements.map((achievement, index) => (
              <div key={achievement.id} className="relative">
                {index !== achievements.length - 1 && (
                  <div className="absolute left-[15px] top-8 bottom-0 w-0.5 bg-border" />
                )}
                <Card>
                  <CardContent className="p-4">
                    <div className="flex gap-4">
                      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                        <Trophy className="h-4 w-4 text-primary" />
                      </div>
                      <div className="flex-1 space-y-2">
                        <div>
                          <h5 className="font-semibold">{achievement.title}</h5>
                          {achievement.result && (
                            <p className="text-sm text-primary font-medium">{achievement.result}</p>
                          )}
                        </div>
                        {achievement.description && (
                          <p className="text-sm text-muted-foreground">{achievement.description}</p>
                        )}
                        <div className="flex items-center gap-4 text-xs text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Calendar className="h-3 w-3" />
                            {format(new Date(achievement.achievement_date), "MMM d, yyyy")}
                          </span>
                          {achievement.location && (
                            <span className="flex items-center gap-1">
                              <MapPin className="h-3 w-3" />
                              {achievement.location}
                            </span>
                          )}
                          {achievement.category && (
                            <Badge variant="secondary" className="text-xs">
                              {achievement.category}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Awards Section */}
      {awards && awards.length > 0 && (
        <div>
          <h4 className="font-semibold mb-3 flex items-center gap-2">
            <Award className="h-5 w-5" />
            Awards & Recognition ({awards.length})
          </h4>
          <div className="grid gap-4 md:grid-cols-2">
            {awards.map((award) => (
              <Card key={award.id}>
                <CardContent className="p-4 space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="flex-shrink-0 h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center">
                      <Award className="h-5 w-5 text-amber-500" />
                    </div>
                    <div>
                      <h5 className="font-semibold">{award.title}</h5>
                      <p className="text-sm text-muted-foreground">{award.issuer}</p>
                      <p className="text-xs text-muted-foreground mt-1">
                        {format(new Date(award.award_date), "MMMM yyyy")}
                      </p>
                    </div>
                  </div>
                  {award.description && (
                    <p className="text-sm text-muted-foreground">{award.description}</p>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}