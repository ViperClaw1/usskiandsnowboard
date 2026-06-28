// ==============================
// Imports
// ==============================

import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/components/auth/AuthContext";
import { useTrainingTypography, useUpdateTrainingTypography } from "@/hooks/useTrainingTypography";
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
import { Plus, Pencil, Trash2, Eye, EyeOff, FileText, Type, Save, ExternalLink, ScanEye, Clock, User as UserIcon } from "lucide-react";
import { format } from "date-fns";
import { TrainingArticle } from "@/types/training";
import { ARTICLE_CATEGORIES } from "@/constants/training";
import { sanitizeArticleHtml } from "@/lib/sanitizeArticleHtml";

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

/** Max allowed image size before conversion (5 MB) */
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

const FONT_OPTIONS = [
  { label: "Default (inherit)", value: "__none" },
  { label: "Montserrat", value: "Montserrat, sans-serif" },
  { label: "Inter", value: "Inter, sans-serif" },
  { label: "Roboto", value: "Roboto, sans-serif" },
  { label: "Open Sans", value: "Open Sans, sans-serif" },
  { label: "Lato", value: "Lato, sans-serif" },
];

const FONT_SIZE_OPTIONS = ["12", "13", "14", "15", "16", "17", "18", "20"];

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
// Global typography is driven by useTrainingTypography (staleTime: 0 so the
// admin always reads current DB state on open) and useUpdateTrainingTypography
// (optimistic update → all subscribers re-render instantly, then async persist).
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
  const [previewArticle, setPreviewArticle] = useState<TrainingArticle | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<ArticleForm>(EMPTY_FORM);
  const [heroFile, setHeroFile] = useState<File | null>(null);
  const [authorFile, setAuthorFile] = useState<File | null>(null);
  const [heroPreview, setHeroPreview] = useState<string | null>(null);
  const [authorPreview, setAuthorPreview] = useState<string | null>(null);

  // staleTime: 0 → admin always sees current DB value when panel opens.
  // Optimistic updates via useUpdateTrainingTypography propagate to all
  // mounted subscribers instantly without a network round-trip.
  const { typography, typographyStyle } = useTrainingTypography({ staleTime: 0 });
  const { update: updateTypography } = useUpdateTrainingTypography();

  const globalFontFamily = typography.font_family;
  const globalFontSize = typography.font_size;

  // Pending (staged) typography state — updated by dropdowns but NOT persisted
  // until the user clicks "Save Font Settings" and confirms the dialog.
  const [pendingFontFamily, setPendingFontFamily] = useState(globalFontFamily);
  const [pendingFontSize, setPendingFontSize] = useState(globalFontSize);
  const [fontConfirmOpen, setFontConfirmOpen] = useState(false);

  // Sync pending state whenever DB values load / change (e.g. on first mount).
  useEffect(() => {
    setPendingFontFamily(globalFontFamily);
    setPendingFontSize(globalFontSize);
  }, [globalFontFamily, globalFontSize]);

  const hasFontChanges =
    pendingFontFamily !== globalFontFamily || pendingFontSize !== globalFontSize;

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
  // Event Handlers — Global Typography
  // Dropdowns write only to local pending state.
  // Actual DB persist happens in handleConfirmFontApply after user confirms.
  // ==============================

  const handleFontFamilyChange = (value: string) => {
    setPendingFontFamily(value === "__none" ? "" : value);
  };

  const handleFontSizeChange = (value: string) => {
    setPendingFontSize(value === "__none" ? "" : value);
  };

  const handleConfirmFontApply = () => {
    updateTypography({ font_family: pendingFontFamily, font_size: pendingFontSize });
    setFontConfirmOpen(false);
  };

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

  /** Opens the dialog in "edit" mode pre-populated with the article's data.
   *  body is passed through sanitizeArticleHtml so that inline font-size /
   *  font-family styles baked in by Google Docs (or other rich text sources)
   *  are stripped before the content is loaded into the editor — preventing
   *  them from overriding the parent's dynamic typography settings. */
  const openEdit = (a: TrainingArticle) => {
    setEditingId(a.id);
    setForm({
      title: a.title,
      subtitle: a.subtitle || "",
      body: sanitizeArticleHtml(a.body),
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
  // Derived Values
  // ==============================

  /** Inline style applied to the RichTextarea wrapper for live font preview.
      CSS vars propagate into the contentEditable via inheritance. */
  const bodyPreviewStyle: React.CSSProperties = {
    ...typographyStyle,
    ...(globalFontFamily && { ["--rt-body-font-family" as string]: globalFontFamily }),
    ...(globalFontSize && { ["--rt-body-font-size" as string]: `${globalFontSize}px` }),
  };

  // ==============================
  // Render
  // ==============================

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <CardTitle className="flex items-center gap-2 shrink-0">
          <FileText className="h-5 w-5" />
          Training Articles
        </CardTitle>

        {/* Global typography controls + Save + New Article */}
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:flex-wrap">
          {/* Font selects row */}
          <div className="flex items-center gap-2 max-[369px]:flex-wrap min-[370px]:flex-nowrap w-full sm:w-auto">
            <Type className="h-4 w-4 text-muted-foreground shrink-0" />
            {/* Body Font Family */}
            <Select value={pendingFontFamily || "__none"} onValueChange={handleFontFamilyChange}>
              <SelectTrigger className="h-9 w-40 max-[369px]:w-full text-xs">
                <SelectValue placeholder="Body Font" />
              </SelectTrigger>
              <SelectContent>
                {FONT_OPTIONS.map((opt) => (
                  <SelectItem
                    key={opt.value}
                    value={opt.value}
                    style={opt.value !== "__none" ? { fontFamily: opt.value } : undefined}
                    className="text-xs"
                  >
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Body Font Size */}
            <Select value={pendingFontSize || "__none"} onValueChange={handleFontSizeChange}>
              <SelectTrigger className="h-9 w-24 max-[369px]:w-full text-xs">
                <SelectValue placeholder="Size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none" className="text-xs">
                  Default
                </SelectItem>
                {FONT_SIZE_OPTIONS.map((s) => (
                  <SelectItem key={s} value={s} className="text-xs">
                    {s}px
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Action buttons row */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <Button
              size="sm"
              variant="outline"
              disabled={!hasFontChanges}
              onClick={() => setFontConfirmOpen(true)}
              className="gap-1.5 w-full sm:w-auto"
            >
              <Save className="h-3.5 w-3.5" />
              Save Font Settings
            </Button>
            <Button onClick={openCreate} size="sm" className="w-full sm:w-auto">
              <Plus className="h-4 w-4 mr-1" /> New Article
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {loading ? (
          <div className="py-8 text-center text-muted-foreground">Loading…</div>
        ) : articles.length === 0 ? (
          <div className="py-8 text-center text-muted-foreground">No articles yet. Create your first one!</div>
        ) : (
          <>
            {/* ── Desktop table (≥ 830 px) ── */}
            <div className="hidden [@media(min-width:830px)]:block overflow-x-auto">
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
                      <TableCell className="font-medium max-w-[200px] truncate" style={typographyStyle}>
                        {a.title}
                      </TableCell>
                      <TableCell style={typographyStyle}>{a.category || "—"}</TableCell>
                      <TableCell>
                        <Badge variant={a.status === "published" ? "default" : "secondary"} style={typographyStyle}>
                          {a.status}
                        </Badge>
                      </TableCell>
                      <TableCell style={typographyStyle}>
                        {a.published_at ? format(new Date(a.published_at), "MMM d, yyyy") : "—"}
                      </TableCell>
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

            {/* ── Mobile / tablet card list (< 830 px) ── */}
            <div className="flex flex-col gap-3 [@media(min-width:830px)]:hidden">
              {articles.map((a) => (
                <div
                  key={a.id}
                  className="group relative rounded-xl border border-border bg-card px-4 py-3 shadow-sm transition-shadow hover:shadow-md"
                >
                  {/* Status pill — top-right */}
                  <div className="absolute top-3 right-3">
                    <Badge variant={a.status === "published" ? "default" : "secondary"} className="text-xs capitalize">
                      {a.status}
                    </Badge>
                  </div>

                  {/* Title */}
                  <p className="pr-28 font-semibold leading-snug line-clamp-2 text-foreground" style={typographyStyle}>
                    {a.title}
                  </p>

                  {/* Meta row */}
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                    {a.category && (
                      <span className="inline-flex items-center gap-1">
                        <FileText className="h-3 w-3 shrink-0" />
                        {a.category}
                      </span>
                    )}
                    {a.published_at && <span>{format(new Date(a.published_at), "MMM d, yyyy")}</span>}
                  </div>

                  {/* Action strip */}
                  <div className="mt-3 flex items-center gap-1 border-t border-border/60 pt-2.5">
                    <Button size="sm" variant="ghost" className="h-8 gap-1.5 px-2 text-xs" onClick={() => openEdit(a)}>
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-8 gap-1.5 px-2 text-xs"
                      onClick={() => togglePublish(a)}
                    >
                      {a.status === "published" ? (
                        <>
                          <EyeOff className="h-3.5 w-3.5" />
                          Unpublish
                        </>
                      ) : (
                        <>
                          <Eye className="h-3.5 w-3.5" />
                          Publish
                        </>
                      )}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="ml-auto h-8 gap-1.5 px-2 text-xs text-destructive hover:text-destructive"
                      onClick={() => setDeleteId(a.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                      Delete
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </>
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
              {/* Wrap with global font preview so the admin sees the chosen typography while writing */}
              <div style={bodyPreviewStyle}>
                <RichTextarea
                  value={form.body}
                  onChange={(e) => setForm((f) => ({ ...f, body: e.target.value }))}
                  placeholder="Your article content…"
                  className="min-h-[200px]"
                />
              </div>
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
                Max 5 MB · Automatically converted to WebP · If no image is uploaded, the U.S. Ski &amp; Snowboard logo
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
              <p className="text-xs text-muted-foreground mt-1">Max 5 MB · Automatically converted to WebP</p>
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

      {/* Font Settings Confirmation Dialog */}
      <AlertDialog open={fontConfirmOpen} onOpenChange={setFontConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Apply Font Settings to All Articles?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-sm text-muted-foreground">
                <p>
                  You are about to update the global font style for <strong>all training articles</strong>. These
                  changes will be visible immediately to every user browsing the Training section.
                </p>
                <p className="font-medium text-foreground">
                  ⚠️ This cannot be automatically undone — you will need to manually revert the settings.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmFontApply}>Apply Settings</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};
