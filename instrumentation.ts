// pdf-parse (built on pdf.js) references the browser-only `DOMMatrix` global
// in some of its Node runtime code paths, even though we only extract text
// and never render to a canvas. That's harmless on machines where it happens
// not to be hit, but Vercel's serverless functions crash on it with
// "ReferenceError: DOMMatrix is not defined" as soon as pdf-parse loads. This
// hook runs once before the server handles any request, so stubbing the
// global here covers every code path regardless of which one gets exercised.
export function register() {
  if (typeof globalThis.DOMMatrix === "undefined") {
    (globalThis as unknown as { DOMMatrix: unknown }).DOMMatrix = class DOMMatrix {};
  }
}
