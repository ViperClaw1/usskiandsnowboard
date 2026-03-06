// ==============================
// Imports
// ==============================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RichTextarea } from "@/components/ui/rich-textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { toast } from "sonner";
import { Plus, Pencil, Trash2, Eye, EyeOff, FileText } from "lucide-react";
import { format } from "date-fns";
import { TrainingArticle } from "@/types/training";
import { ARTICLE_CATEGORIES } from "@/constants/training";

// ==============================
// Utility Functions
// ==============================

/** Converts an article title into a URL-safe slug */
const generateSlug = (title: string) =>
  title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

/** Estimates reading time in minutes from HTML body content */
const estimateReadingTime = (text: string) =>
  Math.max(1, Math.ceil(text.replace(/<[^>]*>/g, "").split(/\s+/).length / 200));

/** Max allowed image size before conversion (2 MB) */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Validates that a file is ≤ 5 MB then converts it to WebP via Canvas API.
 * Returns a new File with `.webp` extension and `image/webp` MIME type.
 */
const convertToWebp = (file: File): Promise<File> =>
  new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Image must be 5 MB or smaller"));
      return;
    }
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      canvas.getContext("2d")!.drawImage(img, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Conversion failed"));
            return;
          }
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        0.88,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("Could not read image"));
    };
    img.src = url;
  });

// ==============================
// Types / Interfaces
// ==============================

/** Form state for create/edit dialog */
interface ArticleForm {
  title: string;
  subtitle: string;
  body: string;
  category: string;
  author_name: string;
  slug: string;
  isPublished: boolean;
}

// ==============================
// Constants
// ==============================

const EMPTY_FORM: ArticleForm = {
  title: "",
  subtitle: "",
  body: "",
  category: "",
  author_name: "",
  slug: "",
  isPublished: false,
};

// ==============================
// Component Definition
// Smart component — manages full CRUD for training articles.
// Handles file uploads, status toggling, and delete confirmation.
// ==============================

export const TrainingArticleManager = () => {
  // ==============================
  // State & Hooks
  // ==============================
  const { user } = useAuth();
  const [articles, setArticles] = useState<TrainingArticle[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [authorFile, setAuthorFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [authorPreview, setAuthorPreview] = useState<string | null>(null);

  // ==============================
  // Effects — Data Fetching
  // ==============================

  const fetchArticles = useCallback(async () => {
    const { data } = await supabase.from("training_articles").select("*").order("created_at", { ascending: false });
    if (data) setArticles(data as TrainingArticle[]);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchArticles();
  }, [fetchArticles]);

  // ==============================
  // Event Handlers — Dialog
  // ==============================

  /** Opens the dialog in "create" mode with a blank form */
  const openCreate = () => {
    setEditingId(null);
    setForm(EMPTY_FORM);
    setHeroFile(null);
    setAuthorFile(null);
    setHeroPreview(null);
    setAuthorPreview(null);
    setDialogOpen(true);
  };

  /** Opens the dialog in "edit" mode pre-populated with the article's data */
  const openEdit = (a: TrainingArticle) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      subtitle: a.subtitle || "",
      body: a.body,
      category: a.category || "",
      author_name: a.author_name || "",
      slug: a.slug,
      isPublished: a.status === "published",
    });
    setHeroFile(null);
    setAuthorFile(null);
    setHeroPreview(a.hero_image_url);
    setAuthorPreview(a.author_image_url);
    setDialogOpen(true);
  };

  // ==============================
  // Event Handlers — File Upload
  // Uploads an image to Supabase storage and returns its public URL
  // ==============================

  const uploadFile = async (file: File, path: string): Promise<string> => {
    const filePath = `${user?.id}/${path}.webp`;
    const { error } = await supabase.storage.from("training-images").upload(filePath, file, { upsert: true });
    if (error) throw error;
    const { data } = supabase.storage.from("training-images").getPublicUrl(filePath);
    return data.publicUrl;
  };

  // ==============================
  // Event Handlers — Save Article
  // Handles both create and update, including optional image uploads
  // ==============================

  const handleSave = async () => {
    if (!form.title.trim() || !form.body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    if (!user) return;
    setSaving(true);

    try {
      let heroUrl = heroPreview;
      let authorUrl = authorPreview;
      const articleId = editingId || crypto.randomUUID();

      if (heroFile) heroUrl = await uploadFile(heroFile, `articles/${articleId}/hero`);
      if (authorFile) authorUrl = await uploadFile(authorFile, `authors/${articleId}`);

      const slug = form.slug.trim() || generateSlug(form.title);
      const readingTime = estimateReadingTime(form.body);

      const record = {
        title: form.title.trim(),
        slug,
        subtitle: form.subtitle.trim() || null,
        body: form.body,
        category: form.category || null,
        hero_image_url: heroUrl,
        author_name: form.author_name.trim() || null,
        author_image_url: authorUrl,
        status: form.isPublished ? "published" : "draft",
        reading_time_minutes: readingTime,
        published_at: form.isPublished ? new Date().toISOString() : null,
        created_by: user.id,
      };

      if (editingId) {
        const { error } = await supabase.from("training_articles").update(record).eq("id", editingId);
        if (error) throw error;
        toast.success("Article updated");
      } else {
        const { error } = await supabase.from("training_articles").insert({ id: articleId, ...record });
        if (error) throw error;
        toast.success("Article created");
      }

      setDialogOpen(false);
      fetchArticles();
    } catch (e: any) {
      toast.error(e.message || "Failed to save article");
    } finally {
      setSaving(false);
    }
  };

  // ==============================
  // Event Handlers — Publish Toggle
  // ==============================

  const togglePublish = async (a: TrainingArticle) => {
    const newStatus = a.status === "published" ? "draft" : "published";
    const { error } = await supabase
      .from("training_articles")
      .update({
        status: newStatus,
        published_at: newStatus === "published" ? new Date().toISOString() : null,
      })
      .eq("id", a.id);

    if (error) {
      toast.error("Failed to update status");
    } else {
      toast.success(newStatus === "published" ? "Article published" : "Article unpublished");
      fetchArticles();
    }
  };

  // ==============================
  // Event Handlers — Delete Article
  // ==============================

  const handleDelete = async () => {
    if (!deleteId) return;
    const { error } = await supabase.from("training_articles").delete().eq("id", deleteId);
    if (error) {
      toast.error("Failed to delete");
    } else {
      toast.success("Article deleted");
      fetchArticles();
    }
    setDeleteId(null);
  };

  // ==============================
  // Render
  // ==============================

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          Training Articles
        </CardTitle>
        <Button onClick={openCreate} size="sm">
          <Plus className="h-4 w-4 mr-1" /> New Article
        </Button>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : articles.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No articles yet. Create your first one!</div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Title</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Published</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {articles.map((a) => (
                  <TableRow key={a.id}>
                    <TableCell className="font-medium max-w-[200px] truncate">{a.title}</TableCell>
                    <TableCell>{a.category || "—"}</TableCell>
                    <TableCell>
                      <Badge variant={a.status === "published" ? "default" : "secondary"} className="text-xs">
                        {a.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{a.published_at ? format(new Date(a.published_at), "MMM d, yyyy") : "—"}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(a)} title="Edit">
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => togglePublish(a)}
                          title={a.status === "published" ? "Unpublish" : "Publish"}
                        >
                          {a.status === "published" ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => setDeleteId(a.id)}
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>

      {/* Create / Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editingId ? "Edit Article" : "New Article"}</DialogTitle>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div>
              <Label>Title *</Label>
              <Input
                value={form.title}
                onChange={(e) =>
                  setForm((f) => ({
                    ...f,
                    title: e.target.value,
                    slug: editingId ? f.slug : generateSlug(e.target.value),
                  }))
                }
                placeholder="Article title"
              />
            </div>
            <div>
              <Label>Slug</Label>
              <Input
                value={form.slug}
                onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                placeholder="article-slug"
              />
            </div>
            <div>
              <Label>Subtitle</Label>
              <Input
                value={form.subtitle}
                onChange={(e) => setForm((f) => ({ ...f, subtitle: e.target.value }))}
                placeholder="Optional italic subheading"
              />
            </div>
            <div>
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {ARTICLE_CATEGORIES.map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Body (HTML) *</Label>
              <RichTextarea
                value={form.body}
                onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                placeholder="Your article content…"
                className="min-h-[200px]"
              />
            </div>
            <div>
              <Label>Author Name</Label>
              <Input
                value={form.author_name}
                onChange={(e) => setForm((f) => ({ ...f, author_name: e.target.value }))}
                placeholder="e.g. Michele Roberts, Head of Athlete Programs"
              />
            </div>
            <div>
              <Label>Author Image (headshot or logo)</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const webp = await convertToWebp(f);
                    setAuthorFile(webp);
                    setAuthorPreview(URL.createObjectURL(webp));
                  } catch (err: any) {
                    toast.error(err.message || "Failed to process image");
                    e.target.value = "";
                  }
                }}
              />
              {authorPreview && (
                <img src={authorPreview} alt="Author" className="h-12 w-12 rounded-full object-cover mt-2" />
              )}
              <p className="text-xs text-muted-foreground mt-1">
                Max 2 MB · Automatically converted to WebP · If no image is uploaded, the U.S. Ski &amp; Snowboard logo
                is used as fallback.
              </p>
            </div>
            <div>
              <Label>Hero Image</Label>
              <Input
                type="file"
                accept="image/*"
                onChange={async (e) => {
                  const f = e.target.files?.[0];
                  if (!f) return;
                  try {
                    const webp = await convertToWebp(f);
                    setHeroFile(webp);
                    setHeroPreview(URL.createObjectURL(webp));
                  } catch (err: any) {
                    toast.error(err.message || "Failed to process image");
                    e.target.value = "";
                  }
                }}
              />
              {heroPreview && <img src={heroPreview} alt="Hero" className="h-32 w-full rounded-lg object-cover mt-2" />}
              <p className="text-xs text-muted-foreground mt-1">Max 2 MB · Automatically converted to WebP</p>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={form.isPublished} onCheckedChange={(v) => setForm((f) => ({ ...f, isPublished: v }))} />
              <Label>{form.isPublished ? "Published" : "Draft"}</Label>
            </div>
            <Button onClick={handleSave} disabled={saving} className="w-full">
              {saving ? "Saving…" : editingId ? "Update Article" : "Create Article"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={(o) => !o && setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Article</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. The article will be permanently removed.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
