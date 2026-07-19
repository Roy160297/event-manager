"use client";

import { useRef, useState } from "react";
import { SignaturePad } from "./SignaturePad";

export function PdfExportButton({
  label = "הורדת PDF",
  filename,
  eventLabel,
  signerName,
  children,
}: {
  label?: string;
  filename: string;
  eventLabel: string;
  signerName?: string | null;
  children: React.ReactNode;
}) {
  const contentRef = useRef<HTMLDivElement>(null);
  const footerRef = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [signature, setSignature] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function download() {
    if (!contentRef.current || !footerRef.current) return;
    setIsExporting(true);
    setError(null);
    try {
      const { exportElementToPdf } = await import("@/lib/pdfExport");
      await exportElementToPdf({
        contentElement: contentRef.current,
        footerElement: footerRef.current,
        filename,
      });
    } catch (err) {
      setError(err instanceof Error ? err.message : "שגיאה ביצירת ה-PDF");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="rounded-full border border-accent px-3 py-1.5 text-sm text-accent hover:bg-accent-soft"
      >
        {label}
      </button>

      {open && (
        <div className="flex flex-col gap-3 rounded-lg border border-border-classic bg-accent-soft/30 p-3">
          <p className="text-xs text-foreground/60">
            אפשר להוסיף חתימה שתופיע בתחתית כל עמוד ב-PDF, או להוריד ללא חתימה.
          </p>
          <SignaturePad onChange={setSignature} />
          {error && <p className="text-xs text-red-600">{error}</p>}
          <button
            type="button"
            onClick={download}
            disabled={isExporting}
            className="self-start rounded-full bg-accent px-4 py-1.5 text-sm font-medium text-accent-foreground hover:opacity-90 disabled:opacity-60"
          >
            {isExporting ? "מכין PDF..." : "הורד PDF"}
          </button>
        </div>
      )}

      {/* Offscreen printable content + signature footer, captured via html2canvas on download.
          Colors here are inline hex, not Tailwind gray utilities - Tailwind v4's palette is
          oklch()-based and html2canvas can't parse that CSS Color 4 syntax, so it throws. */}
      <div className="pointer-events-none fixed left-[-99999px] top-0" aria-hidden>
        <div
          ref={contentRef}
          dir="rtl"
          className="w-[780px] p-8 text-[13px] leading-relaxed"
          style={{ backgroundColor: "#ffffff", color: "#000000" }}
        >
          <div dir="ltr" className="mb-4 flex items-baseline justify-start gap-1.5">
            <span className="text-lg font-black uppercase tracking-tight">House</span>
            <span className="font-serif text-sm italic" style={{ color: "#525252" }}>
              No.
            </span>
            <span className="text-lg font-black uppercase tracking-tight">Seven</span>
          </div>
          {children}
        </div>
        <div ref={footerRef} dir="rtl" className="w-[780px]" style={{ backgroundColor: "#ffffff" }}>
          <div
            className="flex items-end justify-between px-8 py-4 text-[13px]"
            style={{ borderTop: "1px solid #999999", color: "#555555" }}
          >
            <div className="flex flex-col items-start gap-1.5">
              {signature && (
                // eslint-disable-next-line @next/next/no-img-element -- captured by html2canvas, not rendered to the user
                <img src={signature} alt="" className="h-16 object-contain" />
              )}
              <div className="w-56 pt-1" style={{ borderTop: "1px solid #999999" }}>
                חתימה
              </div>
              {signerName && <div className="font-medium">מנהל אירוע: {signerName}</div>}
            </div>
            <div>{eventLabel}</div>
          </div>
        </div>
      </div>
    </div>
  );
}
