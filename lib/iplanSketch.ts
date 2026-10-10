// iPlan keeps an event's floor-plan sketch as structured data (every shape with
// its position, size and rotation; tables with number and seat count), not as a
// picture. The extension sends the sketch's print page as raw HTML; this reads
// the shapes out of it, lists the tables / food stands for the staffing page,
// and draws the hall as an SVG that looks like iPlan's own: the hall's
// background image, each shape's own picture (tables with their chairs, DJ
// booth, chuppah...) and the table numbers with how many are seated.

export interface SketchTable {
  num: number;
  seats_count: number;
  seated_total_guests_count: number;
  seated_optioned_guests_count: number;
}

export interface SketchShape {
  id: string;
  name: string;
  shape_text: string;
  x: number;
  y: number;
  width: number;
  height: number;
  rotate_angle: number;
  z_index: number;
  seatable: boolean;
  width_without_chairs: number | null;
  height_without_chairs: number | null;
  table: SketchTable | null;
  // How iPlan draws it: the picture of its shape model (a public image) or a
  // plain filled geometry.
  image_model_id: number | null;
  geometry: { tag: "rect" | "ellipse"; fill: string; stroke: string; stroke_width: number } | null;
  text_color: string | null;
}

export interface ParsedSketch {
  shapes: SketchShape[];
  background_url: string | null;
  // Texture fills ("pattern_65") that shapes use, with the tile size.
  patterns: { id: number; width: number; height: number }[];
}

export interface SketchDraft {
  tables: { label: string; capacity: number; seated: number }[];
  foodStands: { label: string }[];
}

const ASSET_HOST = "iplan-uuc-production.s3.amazonaws.com";

function decodeEntities(value: string): string {
  return value
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&#x27;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function num(value: unknown, fallback = 0): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : fallback;
}

function attr(source: string, name: string): string | null {
  const match = source.match(new RegExp(`${name}="([^"]*)"`));
  return match ? match[1] : null;
}

// Only iPlan's own public asset bucket is ever fetched.
export function assetUrl(candidate: string | null): string | null {
  if (!candidate) return null;
  try {
    const url = new URL(decodeEntities(candidate));
    if (url.protocol !== "https:" || url.hostname !== ASSET_HOST) return null;
    return `${url.origin}${url.pathname}`;
  } catch {
    return null;
  }
}

export function shapeImageUrl(modelId: number): string {
  return `https://${ASSET_HOST}/public/venue_sketch/shapes/${modelId}/original.png`;
}

export function patternImageUrl(patternId: number): string {
  return `https://${ASSET_HOST}/public/venue_sketch/fill_patterns/${patternId}/original.jpg`;
}

export function patternIdOf(fill: string): number | null {
  const match = fill.match(/^url\(#pattern_(\d+)\)$/);
  return match ? Number(match[1]) : null;
}

function parsePatterns(html: string, shapes: SketchShape[]): ParsedSketch["patterns"] {
  const used = new Set(shapes.map((shape) => (shape.geometry ? patternIdOf(shape.geometry.fill) : null)).filter((id): id is number => id !== null));
  const found: ParsedSketch["patterns"] = [];
  for (const id of used) {
    const tag = html.match(new RegExp(`<pattern id=['"]pattern_${id}['"][^>]*>`));
    const width = tag ? Number(tag[0].match(/width=['"](\d+)['"]/)?.[1]) : NaN;
    const height = tag ? Number(tag[0].match(/height=['"](\d+)['"]/)?.[1]) : NaN;
    if (Number.isFinite(width) && Number.isFinite(height) && width > 0 && height > 0) found.push({ id, width, height });
  }
  return found;
}

function parseBackground(html: string): string | null {
  const found: Record<string, string> = {};
  for (const tag of html.matchAll(/<image[^>]*class="main_image"[^>]*>/g)) {
    const href = assetUrl(attr(tag[0], "xlink:href") ?? attr(tag[0], "href"));
    const type = attr(tag[0], "data-type");
    if (href && type) found[type] = href;
  }
  return found.black_white ?? found.color ?? null;
}

export function parseSketchHtml(html: string): ParsedSketch {
  const starts = [...html.matchAll(/<g class="sketch_shape" data-init_model="([^"]*)"/g)];
  const shapes: SketchShape[] = [];
  starts.forEach((match, index) => {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(decodeEntities(match[1]));
    } catch {
      return;
    }
    if (typeof raw !== "object" || raw === null) return;

    // What follows the shape's tag up to the next shape is how it is drawn.
    const from = (match.index ?? 0) + match[0].length;
    const to = Math.min(index + 1 < starts.length ? (starts[index + 1].index ?? html.length) : html.length, from + 6000);
    const body = html.slice(from, to);

    const imageId = body.match(/shapes\/(\d+)\/original\./);
    const geometryTag = body.match(/<g class="geometry"([^>]*)>\s*<(\w+)/);
    const geometry = geometryTag
      ? {
          tag: (geometryTag[2] === "ellipse" || geometryTag[2] === "circle" ? "ellipse" : "rect") as "rect" | "ellipse",
          fill: attr(geometryTag[1], "fill") ?? "#ffffff",
          stroke: attr(geometryTag[1], "stroke") ?? "#000000",
          stroke_width: num(attr(geometryTag[1], "stroke-width"), 0),
        }
      : null;

    const table = raw.table as Record<string, unknown> | undefined;
    shapes.push({
      id: String(raw.id ?? ""),
      name: String(raw.name ?? ""),
      shape_text: String(raw.shape_text ?? "").trim(),
      x: num(raw.x),
      y: num(raw.y),
      width: num(raw.width),
      height: num(raw.height),
      rotate_angle: num(raw.rotate_angle),
      z_index: num(raw.z_index),
      seatable: raw.seatable === true,
      width_without_chairs: raw.width_without_chairs == null ? null : num(raw.width_without_chairs),
      height_without_chairs: raw.height_without_chairs == null ? null : num(raw.height_without_chairs),
      table: table
        ? {
            num: num(table.num),
            seats_count: num(table.seats_count),
            seated_total_guests_count: num(table.seated_total_guests_count),
            seated_optioned_guests_count: num(table.seated_optioned_guests_count),
          }
        : null,
      image_model_id: imageId ? Number(imageId[1]) : null,
      geometry,
      text_color: attr(body, "data-text_color"),
    });
  });
  return { shapes, background_url: parseBackground(html), patterns: parsePatterns(html, shapes) };
}

// Captioned shapes that are part of the hall, not a place a waiter works.
const NOT_A_STAND = ["רחבת ריקודים", "וילון"];

// Bumped whenever the way a sketch is turned into tables / stands changes, so
// the next run applies already-seen sketches again.
export const SKETCH_LOGIC_VERSION = 2;

// The table / food-stand list the staffing page works with (the same shape the
// PDF import produces): every seatable shape is a table, and any other shape
// with a caption of its own ("בשר כפול", "סלטים") is a food stand.
export function sketchDraft(sketch: ParsedSketch): SketchDraft {
  const tables = sketch.shapes
    .filter((shape) => shape.seatable && shape.table)
    .map((shape) => ({
      label: String(shape.table!.num),
      capacity: shape.table!.seats_count,
      seated: shape.table!.seated_total_guests_count,
    }))
    .sort((a, b) => Number(a.label) - Number(b.label));

  const seen = new Set<string>();
  const foodStands: { label: string }[] = [];
  for (const shape of sketch.shapes) {
    if (shape.seatable || !shape.shape_text || NOT_A_STAND.some((word) => shape.shape_text.includes(word) || shape.name.includes(word))) continue;
    if (seen.has(shape.shape_text)) continue;
    seen.add(shape.shape_text);
    foodStands.push({ label: shape.shape_text });
  }
  return { tables, foodStands };
}

export function seatedTotal(draft: SketchDraft): number {
  return draft.tables.reduce((sum, table) => sum + table.seated, 0);
}

export function sketchSummary(draft: SketchDraft): string {
  const seats = draft.tables.reduce((sum, table) => sum + table.capacity, 0);
  return `${draft.tables.length} שולחנות (${seats} מקומות), ${draft.foodStands.length} עמדות אוכל`;
}

// Pictures to embed in the drawing (as data URIs, so the SVG stands alone).
export interface SketchAssets {
  background: string | null;
  images: Map<number, string>;
  patterns: Map<number, string>;
}

type Kind = "table" | "dance" | "bar" | "dj" | "chuppah" | "stand" | "other";

function kindOf(shape: SketchShape): Kind {
  if (shape.seatable) return "table";
  if (shape.name.includes("רחבת ריקודים") || shape.shape_text.includes("רחבת ריקודים")) return "dance";
  if (shape.name.includes("DJ")) return "dj";
  if (shape.name.startsWith("חופה")) return "chuppah";
  if (shape.name.startsWith("בר")) return "bar";
  if (shape.shape_text) return "stand";
  return "other";
}

// Used only for a shape whose own picture could not be fetched.
const FALLBACK: Record<Kind, { fill: string; stroke: string }> = {
  table: { fill: "#d9c3a0", stroke: "#8a6d3b" },
  dance: { fill: "#e6edfb", stroke: "#9db0e0" },
  bar: { fill: "#fbe0d2", stroke: "#d49a7c" },
  dj: { fill: "#e5daf4", stroke: "#a58ccc" },
  chuppah: { fill: "#fff1c4", stroke: "#d6b84f" },
  stand: { fill: "#dcefdc", stroke: "#7fb585" },
  other: { fill: "#f3f3f3", stroke: "#bdbdbd" },
};

function escapeXml(value: string): string {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function round(value: number): number {
  return Math.round(value * 10) / 10;
}

function rotatedBounds(shape: SketchShape) {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const angle = (shape.rotate_angle * Math.PI) / 180;
  const cos = Math.abs(Math.cos(angle));
  const sin = Math.abs(Math.sin(angle));
  const halfW = (shape.width * cos + shape.height * sin) / 2;
  const halfH = (shape.width * sin + shape.height * cos) / 2;
  return { minX: cx - halfW, maxX: cx + halfW, minY: cy - halfH, maxY: cy + halfH };
}

// iPlan's own "seated/seats" caption: "6+2/9" when some are optioned.
function occupancyOf(table: SketchTable): string {
  const seated = table.seated_total_guests_count - table.seated_optioned_guests_count;
  const optioned = table.seated_optioned_guests_count;
  return `${seated}${optioned > 0 ? `+${optioned}` : ""}/${table.seats_count}`;
}

function captionOf(shape: SketchShape): { main: string; sub: string } {
  if (shape.seatable && shape.table) return { main: String(shape.table.num), sub: occupancyOf(shape.table) };
  return { main: shape.shape_text, sub: "" };
}

function shapeSvg(shape: SketchShape, assets: SketchAssets | null): { body: string; text: string } {
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const transform = shape.rotate_angle ? ` transform="rotate(${round(shape.rotate_angle)} ${round(cx)} ${round(cy)})"` : "";

  let body: string;
  if (shape.image_model_id !== null && assets?.images.has(shape.image_model_id)) {
    body = `<use href="#m${shape.image_model_id}" transform="translate(${round(shape.x)} ${round(shape.y)}) scale(${round(shape.width)} ${round(shape.height)})"/>`;
  } else if (shape.geometry && shape.image_model_id === null) {
    const g = shape.geometry;
    // A texture that could not be fetched falls back to a plain tint.
    const patternId = patternIdOf(g.fill);
    const fill = patternId !== null && !assets?.patterns.has(patternId) ? "#cfe3cf" : g.fill;
    body =
      g.tag === "ellipse"
        ? `<ellipse cx="${round(cx)}" cy="${round(cy)}" rx="${round(shape.width / 2)}" ry="${round(shape.height / 2)}" fill="${escapeXml(fill)}" stroke="${escapeXml(g.stroke)}" stroke-width="${g.stroke_width}"/>`
        : `<rect x="${round(shape.x)}" y="${round(shape.y)}" width="${round(shape.width)}" height="${round(shape.height)}" fill="${escapeXml(fill)}" stroke="${escapeXml(g.stroke)}" stroke-width="${g.stroke_width}"/>`;
  } else {
    // No picture available: a plain stand-in in the colours of the shape's kind.
    const kind = kindOf(shape);
    const { fill, stroke } = FALLBACK[kind];
    const round_ = shape.name.includes("עגול");
    const w = shape.width_without_chairs ?? shape.width;
    const h = shape.height_without_chairs ?? shape.height;
    body = round_
      ? `<ellipse cx="${round(cx)}" cy="${round(cy)}" rx="${round(w / 2)}" ry="${round(h / 2)}" fill="${fill}" stroke="${stroke}" stroke-width="6"/>`
      : `<rect x="${round(cx - w / 2)}" y="${round(cy - h / 2)}" width="${round(w)}" height="${round(h)}" rx="8" fill="${fill}" stroke="${stroke}" stroke-width="6"/>`;
  }

  const { main, sub } = captionOf(shape);
  let text = "";
  if (main) {
    const color = escapeXml(shape.text_color ?? "#000000");
    const tableLike = shape.seatable;
    const fit = (Math.max(shape.width, shape.height) * 0.9) / Math.max(main.length, 1) * 1.5;
    const size = Math.max(24, Math.min(tableLike ? 64 : 56, shape.height * 0.5, fit));
    const upper = sub ? cy - size * 0.28 : cy;
    text = `<text x="${round(cx)}" y="${round(upper)}" font-size="${round(size)}" text-anchor="middle" dominant-baseline="central" fill="${color}" font-weight="${tableLike ? 700 : 600}">${escapeXml(main)}</text>`;
    if (sub) {
      text += `<text x="${round(cx)}" y="${round(cy + size * 0.55)}" font-size="${round(size * 0.62)}" text-anchor="middle" dominant-baseline="central" fill="${color}">${escapeXml(sub)}</text>`;
    }
  }
  return { body: `<g${transform}>${body}</g>`, text };
}

const SKETCH_CANVAS = 7200;

export function renderSketchSvg(sketch: ParsedSketch, assets: SketchAssets | null = null): string {
  const shapes = [...sketch.shapes].sort((a, b) => a.z_index - b.z_index);
  const margin = assets?.background ? 320 : 120;
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const shape of shapes) {
    const b = rotatedBounds(shape);
    minX = Math.min(minX, b.minX);
    minY = Math.min(minY, b.minY);
    maxX = Math.max(maxX, b.maxX);
    maxY = Math.max(maxY, b.maxY);
  }
  if (!Number.isFinite(minX)) {
    minX = 0;
    minY = 0;
    maxX = 1000;
    maxY = 600;
  }
  const drawn = shapes.map((shape) => shapeSvg(shape, assets));
  const x = round(minX - margin);
  const y = round(minY - margin);
  const w = round(maxX - minX + margin * 2);
  const h = round(maxY - minY + margin * 2);

  // Each shape picture is defined once (unit-sized, stretched where it is used).
  const defs = assets
    ? [...assets.images.entries()]
        .map(([id, uri]) => `<image id="m${id}" width="1" height="1" preserveAspectRatio="none" href="${uri}"/>`)
        .join("") +
      sketch.patterns
        .filter((pattern) => assets.patterns.has(pattern.id))
        .map(
          (pattern) =>
            `<pattern id="pattern_${pattern.id}" patternUnits="userSpaceOnUse" width="${pattern.width}" height="${pattern.height}"><image x="0" y="0" width="${pattern.width}" height="${pattern.height}" href="${assets.patterns.get(pattern.id)}"/></pattern>`,
        )
        .join("")
    : "";
  const background = assets?.background
    ? `<image x="0" y="0" width="${SKETCH_CANVAS}" height="${SKETCH_CANVAS}" href="${assets.background}"/>`
    : "";

  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(w / 3)}" height="${Math.round(h / 3)}" font-family="Arial, Helvetica, sans-serif">` +
    (defs ? `<defs>${defs}</defs>` : "") +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff"/>` +
    background +
    drawn.map((part) => part.body).join("") +
    // Captions last, so a shape drawn later never covers an earlier one's label.
    drawn.map((part) => part.text).join("") +
    `</svg>`
  );
}
