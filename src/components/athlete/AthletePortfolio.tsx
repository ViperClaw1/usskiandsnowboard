import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { VideoManager } from "./VideoManager";
import { DocumentManager } from "./DocumentManager";
import { AchievementsManager } from "./AchievementsManager";
import { AwardsManager } from "./AwardsManager";
import PhotoUploader from "./PhotoUploader";
import { Video, FileText, Trophy, Award, Camera } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface AthletePortfolioProps {
  athleteId: string;
}

export function AthletePortfolio({ athleteId }: AthletePortfolioProps) {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Athlete Content</h2>
        <p className="text-muted-foreground">
          Showcase your lifestyle photos, competition footage, credentials, achievements, and awards
        </p>
      </div>

      <Tabs defaultValue="photos" className="w-full">
        <TabsList className="grid w-full grid-cols-5">
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Photos</span>
          </TabsTrigger>
          <TabsTrigger value="videos" className="flex items-center gap-2">
            <Video className="h-4 w-4" />
            <span className="hidden sm:inline">Videos</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span className="hidden sm:inline">Documents</span>
          </TabsTrigger>
          <TabsTrigger value="achievements" className="flex items-center gap-2">
            <Trophy className="h-4 w-4" />
            <span className="hidden sm:inline">Achievements</span>
          </TabsTrigger>
          <TabsTrigger value="awards" className="flex items-center gap-2">
            <Award className="h-4 w-4" />
            <span className="hidden sm:inline">Awards</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="photos" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle>Lifestyle Photos</CardTitle>
            </CardHeader>
            <CardContent>
              <PhotoUploader userId={athleteId} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="videos" className="mt-6">
          <VideoManager athleteId={athleteId} />
        </TabsContent>

        <TabsContent value="documents" className="mt-6">
          <DocumentManager athleteId={athleteId} />
        </TabsContent>

        <TabsContent value="achievements" className="mt-6">
          <AchievementsManager athleteId={athleteId} />
        </TabsContent>

        <TabsContent value="awards" className="mt-6">
          <AwardsManager athleteId={athleteId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}