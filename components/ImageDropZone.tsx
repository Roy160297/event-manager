"use client";

import { useState } from "react";

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

  function assignFile(file: File | null) {
    if (!file || !fileInputRef.current) return;
    const dataTransfer = new DataTransfer();
    dataTransfer.items.add(file);
    fileInputRef.current.files = dataTransfer.files;
    onFileName(file.name || `תמונה.${file.type.split("/")[1] ?? "png"}`);
  }

  function handlePaste(e: React.ClipboardEvent) {
    const items = e.clipboardData?.items;
    if (!items) return;
    for (const item of items) {
      if (!item.type.startsWith("image/")) continue;
      assignFile(item.getAsFile());
      e.preventDefault();
      break;
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = Array.from(e.dataTransfer.files).find((f) => f.type.startsWith("image/"));
    if (file) assignFile(file);
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
        onChange={(e) => onFileName(e.target.files?.[0]?.name ?? null)}
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
        <span className="text-sm text-foreground/60">{fileName ?? "לא נבחרה תמונה"}</span>
      </div>
    </div>
  );
}
