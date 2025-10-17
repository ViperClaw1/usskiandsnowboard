import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Upload, X, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PhotoUploaderProps {
  userId: string;
}

const PhotoUploader = ({ userId }: PhotoUploaderProps) => {
  const [photos, setPhotos] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPhotos();
  }, [userId]);

  const loadPhotos = async () => {
    try {
      const { data, error } = await supabase.storage
        .from("athlete-photos")
        .list(`${userId}/lifestyle`, {
          limit: 100,
          sortBy: { column: "created_at", order: "desc" },
        });

      if (error) throw error;

      if (data) {
        const photoUrls = data.map((file) => {
          const { data: urlData } = supabase.storage
            .from("athlete-photos")
            .getPublicUrl(`${userId}/lifestyle/${file.name}`);
          return urlData.publicUrl;
        });
        setPhotos(photoUrls);
      }
    } catch (error) {
      console.error("Error loading photos:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const uploadPromises = Array.from(files).map(async (file) => {
        const fileExt = file.name.split(".").pop();
        const fileName = `${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${userId}/lifestyle/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from("athlete-photos")
          .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("athlete-photos")
          .getPublicUrl(filePath);

        return urlData.publicUrl;
      });

      const uploadedUrls = await Promise.all(uploadPromises);
      setPhotos([...uploadedUrls, ...photos]);
      toast.success(`${files.length} photo(s) uploaded successfully!`);
    } catch (error: any) {
      console.error("Error uploading photos:", error);
      toast.error("Failed to upload photos");
    } finally {
      setUploading(false);
    }
  };

  const handleDeletePhoto = async (photoUrl: string) => {
    try {
      const fileName = photoUrl.split("/").pop();
      const filePath = `${userId}/lifestyle/${fileName}`;

      const { error } = await supabase.storage
        .from("athlete-photos")
        .remove([filePath]);

      if (error) throw error;

      setPhotos(photos.filter((p) => p !== photoUrl));
      toast.success("Photo deleted");
    } catch (error) {
      console.error("Error deleting photo:", error);
      toast.error("Failed to delete photo");
    }
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      <div className="relative">
        <input
          type="file"
          id="photo-upload"
          multiple
          accept="image/*"
          onChange={handleFileUpload}
          className="hidden"
          disabled={uploading}
        />
        <label
          htmlFor="photo-upload"
          className={`flex flex-col items-center justify-center w-full h-40 sm:h-48 lg:h-64 border-2 border-dashed rounded-lg cursor-pointer bg-background hover:bg-muted/50 transition-colors ${
            uploading ? "opacity-50 cursor-not-allowed" : ""
          }`}
        >
          {uploading ? (
            <div className="flex flex-col items-center">
              <Loader2 className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 animate-spin text-primary mb-2" />
              <p className="text-xs sm:text-sm text-muted-foreground">Uploading...</p>
            </div>
          ) : (
            <>
              <Upload className="h-8 w-8 sm:h-10 sm:w-10 lg:h-12 lg:w-12 text-muted-foreground mb-2 sm:mb-4" />
              <p className="text-xs sm:text-sm italic text-muted-foreground/60 text-center px-3 sm:px-4">
                Upload 5+ of your favorite lifestyle or competition photos
              </p>
            </>
          )}
        </label>
      </div>

      <div className="overflow-x-auto max-w-full" >
        {loading ? (
          <div className="flex gap-2 sm:gap-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 aspect-square bg-muted animate-pulse rounded-lg flex-shrink-0" />
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="flex gap-2 sm:gap-3">
            {[...Array(5)].map((_, i) => (
              <div
                key={i}
                className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 aspect-square border-2 border-dashed border-muted rounded-lg flex-shrink-0 flex items-center justify-center"
              >
                <Upload className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-muted-foreground/30" />
              </div>
            ))}
          </div>
        ) : (
          <div className="flex gap-2 sm:gap-3 pb-2">
            {photos.map((photoUrl, index) => (
              <div key={index} className="relative flex-shrink-0 group w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32">
                <img
                  src={photoUrl}
                  alt={`Lifestyle photo ${index + 1}`}
                  className="w-full h-full object-cover rounded-lg"
                />
                <Button
                  size="icon"
                  variant="destructive"
                  className="absolute top-0.5 right-0.5 sm:top-1 sm:right-1 h-5 w-5 sm:h-6 sm:w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={() => handleDeletePhoto(photoUrl)}
                >
                  <X className="h-3 w-3 sm:h-4 sm:w-4" />
                </Button>
              </div>
            ))}
            {photos.length < 5 &&
              [...Array(5 - photos.length)].map((_, i) => (
                <div
                  key={`empty-${i}`}
                  className="w-20 h-20 sm:w-24 sm:h-24 lg:w-32 lg:h-32 aspect-square border-2 border-dashed border-muted rounded-lg flex-shrink-0 flex items-center justify-center"
                >
                  <Upload className="h-5 w-5 sm:h-6 sm:w-6 lg:h-8 lg:w-8 text-muted-foreground/30" />
                </div>
              ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PhotoUploader;
