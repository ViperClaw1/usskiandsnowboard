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
import { FileText, Trash2, Download, Loader2 } from "lucide-react";

interface Document {
  id: string;
  title: string;
  description: string | null;
  document_url: string;
  document_type: string;
  file_size_bytes: number | null;
  created_at: string;
}

interface DocumentManagerProps {
  athleteId: string;
}

export function DocumentManager({ athleteId }: DocumentManagerProps) {
  const [uploading, setUploading] = useState(false);
  const [newDocument, setNewDocument] = useState({
    title: "",
    description: "",
    document_type: "resume" as const,
  });
  const queryClient = useQueryClient();

  const { data: documents, isLoading } = useQuery({
    queryKey: ["athlete-documents", athleteId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("athlete_documents")
        .select("*")
        .eq("athlete_id", athleteId)
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as Document[];
    },
  });

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${Date.now()}.${fileExt}`;

      const { error: uploadError } = await supabase.storage
        .from("athlete-documents")
        .upload(fileName, file, {
          contentType: file.type,
        });

      if (uploadError) throw uploadError;

      const { data: { publicUrl } } = supabase.storage
        .from("athlete-documents")
        .getPublicUrl(fileName);

      const { error: insertError } = await supabase
        .from("athlete_documents")
        .insert({
          athlete_id: athleteId,
          title: newDocument.title,
          description: newDocument.description || null,
          document_url: publicUrl,
          document_type: newDocument.document_type,
          file_size_bytes: file.size,
        });

      if (insertError) throw insertError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-documents", athleteId] });
      setNewDocument({ title: "", description: "", document_type: "resume" });
      toast.success("Document uploaded successfully");
      setUploading(false);
    },
    onError: (error: Error) => {
      toast.error(`Upload failed: ${error.message}`);
      setUploading(false);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (doc: Document) => {
      const urlParts = doc.document_url.split('/');
      const filePath = urlParts.slice(-2).join('/');

      const { error: storageError } = await supabase.storage
        .from("athlete-documents")
        .remove([filePath]);

      if (storageError) throw storageError;

      const { error: deleteError } = await supabase
        .from("athlete_documents")
        .delete()
        .eq("id", doc.id);

      if (deleteError) throw deleteError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["athlete-documents", athleteId] });
      toast.success("Document deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Delete failed: ${error.message}`);
    },
  });

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!newDocument.title) {
      toast.error("Please enter a title first");
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      toast.error("File size must be less than 10MB");
      return;
    }

    setUploading(true);
    uploadMutation.mutate(file);
  };

  const formatFileSize = (bytes: number | null) => {
    if (!bytes) return "Unknown size";
    const mb = bytes / (1024 * 1024);
    return mb < 1 ? `${(bytes / 1024).toFixed(0)} KB` : `${mb.toFixed(1)} MB`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" />
            Upload Document
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="doc-title">Title *</Label>
            <Input
              id="doc-title"
              value={newDocument.title}
              onChange={(e) => setNewDocument({ ...newDocument, title: e.target.value })}
              placeholder="e.g., Resume 2024"
              maxLength={100}
            />
          </div>

          <div>
            <Label htmlFor="doc-description">Description</Label>
            <Textarea
              id="doc-description"
              value={newDocument.description}
              onChange={(e) => setNewDocument({ ...newDocument, description: e.target.value })}
              placeholder="Add details about this document..."
              rows={2}
              maxLength={300}
            />
          </div>

          <div>
            <Label htmlFor="doc-type">Document Type</Label>
            <Select
              value={newDocument.document_type}
              onValueChange={(value: any) => setNewDocument({ ...newDocument, document_type: value })}
            >
              <SelectTrigger id="doc-type">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="resume">Resume/CV</SelectItem>
                <SelectItem value="transcript">Transcript</SelectItem>
                <SelectItem value="certification">Certification</SelectItem>
                <SelectItem value="reference">Reference Letter</SelectItem>
                <SelectItem value="other">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label htmlFor="doc-file">Document File (Max 10MB)</Label>
            <div className="mt-2">
              <Input
                id="doc-file"
                type="file"
                accept=".pdf,.doc,.docx,image/jpeg,image/png"
                onChange={handleFileChange}
                disabled={uploading}
              />
            </div>
            <p className="text-sm text-muted-foreground mt-1">
              Accepted formats: PDF, Word, JPEG, PNG
            </p>
          </div>

          {uploading && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" />
              Uploading document...
            </div>
          )}
        </CardContent>
      </Card>

      <div className="space-y-4">
        <h3 className="font-semibold">Your Documents ({documents?.length || 0})</h3>
        {isLoading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin" />
          </div>
        ) : documents && documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((doc) => (
              <Card key={doc.id}>
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="flex items-start gap-3 flex-1">
                    <FileText className="h-5 w-5 mt-0.5 text-muted-foreground" />
                    <div className="flex-1">
                      <h4 className="font-semibold">{doc.title}</h4>
                      {doc.description && (
                        <p className="text-sm text-muted-foreground">{doc.description}</p>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">
                        {doc.document_type.charAt(0).toUpperCase() + doc.document_type.slice(1)} • {formatFileSize(doc.file_size_bytes)}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(doc.document_url, '_blank')}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="destructive"
                      size="sm"
                      onClick={() => deleteMutation.mutate(doc)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        ) : (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>No documents uploaded yet</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}