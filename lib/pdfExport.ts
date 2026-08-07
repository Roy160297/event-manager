// Renders a DOM node (and a matching footer node, e.g. a signature line) to
// a multi-page A4 PDF. We rasterize via html2canvas rather than drawing text
// with jsPDF directly because jsPDF's built-in fonts have no Hebrew glyphs -
// capturing the already browser-rendered (correctly shaped, RTL) HTML and
// slicing it across pages keeps the Hebrew text intact. Uses the
// html2canvas-pro fork (not the original html2canvas) because Tailwind v4's
// generated stylesheet defines its color palette as CSS custom properties
// using oklch()/lab(), which the unmaintained original throws on while
// walking the document's computed styles - even for elements that don't use
// those colors themselves.
const PAGE_WIDTH_MM = 210;
const PAGE_HEIGHT_MM = 297;
const MARGIN_MM = 10;
const FOOTER_GAP_MM = 4;

// Checklist photos are plain <img src="https://.../storage/v1/object/public/
// checklist-photos/..."> tags - they display fine on the page (no CORS
// needed for a normal image display), but html2canvas has to read their
// pixels into a canvas, which does require CORS, and silently drops any
// image that fails that check rather than erroring the whole export. Swap
// each one for a same-origin-fetched data: URL first, which sidesteps CORS
// entirely regardless of the storage bucket's configuration.
async function inlineExternalImages(root: HTMLElement) {
  const bucketPrefix = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/checklist-photos/`;
  const imgs = Array.from(root.querySelectorAll("img")).filter((img) => img.src.startsWith(bucketPrefix));
  if (imgs.length === 0) return;

  const { fetchChecklistPhotoDataUrl } = await import("@/app/events/[id]/tasks/actions");
  await Promise.all(
    imgs.map(async (img) => {
      const path = decodeURIComponent(img.src.slice(bucketPrefix.length));
      try {
        const dataUrl = await fetchChecklistPhotoDataUrl(path);
        if (!dataUrl) return;
        await new Promise<void>((resolve) => {
          img.onload = () => resolve();
          img.onerror = () => resolve();
          img.src = dataUrl;
        });
      } catch {
        // Leave the original src - html2canvas will just skip this one
        // image rather than fail the whole export.
      }
    }),
  );
}

const CAPTURE_SCALE = 2;

// A page break is just "cut the rasterized canvas at this pixel row" with no
// idea what's there - if that row happens to fall inside a photo thumbnail,
// the photo gets sliced in half across two pages. Record each <img>'s
// vertical span (in canvas-pixel space, matching html2canvas's scale) before
// capture so the pagination loop below can push the break above the photo
// instead of through it.
function getProtectedRanges(root: HTMLElement): [number, number][] {
  const rootTop = root.getBoundingClientRect().top;
  return Array.from(root.querySelectorAll("img")).map((img) => {
    const rect = img.getBoundingClientRect();
    return [(rect.top - rootTop) * CAPTURE_SCALE, (rect.bottom - rootTop) * CAPTURE_SCALE];
  });
}

// Moves a naive page-end pixel row up to just above any photo it would
// otherwise cut through - the photo starts fresh on the next page instead.
// Ignores a range that already started before this page (can't move the
// break earlier than where the page began) or one taller than a full page
// (nothing to do but accept the cut in that unavoidable case).
function adjustedSliceEnd(renderedPx: number, naiveEnd: number, ranges: [number, number][]): number {
  let end = naiveEnd;
  let changed = true;
  while (changed) {
    changed = false;
    for (const [top, bottom] of ranges) {
      if (top > renderedPx && top < end && bottom > end) {
        end = top;
        changed = true;
      }
    }
  }
  return Math.max(end, renderedPx + 1);
}

async function buildPdf({
  contentElement,
  footerElement,
}: {
  contentElement: HTMLElement;
  footerElement: HTMLElement;
}) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
  ]);

  await Promise.all([inlineExternalImages(contentElement), inlineExternalImages(footerElement)]);
  const protectedRanges = getProtectedRanges(contentElement);

  const [contentCanvas, footerCanvas] = await Promise.all([
    html2canvas(contentElement, { scale: CAPTURE_SCALE, backgroundColor: "#ffffff", useCORS: true }),
    html2canvas(footerElement, { scale: CAPTURE_SCALE, backgroundColor: "#ffffff", useCORS: true }),
  ]);

  const contentWidthMm = PAGE_WIDTH_MM - MARGIN_MM * 2;
  const pxPerMm = contentCanvas.width / contentWidthMm;
  const footerHeightMm = footerCanvas.height / (footerCanvas.width / contentWidthMm);
  const bodyHeightMm = PAGE_HEIGHT_MM - MARGIN_MM * 2;
  const pageSlicePx = Math.max(1, Math.floor(bodyHeightMm * pxPerMm));

  const slice = document.createElement("canvas");
  slice.width = contentCanvas.width;
  const ctx = slice.getContext("2d");
  if (!ctx) throw new Error("שגיאה ביצירת ה-PDF");

  const pdf = new jsPDF({ unit: "mm", format: "a4" });
  // JPEG instead of PNG: a scale-2 rasterized text page is lossless-PNG-hostile
  // (font anti-aliasing noise defeats PNG's compression) and balloons to
  // several MB per page; JPEG at high quality looks identical here and is a
  // fraction of the size. The canvases are fully opaque (backgroundColor set
  // above) so JPEG's lack of alpha isn't a problem.
  const footerImage = footerCanvas.toDataURL("image/jpeg", 0.92);

  let renderedPx = 0;
  let pageIndex = 0;
  let lastSliceHeightMm = 0;
  do {
    const naiveEnd = Math.min(renderedPx + pageSlicePx, contentCanvas.height);
    const sliceEnd = adjustedSliceEnd(renderedPx, naiveEnd, protectedRanges);
    const sliceHeightPx = sliceEnd - renderedPx;
    if (pageIndex > 0) pdf.addPage();

    slice.height = Math.max(1, sliceHeightPx);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    if (sliceHeightPx > 0) {
      ctx.drawImage(contentCanvas, 0, renderedPx, contentCanvas.width, sliceHeightPx, 0, 0, contentCanvas.width, sliceHeightPx);
      const sliceHeightMm = sliceHeightPx / pxPerMm;
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", MARGIN_MM, MARGIN_MM, contentWidthMm, sliceHeightMm);
      lastSliceHeightMm = sliceHeightMm;
    }

    renderedPx += sliceHeightPx;
    pageIndex += 1;
  } while (renderedPx < contentCanvas.height);

  // The signature footer belongs only at the very end of the document, not on
  // every page: stamp it on the last content page if there's room left below
  // the content, otherwise give it a trailing page of its own.
  const remainingOnLastPageMm = PAGE_HEIGHT_MM - MARGIN_MM * 2 - lastSliceHeightMm;
  if (remainingOnLastPageMm < footerHeightMm + FOOTER_GAP_MM) {
    pdf.addPage();
  }
  pdf.addImage(
    footerImage,
    "JPEG",
    MARGIN_MM,
    PAGE_HEIGHT_MM - MARGIN_MM - footerHeightMm,
    contentWidthMm,
    footerHeightMm,
  );

  return pdf;
}

export async function exportElementToPdf({
  contentElement,
  footerElement,
  filename,
}: {
  contentElement: HTMLElement;
  footerElement: HTMLElement;
  filename: string;
}) {
  const pdf = await buildPdf({ contentElement, footerElement });
  pdf.save(filename);
}

// Same rendering as exportElementToPdf, but returns the PDF as a base64
// string instead of triggering a browser download - used to bundle several
// checklists as email attachments rather than saving each one to disk.
export async function renderElementToPdfBase64({
  contentElement,
  footerElement,
}: {
  contentElement: HTMLElement;
  footerElement: HTMLElement;
}): Promise<string> {
  const pdf = await buildPdf({ contentElement, footerElement });
  const dataUri = pdf.output("datauristring");
  return dataUri.slice(dataUri.indexOf("base64,") + "base64,".length);
}
