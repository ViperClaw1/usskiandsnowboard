import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { DocumentManager } from "./DocumentManager";
import PhotoUploader from "./PhotoUploader";
import { FileText, Camera } from "lucide-react";
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
          Showcase your lifestyle photos and professional documents
        </p>
      </div>

      <Tabs defaultValue="photos" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="photos" className="flex items-center gap-2">
            <Camera className="h-4 w-4" />
            <span>Photos</span>
          </TabsTrigger>
          <TabsTrigger value="documents" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            <span>Documents</span>
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

        <TabsContent value="documents" className="mt-6">
          <DocumentManager athleteId={athleteId} />
        </TabsContent>
      </Tabs>
    </div>
  );
}