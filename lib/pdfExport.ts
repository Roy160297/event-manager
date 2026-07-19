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

export async function exportElementToPdf({
  contentElement,
  footerElement,
  filename,
}: {
  contentElement: HTMLElement;
  footerElement: HTMLElement;
  filename: string;
}) {
  const [{ default: jsPDF }, { default: html2canvas }] = await Promise.all([
    import("jspdf"),
    import("html2canvas-pro"),
  ]);

  const [contentCanvas, footerCanvas] = await Promise.all([
    html2canvas(contentElement, { scale: 2, backgroundColor: "#ffffff" }),
    html2canvas(footerElement, { scale: 2, backgroundColor: "#ffffff" }),
  ]);

  const contentWidthMm = PAGE_WIDTH_MM - MARGIN_MM * 2;
  const pxPerMm = contentCanvas.width / contentWidthMm;
  const footerHeightMm = footerCanvas.height / (footerCanvas.width / contentWidthMm);
  const bodyHeightMm = PAGE_HEIGHT_MM - MARGIN_MM * 2 - footerHeightMm - FOOTER_GAP_MM;
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
  do {
    const sliceHeightPx = Math.min(pageSlicePx, contentCanvas.height - renderedPx);
    if (pageIndex > 0) pdf.addPage();

    slice.height = Math.max(1, sliceHeightPx);
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, slice.width, slice.height);
    if (sliceHeightPx > 0) {
      ctx.drawImage(contentCanvas, 0, renderedPx, contentCanvas.width, sliceHeightPx, 0, 0, contentCanvas.width, sliceHeightPx);
      const sliceHeightMm = sliceHeightPx / pxPerMm;
      pdf.addImage(slice.toDataURL("image/jpeg", 0.92), "JPEG", MARGIN_MM, MARGIN_MM, contentWidthMm, sliceHeightMm);
    }

    pdf.addImage(
      footerImage,
      "JPEG",
      MARGIN_MM,
      PAGE_HEIGHT_MM - MARGIN_MM - footerHeightMm,
      contentWidthMm,
      footerHeightMm,
    );

    renderedPx += sliceHeightPx;
    pageIndex += 1;
  } while (renderedPx < contentCanvas.height);

  pdf.save(filename);
}
