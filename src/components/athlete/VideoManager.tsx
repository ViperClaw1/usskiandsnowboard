import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Upload, Video, Trash2, Loader2 } from "lucide-react";

interface Video {
  id: string;
  title: string;
  description: string | null;
  video_url: string;
  video_type: string;
  thumbnail_url: string | null;
  created_at: string;
}

interface VideoManagerProps {
  athleteId: string;
}

export function VideoManager({ athleteId }: VideoManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [newVideo, setNewVideo] = useState({
    title: "",
    description: "",
    video_type: "highlight" as const,
  });
  const queryClient = useQueryClient();

  const { data: videos, isLoading } = useQuery({
    queryKey: ["athlete-videos", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_videos")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Video[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("athlete-videos")
        .upload(fileName, file, {
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("athlete-videos")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("athlete_videos")
        .insert({
          athlete_id: athleteId,
          title: newVideo.title,
          description: newVideo.description || null,
          video_url: publicUrl,
          video_type: newVideo.video_type,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-videos", athleteId] });
      setNewVideo({ title: "", description: "", video_type: "highlight" });
      toast.success("Video uploaded successfully");
      setUploading(false);
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (video: Video) => {
      const urlParts = video.video_url.split('/');
      const filePath = urlParts.slice(-2).join('/');

      const { error: storageError } = await supabase.storage
        .from("athlete-videos")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from("athlete_videos")
        .delete()
        .eq("id", video.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-videos", athleteId] });
      toast.success("Video deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newVideo.title) {
      toast.error("Please enter a title first");
      return;
    }

    if (file.size > 100 * 1024 * 1024) {
      toast.error("File size must be less than 100MB");
      return;
    }

    setUploading(true);
    uploadMutation.mutate(file);
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Upload Video
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="video-title">Title *</Label>
            <Input
              id="video-title"
              value={newVideo.title}
              onChange={(e) => setNewVideo({ ...newVideo, title: e.target.value })}
              placeholder="e.g., 2024 National Championship Run"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="video-description">Description</Label>
            <Textarea
              id="video-description"
              value={newVideo.description}
              onChange={(e) => setNewVideo({ ...newVideo, description: e.target.value })}
              placeholder="Add details about this video..."
              rows={3}
              maxLength={500}
            />
          </div>

          <div>
            <Label htmlFor="video-type">Video Type</Label>
            <Select
              value={newVideo.video_type}
              onValueChange={(value: any) => setNewVideo({ ...newVideo, video_type: value })}
            >
              <SelectTrigger id="video-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="competition">Competition Footage</SelectItem>
                <SelectItem value="introduction">Introduction Video</SelectItem>
                <SelectItem value="highlight">Highlight Reel</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="video-file">Video File (Max 100MB)</Label>
            <div className="mt-2">
              <Input
                id="video-file"
                type="file"
                accept="video/mp4,video/quicktime,video/x-msvideo,video/webm"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Accepted formats: MP4, MOV, AVI, WebM
            </p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading video...
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-semibold">Your Videos ({videos?.length || 0})</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : videos && videos.length > 0 ? (
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
                    <h4 className="font-semibold">{video.title}</h4>
                    {video.description && (
                      <p className="text-sm text-muted-foreground mt-1">{video.description}</p>
                    )}
                    <p className="text-xs text-muted-foreground mt-1">
                      {video.video_type.charAt(0).toUpperCase() + video.video_type.slice(1)}
                    </p>
                  </div>
                  <Button
                    variant="destructive"
                    size="sm"
                    onClick={() => deleteMutation.mutate(video)}
                    disabled={deleteMutation.isPending}
                  >
                    <Trash2 className="h-4 w-4 mr-2" />
                    Delete
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <Video className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No videos uploaded yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}