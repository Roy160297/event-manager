import { assetUrl, patternImageUrl, shapeImageUrl, type ParsedSketch, type SketchAssets } from "@/lib/iplanSketch";

// Fetches the pictures iPlan draws a sketch with (the hall's background image
// and one picture per kind of shape) from its public asset bucket, as data URIs
// so the finished SVG needs nothing from the network. Anything that cannot be
// fetched is simply left out - those shapes are then drawn as plain stand-ins.

const MAX_BYTES = 3_000_000;
const cache = new Map<string, string>();

async function toDataUri(url: string): Promise<string | null> {
  const cached = cache.get(url);
  if (cached) return cached;
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) return null;
    const type = response.headers.get("content-type") ?? "";
    if (!type.startsWith("image/")) return null;
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length === 0 || bytes.length > MAX_BYTES) return null;
    const uri = `data:${type};base64,${bytes.toString("base64")}`;
    cache.set(url, uri);
    return uri;
  } catch {
    return null;
  }
}

export async function fetchSketchAssets(sketch: ParsedSketch): Promise<SketchAssets & { complete: boolean }> {
  const modelIds = [...new Set(sketch.shapes.map((shape) => shape.image_model_id).filter((id): id is number => id !== null))];
  const backgroundUrl = assetUrl(sketch.background_url);

  const patternIds = sketch.patterns.map((pattern) => pattern.id);

  const [background, ...pictures] = await Promise.all([
    backgroundUrl ? toDataUri(backgroundUrl) : Promise.resolve(null),
    ...modelIds.map((id) => toDataUri(shapeImageUrl(id))),
    ...patternIds.map((id) => toDataUri(patternImageUrl(id))),
  ]);

  const images = new Map<number, string>();
  modelIds.forEach((id, index) => {
    const uri = pictures[index];
    if (uri) images.set(id, uri);
  });
  const patterns = new Map<number, string>();
  patternIds.forEach((id, index) => {
    const uri = pictures[modelIds.length + index];
    if (uri) patterns.set(id, uri);
  });
  return {
    background,
    images,
    patterns,
    complete: (!backgroundUrl || background !== null) && images.size === modelIds.length && patterns.size === patternIds.length,
  };
}
