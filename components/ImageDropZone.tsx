"use client";

import { useState } from "react";

// iPlan screenshots are often multi-megabyte, high-resolution PNGs - that
// size dominates both the upload time and Gemini's own processing time for
// no accuracy benefit (the dense text panels are still perfectly legible
// well below this size). Downscale/re-encode client-side before it ever
// leaves the browser. Skip small files outright - nothing to gain there.
const MAX_DIMENSION = 2200;
const JPEG_QUALITY = 0.85;
const SKIP_BELOW_BYTES = 400_000;

async function compressScreenshot(file: File): Promise<File> {
  if (file.size < SKIP_BELOW_BYTES) return file;
  if (typeof createImageBitmap === "undefined") return file;

  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement("canvas");
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, 0, 0, width, height);
    bitmap.close();

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", JPEG_QUALITY));
    if (!blob || blob.size >= file.size) return file;

    const newName = file.name.replace(/\.[^.]+$/, "") + ".jpg";
    return new File([blob], newName, { type: "image/jpeg" });
  } catch {
    // Compression is a pure optimization - if anything about it fails
    // (unsupported format, etc.), fall back to the original file untouched.
    return file;
  }
}

export function ImageDropZone({
  name = "file",
  fileName,
  onFileName,
  fileInputRef,
}: {
  name?: string;
  fileName: string | null;
  onFileName: (name: string | null) => void;
  fileInputRef: React.RefObject<HTMLInputElement | null>;
}) {
  const [isDragOver, setIsDragOver] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  async function assignFile(file: File | null) {
    if (!file || !fileInputRef.current) return;
    setIsCompressing(true);
    let toAssign = file;
    try {
      toAssign = await compressScreenshot(file);
    } finally {
      setIsCompressing(false);
    }
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(toAssign);
    fileInputRef.current.files = dataTransfer.files;
    onFileName(toAssign.name || `תמונה.${toAssign.type.split("/")[1] ?? "png"}`);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      void assignFile(item.getAsFile());
      e.preventDefault();
      break;
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) void assignFile(file);
  }

  return (
    <div
      tabIndex={0}
      onPaste={handlePaste}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={handleDrop}
      className={`flex flex-col items-center gap-2 rounded-md border-2 border-dashed px-4 py-5 text-center focus:outline-none ${
        isDragOver ? "border-accent bg-accent-soft/50" : "border-border-classic"
      }`}
    >
      <input
        ref={fileInputRef}
        type="file"
        name={name}
        accept="image/png,image/jpeg,image/webp"
        required
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0] ?? null;
          if (file) void assignFile(file);
        }}
      />
      <p className="text-sm text-foreground/60">גוררים/מדביקים תמונה לכאן או מעלים קובץ</p>
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
        >
          בחרו קובץ
        </button>
        <span className="text-sm text-foreground/60">
          {isCompressing ? "מכווץ תמונה..." : (fileName ?? "לא נבחרה תמונה")}
        </span>
      </div>
    </div>
  );
}
