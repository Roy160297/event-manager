// iPlan keeps an event's floor-plan sketch as structured data (every shape with
// its position, size and rotation; tables with number and seat count), not as a
// picture. The extension sends the sketch's print page as raw HTML; this reads
// the shapes out of it, lists the tables / food stands for the staffing page,
// and draws a simple SVG of the hall.

export interface SketchTable {
  num: number;
  seats_count: number;
  seated_total_guests_count: number;
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
}

export interface ParsedSketch {
  shapes: SketchShape[];
}

export interface SketchDraft {
  tables: { label: string; capacity: number; seated: number }[];
  foodStands: { label: string }[];
}

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

export function parseSketchHtml(html: string): ParsedSketch {
  const shapes: SketchShape[] = [];
  for (const match of html.matchAll(/data-init_model="([^"]*)"/g)) {
    let raw: Record<string, unknown>;
    try {
      raw = JSON.parse(decodeEntities(match[1]));
    } catch {
      continue;
    }
    if (typeof raw !== "object" || raw === null) continue;
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
          }
        : null,
    });
  }
  return { shapes };
}

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
    if (shape.seatable || !shape.shape_text || shape.shape_text === "רחבת ריקודים") continue;
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

const FILL: Record<Kind, { fill: string; stroke: string }> = {
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

function labelOf(shape: SketchShape, kind: Kind): string {
  if (kind === "table") return String(shape.table?.num ?? "");
  if (kind === "dance") return "רחבה";
  if (kind === "dj") return "DJ";
  if (kind === "chuppah") return shape.name === "חופה" ? "חופה" : "";
  if (kind === "bar") return "בר";
  if (kind === "stand") return shape.shape_text;
  return "";
}

function shapeSvg(shape: SketchShape): { body: string; text: string } {
  const kind = kindOf(shape);
  const { fill, stroke } = FILL[kind];
  const cx = shape.x + shape.width / 2;
  const cy = shape.y + shape.height / 2;
  const round_ = shape.name.includes("עגול");
  const transform = shape.rotate_angle ? ` transform="rotate(${round(shape.rotate_angle)} ${round(cx)} ${round(cy)})"` : "";

  const body = (w: number, h: number, f: string, s: string, opacity = 1) =>
    round_
      ? `<ellipse cx="${round(cx)}" cy="${round(cy)}" rx="${round(w / 2)}" ry="${round(h / 2)}" fill="${f}" stroke="${s}" stroke-width="6" opacity="${opacity}"/>`
      : `<rect x="${round(cx - w / 2)}" y="${round(cy - h / 2)}" width="${round(w)}" height="${round(h)}" rx="${kind === "table" ? 14 : 8}" fill="${f}" stroke="${s}" stroke-width="6" opacity="${opacity}"/>`;

  let shapes = "";
  if (kind === "table") {
    // The shape's box includes the chairs: draw that as a pale band with the
    // table itself inside it.
    const innerW = shape.width_without_chairs ?? shape.width * 0.62;
    const innerH = shape.height_without_chairs ?? shape.height * 0.62;
    shapes = body(shape.width, shape.height, "#f3ece0", "#d8cbb4") + body(innerW, innerH, fill, stroke);
  } else {
    shapes = body(shape.width, shape.height, fill, stroke);
  }

  const label = labelOf(shape, kind);
  let text = "";
  if (label) {
    const longest = Math.max(label.length, 1);
    const size = Math.max(24, Math.min(kind === "table" ? 84 : 64, shape.height * 0.5, (Math.max(shape.width, shape.height) * 0.9) / longest * 1.5));
    text = `<text x="${round(cx)}" y="${round(cy)}" font-size="${round(size)}" text-anchor="middle" dominant-baseline="central" fill="#3a2e1c" font-weight="${kind === "table" ? 700 : 600}">${escapeXml(label)}</text>`;
  }
  return { body: `<g${transform}>${shapes}</g>`, text };
}

export function renderSketchSvg(sketch: ParsedSketch): string {
  const shapes = [...sketch.shapes].sort((a, b) => a.z_index - b.z_index);
  const margin = 120;
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
  const drawn = shapes.map(shapeSvg);
  const x = round(minX - margin);
  const y = round(minY - margin);
  const w = round(maxX - minX + margin * 2);
  const h = round(maxY - minY + margin * 2);
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${x} ${y} ${w} ${h}" width="${Math.round(w / 4)}" height="${Math.round(h / 4)}" font-family="Arial, Helvetica, sans-serif">` +
    `<rect x="${x}" y="${y}" width="${w}" height="${h}" fill="#ffffff"/>` +
    // Captions last, so a shape drawn later never covers an earlier one's label.
    drawn.map((part) => part.body).join("") +
    drawn.map((part) => part.text).join("") +
    `</svg>`
  );
}
