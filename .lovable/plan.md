
## Plan: 2 MB limit + client-side WebP conversion for Hero and Author images

### What needs to change
Only `TrainingArticleManager.tsx` — specifically the two `onChange` handlers for the file inputs, and the `uploadFile` helper.

### Approach

**Client-side conversion to WebP** using the browser's `Canvas` API — no extra packages needed:
1. When a file is selected, draw it onto an offscreen `<canvas>` element
2. Call `canvas.toBlob('image/webp', quality)` to get a WebP blob
3. Wrap the blob in a `new File([blob], name, { type: 'image/webp' })` so it can be passed to the existing upload flow unchanged

**2 MB size check** — validate the *original* file before conversion (if someone uploads a 10 MB PNG the conversion would still likely exceed 2 MB; checking before is the conventional UX pattern). We also keep a check post-conversion just in case.

**Helper function** to keep it DRY — used for both hero and author images:
```typescript
const MAX_IMAGE_BYTES = 2 * 1024 * 1024; // 2 MB

const convertToWebp = (file: File): Promise<File> => {
  return new Promise((resolve, reject) => {
    if (file.size > MAX_IMAGE_BYTES) {
      reject(new Error("Image must be 2 MB or smaller"));
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
          if (!blob) { reject(new Error("Conversion failed")); return; }
          const baseName = file.name.replace(/\.[^.]+$/, "");
          resolve(new File([blob], `${baseName}.webp`, { type: "image/webp" }));
        },
        "image/webp",
        0.88
      );
    };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("Could not read image")); };
    img.src = url;
  });
};
```

**Update `uploadFile`** to always use `.webp` extension (ignoring original ext):
```typescript
const filePath = `${user?.id}/${path}.webp`;
```

**Update both `onChange` handlers** to call `convertToWebp` before setting state — show a `toast.error` if it throws (e.g., over 2 MB):
```typescript
onChange={async (e) => {
  const f = e.target.files?.[0];
  if (!f) return;
  try {
    const webp = await convertToWebp(f);
    setHeroFile(webp);
    setHeroPreview(URL.createObjectURL(webp));
  } catch (err: any) {
    toast.error(err.message || "Failed to process image");
    e.target.value = ""; // reset input
  }
}}
```

**UI hint** — add helper text under each file input (similar to the author image fallback note):
```
Max 2 MB · Automatically converted to WebP
```

### Files to change
- `src/components/dashboard/admin/TrainingArticleManager.tsx`
  - Add `convertToWebp` helper (above the component or inside it)
  - Update `uploadFile` to use `.webp` extension
  - Update both `onChange` file input handlers to use `convertToWebp`
  - Add hint text under Hero Image input
  - Update hint text under Author Image input

No DB migration needed. No new dependencies.
