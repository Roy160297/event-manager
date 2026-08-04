"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteChecklistPhoto, uploadChecklistPhoto } from "@/app/events/[id]/tasks/actions";

export interface ChecklistPhoto {
  id: string;
  url: string;
  storagePath: string;
}

// Full-resolution phone photos (often 8-15MB) can exceed the server action
// body size limit and are slow to upload over venue wifi - downscale to a
// reasonable max dimension and re-encode as JPEG before sending. Falls back
// to the original file if compression fails or doesn't actually help.
async function compressImage(file: File, maxDimension = 1600, quality = 0.82): Promise<File> {
  if (!file.type.startsWith("image/")) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, maxDimension / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);
    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
    if (!blob || blob.size >= file.size) return file;
    return new File([blob], file.name.replace(/\.\w+$/, "") + ".jpg", { type: "image/jpeg" });
  } catch {
    return file;
  }
}

// Shared "attach photos" section for the end of every checklist (after its
// notes field): a thumbnail grid plus upload buttons, backed by the
// checklist_photos table + the checklist-photos storage bucket. Two separate
// file inputs (rather than one) since a plain <input type="file"> doesn't
// reliably offer a camera option on mobile once `capture` isn't set - the
// `capture="environment"` input opens the camera directly, the plain one
// opens the gallery/file picker.
export function ChecklistPhotos({
  eventId,
  checklistKey,
  photos,
  canEdit,
  slot = null,
  label = "תמונות",
  compact = false,
}: {
  eventId: string;
  checklistKey: string;
  photos: ChecklistPhoto[];
  canEdit: boolean;
  // Lets one checklist_key carry more than one distinctly-labeled photo slot
  // (e.g. the summary report's counter/additional-guests photos, separate
  // from its general end-of-checklist gallery) - see migration 049.
  slot?: string | null;
  label?: string;
  // Tighter styling (no top border/padding) for slots embedded directly
  // under a specific field, instead of the default end-of-checklist look.
  compact?: boolean;
}) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFilesSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const input = e.target;
    if (files.length === 0) return;
    setError(null);
    setIsUploading(true);
    try {
      for (const file of files) {
        const compressed = await compressImage(file);
        const formData = new FormData();
        formData.set("file", compressed);
        await uploadChecklistPhoto(eventId, checklistKey, formData, slot);
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "שגיאה בהעלאת התמונה";
      // The action ID embedded in the page's JS goes stale after a new
      // deploy - if this phone's tab has been open since before one, the
      // fix is a reload (fetches the current build), not a retry.
      if (message.includes("Failed to find Server Action")) {
        setError("האתר עודכן לגרסה חדשה - טוען מחדש...");
        setTimeout(() => window.location.reload(), 1200);
      } else {
        setError(message);
      }
    } finally {
      setIsUploading(false);
      input.value = "";
    }
  }

  async function handleDelete(photoId: string, storagePath: string) {
    setError(null);
    setPendingId(photoId);
    try {
      await deleteChecklistPhoto(eventId, photoId, storagePath);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה במחיקת התמונה");
    } finally {
      setPendingId(null);
    }
  }

  if (!canEdit && photos.length === 0) return null;

  return (
    <div className={compact ? "flex flex-col gap-1.5" : "flex flex-col gap-2 border-t border-border-classic pt-3"}>
      <p className="text-sm font-medium">{label}</p>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {photos.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {photos.map((photo) => (
            <div key={photo.id} className="group relative">
              <a href={photo.url} target="_blank" rel="noopener noreferrer">
                {/* eslint-disable-next-line @next/next/no-img-element -- also captured by html2canvas in the PDF export */}
                <img
                  src={photo.url}
                  alt=""
                  className="h-24 w-24 rounded-md border border-border-classic object-cover"
                />
              </a>
              {canEdit && (
                <button
                  type="button"
                  onClick={() => handleDelete(photo.id, photo.storagePath)}
                  disabled={pendingId === photo.id}
                  title="מחק תמונה"
                  className="absolute -left-1.5 -top-1.5 rounded-full bg-red-600 px-1.5 py-0.5 text-xs text-white hover:bg-red-700 disabled:opacity-50"
                >
                  ✕
                </button>
              )}
            </div>
          ))}
        </div>
      )}

      {canEdit && (
        <div className="flex flex-wrap gap-2">
          <input
            ref={cameraInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            className="hidden"
            onChange={handleFilesSelected}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            multiple
            className="hidden"
            onChange={handleFilesSelected}
          />
          <button
            type="button"
            onClick={() => cameraInputRef.current?.click()}
            disabled={isUploading}
            className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft disabled:opacity-50"
          >
            {isUploading ? "מעלה..." : "צילום תמונה"}
          </button>
          <button
            type="button"
            onClick={() => galleryInputRef.current?.click()}
            disabled={isUploading}
            className="self-start rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft disabled:opacity-50"
          >
            {isUploading ? "מעלה..." : "בחירה מהגלריה"}
          </button>
        </div>
      )}
    </div>
  );
}
