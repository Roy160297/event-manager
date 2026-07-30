"use client";

import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteChecklistPhoto, uploadChecklistPhoto } from "@/app/events/[id]/tasks/actions";

export interface ChecklistPhoto {
  id: string;
  url: string;
  storagePath: string;
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
}: {
  eventId: string;
  checklistKey: string;
  photos: ChecklistPhoto[];
  canEdit: boolean;
}) {
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);

  async function handleFileSelected(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    const input = e.target;
    if (!file) return;
    setError(null);
    setIsUploading(true);
    const formData = new FormData();
    formData.set("file", file);
    try {
      await uploadChecklistPhoto(eventId, checklistKey, formData);
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה בהעלאת התמונה");
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
    <div className="flex flex-col gap-2 border-t border-border-classic pt-3">
      <p className="text-sm font-medium">תמונות</p>

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
            onChange={handleFileSelected}
          />
          <input
            ref={galleryInputRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={handleFileSelected}
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
